// Vercel Serverless Function — Send Speaker Payment Package to Executive Director
//
// Lets a learning chair (or anyone with edit access to the chapter's speaker
// pipeline) email a "payment package" to a recipient — typically the chapter's
// Executive Director — containing:
//   • the signed contract PDF
//   • the W-9 PDF
//   • a summary of the negotiated payment terms in the email body, so the ED
//     does not have to open the contract to find the deposit amount, due
//     dates, etc.
//
// On success, stamps speaker_pipeline.ed_package_sent_at + ed_package_sent_to
// so the UI can show "Sent to ED on …" with a re-send option.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL                 — project URL
//   SUPABASE_ANON_KEY            — anon key (verifies caller JWT)
//   SUPABASE_SERVICE_ROLE_KEY    — service role (storage download + DB write)
//   RESEND_API_KEY               — Resend API key
//   RESEND_FROM_EMAIL            — verified sender, e.g. "OurChapter OS <noreply@ourchapteros.com>"

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const STORAGE_BUCKET = 'event-documents'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pipelineId, recipientEmail, ccEmails, note, eventId } = req.body || {}
  if (!pipelineId || typeof pipelineId !== 'string') {
    return res.status(400).json({ error: 'pipelineId is required' })
  }
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return res.status(400).json({ error: 'recipientEmail is required and must be an email' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({ error: 'Server misconfigured: Supabase env vars not set' })
  }
  if (!resendKey || !fromEmail) {
    return res.status(500).json({ error: 'Server misconfigured: RESEND_API_KEY / RESEND_FROM_EMAIL not set' })
  }

  // Verify caller JWT
  const authHeader = req.headers.authorization || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return res.status(401).json({ error: 'Missing Authorization header' })

  const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  const userId = userData.user.id

  const supabaseService = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Pull caller profile to determine which chapter they belong to.
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('chapter_id, role')
    .eq('id', userId)
    .single()
  if (!profile?.chapter_id) {
    return res.status(403).json({ error: 'Caller has no chapter assignment' })
  }

  // Load the pipeline row and join the speaker + chapter for context.
  const { data: pipeline, error: pipelineErr } = await supabaseService
    .from('speaker_pipeline')
    .select('id, chapter_id, speaker_id, fiscal_year, fee_actual, fee_estimated, contract_storage_path, contract_file_name, w9_storage_path, w9_file_name, deposit_amount, deposit_due_date, final_payment_amount, final_payment_due_date, payment_terms_notes')
    .eq('id', pipelineId)
    .single()
  if (pipelineErr || !pipeline) {
    return res.status(404).json({ error: 'Pipeline entry not found' })
  }
  // Same-chapter authorization. Super_admin may cross chapters.
  if (pipeline.chapter_id !== profile.chapter_id && profile.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: pipeline belongs to a different chapter' })
  }

  const [{ data: speaker }, { data: chapter }] = await Promise.all([
    supabaseService.from('speakers').select('id, name, topic, contact_email, agency_name').eq('id', pipeline.speaker_id).single(),
    supabaseService.from('chapters').select('id, name').eq('id', pipeline.chapter_id).single(),
  ])
  if (!speaker || !chapter) {
    return res.status(404).json({ error: 'Speaker or chapter not found' })
  }

  let event = null
  if (eventId && typeof eventId === 'string') {
    const { data: ev } = await supabaseService
      .from('events')
      .select('id, name, event_date')
      .eq('id', eventId)
      .single()
    event = ev || null
  }

  // Download attachments (contract + W-9) from storage as bytes.
  const attachments = []
  for (const [path, name, label] of [
    [pipeline.contract_storage_path, pipeline.contract_file_name, 'contract'],
    [pipeline.w9_storage_path, pipeline.w9_file_name, 'w9'],
  ]) {
    if (!path) continue
    const { data: blob, error: dlErr } = await supabaseService.storage.from(STORAGE_BUCKET).download(path)
    if (dlErr || !blob) {
      console.error(`Failed to download ${label} from ${path}:`, dlErr)
      return res.status(500).json({ error: `Could not download ${label} file` })
    }
    const buffer = Buffer.from(await blob.arrayBuffer())
    attachments.push({ filename: name || `${label}.pdf`, content: buffer })
  }

  if (attachments.length === 0) {
    return res.status(400).json({ error: 'No contract or W-9 uploaded for this speaker yet.' })
  }

  // Build email content
  const subject = buildSubject(chapter.name, speaker.name, event)
  const html = buildHtml({ chapter, speaker, event, pipeline, note, sender: userData.user })
  const text = buildText({ chapter, speaker, event, pipeline, note, sender: userData.user })

  const cc = Array.isArray(ccEmails)
    ? ccEmails.filter(e => typeof e === 'string' && e.includes('@'))
    : (typeof ccEmails === 'string' && ccEmails.includes('@')) ? [ccEmails] : []

  const resend = new Resend(resendKey)
  const { data: sendData, error: sendErr } = await resend.emails.send({
    from: fromEmail,
    to: [recipientEmail.trim()],
    cc: cc.length ? cc : undefined,
    reply_to: userData.user.email || undefined,
    subject,
    html,
    text,
    attachments,
  })

  if (sendErr) {
    console.error('Resend error:', sendErr)
    return res.status(500).json({ error: sendErr.message || 'Failed to send email' })
  }

  // Audit-log the send on the pipeline row
  const sentAt = new Date().toISOString()
  await supabaseService
    .from('speaker_pipeline')
    .update({ ed_package_sent_at: sentAt, ed_package_sent_to: recipientEmail.trim(), updated_at: sentAt })
    .eq('id', pipelineId)

  return res.status(200).json({
    ok: true,
    messageId: sendData?.id || null,
    sentAt,
    sentTo: recipientEmail.trim(),
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildSubject(chapterName, speakerName, event) {
  const eventPart = event?.name ? ` — ${speakerName} (${event.name}${event.event_date ? `, ${formatDate(event.event_date)}` : ''})` : ` — ${speakerName}`
  return `[${chapterName}] Speaker payment package${eventPart}`
}

function buildHtml({ chapter, speaker, event, pipeline, note, sender }) {
  const fee = pipeline.fee_actual ?? pipeline.fee_estimated
  const rows = [
    ['Speaker', speaker.name],
    speaker.topic && ['Topic', speaker.topic],
    speaker.agency_name && ['Agency', speaker.agency_name],
    event?.name && ['Event', event.name + (event.event_date ? ` (${formatDate(event.event_date)})` : '')],
    fee && ['Total fee', formatMoney(fee)],
    pipeline.deposit_amount && ['Deposit', formatMoney(pipeline.deposit_amount) + (pipeline.deposit_due_date ? ` — due ${formatDate(pipeline.deposit_due_date)}` : '')],
    pipeline.final_payment_amount && ['Final payment', formatMoney(pipeline.final_payment_amount) + (pipeline.final_payment_due_date ? ` — due ${formatDate(pipeline.final_payment_due_date)}` : '')],
  ].filter(Boolean)

  const rowsHtml = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px;color:#111;">${escapeHtml(String(v))}</td></tr>`).join('')

  const notesHtml = pipeline.payment_terms_notes
    ? `<p style="margin:16px 0 0 0;font-size:13px;color:#444;border-left:3px solid #ddd;padding:8px 12px;background:#fafafa;"><strong>Payment notes:</strong><br>${escapeHtml(pipeline.payment_terms_notes).replace(/\n/g, '<br>')}</p>`
    : ''

  const userNoteHtml = note ? `<p style="margin:16px 0 0 0;font-size:14px;color:#111;">${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''

  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
  <h2 style="margin:0 0 4px 0;font-size:18px;">Speaker payment package — ${escapeHtml(speaker.name)}</h2>
  <p style="margin:0 0 16px 0;color:#666;font-size:13px;">${escapeHtml(chapter.name)}${event?.name ? ` · ${escapeHtml(event.name)}` : ''}</p>
  <p style="margin:0 0 16px 0;font-size:14px;">${escapeHtml(sender?.email || 'A learning chair')} has sent the contract and W-9 for the speaker below. Key payment terms are summarized here so you don't have to open the PDF.</p>
  <table style="border-collapse:collapse;margin:0 0 8px 0;">${rowsHtml}</table>
  ${notesHtml}
  ${userNoteHtml}
  <p style="margin:24px 0 0 0;font-size:12px;color:#888;">Sent via OurChapter OS · This is an internal communication; please treat as confidential.</p>
</body></html>`
}

function buildText({ chapter, speaker, event, pipeline, note, sender }) {
  const fee = pipeline.fee_actual ?? pipeline.fee_estimated
  const lines = [
    `Speaker payment package — ${speaker.name}`,
    `${chapter.name}${event?.name ? ` · ${event.name}` : ''}`,
    '',
    `${sender?.email || 'A learning chair'} has sent the contract and W-9 for the speaker below. Key payment terms are summarized here so you don't have to open the PDF.`,
    '',
    `Speaker:        ${speaker.name}`,
    speaker.topic && `Topic:          ${speaker.topic}`,
    speaker.agency_name && `Agency:         ${speaker.agency_name}`,
    event?.name && `Event:          ${event.name}${event.event_date ? ` (${formatDate(event.event_date)})` : ''}`,
    fee && `Total fee:      ${formatMoney(fee)}`,
    pipeline.deposit_amount && `Deposit:        ${formatMoney(pipeline.deposit_amount)}${pipeline.deposit_due_date ? ` — due ${formatDate(pipeline.deposit_due_date)}` : ''}`,
    pipeline.final_payment_amount && `Final payment:  ${formatMoney(pipeline.final_payment_amount)}${pipeline.final_payment_due_date ? ` — due ${formatDate(pipeline.final_payment_due_date)}` : ''}`,
  ].filter(Boolean)
  if (pipeline.payment_terms_notes) {
    lines.push('', 'Payment notes:', pipeline.payment_terms_notes)
  }
  if (note) {
    lines.push('', note)
  }
  lines.push('', '— Sent via OurChapter OS')
  return lines.join('\n')
}

function formatMoney(n) {
  if (typeof n !== 'number') return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s) {
  if (!s) return ''
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return s }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
