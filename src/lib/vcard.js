// vCard 3.0 export — used to "Save to Contacts" from member listings.
//
// On iOS / Android, opening a .vcf hands the contact(s) to the native
// address book. Once saved there, WhatsApp / Messages / Mail / Gmail
// all pick them up automatically because they read the system contacts.
//
// We emit 3.0 (not 4.0) because it's the format iOS Contacts and
// Google Contacts both import most reliably. CRLF line endings are
// required by RFC 2426.

const CRLF = '\r\n'

// vCard escaping per RFC 2426 §4: backslash, comma, semicolon, and
// newline are the special characters inside a value.
function vEscape(value) {
  if (value == null) return ''
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// chapter_members.phone is inconsistent NANP — some rows are 10-digit,
// some are 11-digit with a leading 1, some have formatting. Normalize
// to E.164 so WhatsApp matches it against the phone's address book.
function normalizePhone(raw) {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  if (trimmed.startsWith('+')) {
    // Already international; just strip formatting.
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits ? `+${digits}` : ''
  }
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // Unknown shape — return as-is with a + so most clients still treat
  // it as international rather than a local extension.
  return `+${digits}`
}

// Build one VCARD block (no BEGIN/END handling outside — returned
// string is a complete, valid card terminated with CRLF).
//
// `member` shape is a chapter_members row: first_name, last_name,
// email, phone, company, notes. We also accept a precomputed `name`
// for the rare row missing first_name/last_name split.
export function buildVCard(member, { chapterLabel } = {}) {
  if (!member) return ''
  const first = (member.first_name || '').trim()
  const last = (member.last_name || '').trim()
  const fallbackName = (member.name || '').trim()
  // FN is required; fall back to the combined `name` field if the
  // first/last split is empty.
  const fn = first || last
    ? `${first} ${last}`.trim()
    : fallbackName || 'Unknown'
  // N is structured: LastName;FirstName;Middle;Prefix;Suffix
  const n = first || last
    ? `${vEscape(last)};${vEscape(first)};;;`
    : `${vEscape(fallbackName)};;;;`

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vEscape(fn)}`,
    `N:${n}`,
  ]
  if (member.company) lines.push(`ORG:${vEscape(member.company)}`)
  if (member.industry) lines.push(`TITLE:${vEscape(member.industry)}`)
  const phone = normalizePhone(member.phone)
  if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${phone}`)
  if (member.email) lines.push(`EMAIL;TYPE=INTERNET:${vEscape(member.email)}`)
  // CATEGORIES makes Apple/Google Contacts group these together —
  // e.g. "EO Arizona" — so members can find/export the EO subset later.
  if (chapterLabel) lines.push(`CATEGORIES:${vEscape(chapterLabel)}`)
  if (member.notes) lines.push(`NOTE:${vEscape(member.notes)}`)
  lines.push('END:VCARD')
  return lines.join(CRLF) + CRLF
}

// Concatenate multiple cards into a single .vcf. iOS Contacts and
// Google Contacts both accept a bundle and import them in one
// confirmation dialog — the whole point of the bulk action.
export function buildVCardBundle(members, opts) {
  return (members || [])
    .map(m => buildVCard(m, opts))
    .filter(Boolean)
    .join('')
}

// Browser-side download trigger. Creates a Blob URL, clicks an anchor,
// revokes the URL on next tick. Works in iOS Safari, Android Chrome,
// and desktop browsers.
export function downloadVCard(content, filename) {
  if (!content) return
  const safeName = (filename || 'contacts').replace(/[^a-z0-9._-]+/gi, '_')
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName.endsWith('.vcf') ? safeName : `${safeName}.vcf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Convenience: save one member to contacts.
export function saveMemberToContacts(member, opts) {
  const card = buildVCard(member, opts)
  if (!card) return
  const fname = ((member.first_name || '') + '_' + (member.last_name || '')).trim() || member.name || 'contact'
  downloadVCard(card, fname)
}

// Convenience: save many members to a single .vcf bundle.
export function saveMembersToContacts(members, { filename, ...opts } = {}) {
  const bundle = buildVCardBundle(members, opts)
  if (!bundle) return
  downloadVCard(bundle, filename || 'members')
}
