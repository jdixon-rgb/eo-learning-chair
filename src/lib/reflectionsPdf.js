// Reflections → PDF generator (jsPDF).
// Renders a single reflection or a batch as a printable, text-selectable PDF.
// No screenshotting — we walk the template schema and write structured text.

import { jsPDF } from 'jspdf'

// Page metrics (Letter, in mm)
const PAGE = { width: 215.9, height: 279.4 }
const MARGIN = { top: 20, right: 18, bottom: 20, left: 18 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

// Font sizing
const SIZES = {
  title: 18,
  subtitle: 11,
  meta: 9,
  sectionHeader: 12,
  fieldLabel: 9,
  body: 10,
}

const LINE = { tight: 4, normal: 5, loose: 6 }

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

// Writer wraps a jsPDF doc with a moving cursor that auto-paginates.
function createWriter(doc) {
  let y = MARGIN.top

  function ensureSpace(needed) {
    if (y + needed > PAGE.height - MARGIN.bottom) {
      doc.addPage()
      y = MARGIN.top
    }
  }

  function text(str, opts = {}) {
    const { size = SIZES.body, style = 'normal', color = '#111111', indent = 0, gap = LINE.normal } = opts
    if (!str && str !== 0) return
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color)
    const maxWidth = CONTENT_WIDTH - indent
    const lines = doc.splitTextToSize(String(str), maxWidth)
    const lineHeight = size * 0.4
    for (const line of lines) {
      ensureSpace(lineHeight)
      doc.text(line, MARGIN.left + indent, y)
      y += lineHeight
    }
    y += gap
  }

  function hr() {
    ensureSpace(4)
    doc.setDrawColor('#cccccc')
    doc.setLineWidth(0.2)
    doc.line(MARGIN.left, y, MARGIN.left + CONTENT_WIDTH, y)
    y += 4
  }

  function spacer(amount = 4) {
    y += amount
  }

  function newPageIfRoomBelow(pct = 0.25) {
    // Start a new page if less than `pct` of the page remains — avoids orphan headers.
    const remaining = PAGE.height - MARGIN.bottom - y
    const pageHeight = PAGE.height - MARGIN.top - MARGIN.bottom
    if (remaining < pageHeight * pct) {
      doc.addPage()
      y = MARGIN.top
    }
  }

  function addPage() {
    doc.addPage()
    y = MARGIN.top
  }

  return { text, hr, spacer, ensureSpace, newPageIfRoomBelow, addPage, get y() { return y } }
}

// Render the body of a single field given its value.
function renderFieldValue(w, field, value) {
  if (field.type === 'feelings_pills') {
    const list = Array.isArray(value) ? value : []
    if (list.length === 0) {
      w.text('—', { color: '#999999', gap: LINE.normal })
      return
    }
    w.text(list.join(', '), { gap: LINE.normal })
    return
  }
  const v = (value ?? '').toString().trim()
  if (!v) {
    w.text('—', { color: '#999999', gap: LINE.normal })
    return
  }
  w.text(v, { gap: LINE.normal })
}

function renderField(w, field, value) {
  w.text(field.label || field.key, { size: SIZES.fieldLabel, style: 'bold', color: '#555555', gap: LINE.tight })
  if (field.help) {
    w.text(field.help, { size: SIZES.meta - 1, color: '#888888', gap: LINE.tight })
  }
  renderFieldValue(w, field, value)
  w.spacer(2)
}

function renderGridRow(w, row, columns, content) {
  w.text(row.label || row.key, { size: SIZES.sectionHeader, style: 'bold', color: '#222222', gap: LINE.tight })
  for (const col of columns) {
    const cellVal = content?.[row.key]?.[col.key]
    const indented = {
      text: (str, opts = {}) => w.text(str, { ...opts, indent: (opts.indent || 0) + 4 }),
    }
    indented.text(col.label || col.key, { size: SIZES.fieldLabel, style: 'bold', color: '#555555', gap: LINE.tight })
    if (col.help) {
      indented.text(col.help, { size: SIZES.meta - 1, color: '#888888', gap: LINE.tight })
    }
    // renderFieldValue uses w.text directly — respect indent by wrapping
    if (col.type === 'feelings_pills') {
      const list = Array.isArray(cellVal) ? cellVal : []
      indented.text(list.length ? list.join(', ') : '—', { color: list.length ? '#111111' : '#999999' })
    } else {
      const v = (cellVal ?? '').toString().trim()
      indented.text(v || '—', { color: v ? '#111111' : '#999999' })
    }
    w.spacer(1)
  }
  w.spacer(3)
}

function renderReflection(w, reflection, template, memberName) {
  const headline =
    reflection.content?.headline ||
    reflection.content?.eq_challenge ||
    '(untitled reflection)'

  w.text(headline, { size: SIZES.title, style: 'bold', color: '#0f1724', gap: LINE.tight })

  const metaBits = []
  if (template?.name) metaBits.push(template.name)
  if (reflection.category) metaBits.push(reflection.category[0].toUpperCase() + reflection.category.slice(1))
  metaBits.push(formatDate(reflection.updated_at || reflection.created_at))
  w.text(metaBits.join(' · '), { size: SIZES.meta, color: '#888888', gap: LINE.normal })

  if (memberName) {
    w.text(memberName, { size: SIZES.meta, color: '#888888', gap: LINE.normal })
  }

  w.hr()
  w.spacer(2)

  // Feelings (if recorded on the root record — single templates)
  if (Array.isArray(reflection.feelings) && reflection.feelings.length > 0) {
    w.text('Feelings', { size: SIZES.fieldLabel, style: 'bold', color: '#555555', gap: LINE.tight })
    w.text(reflection.feelings.join(', '), { gap: LINE.loose })
  }

  const schema = template?.schema || { kind: 'single', fields: [] }
  const content = reflection.content || {}

  if (schema.kind === 'single') {
    for (const field of schema.fields || []) {
      // feelings_pills at root level is already rendered above — skip
      if (field.type === 'feelings_pills') continue
      renderField(w, field, content[field.key])
    }
  }

  if (schema.kind === 'grid') {
    if (schema.meps && Array.isArray(schema.meps)) {
      w.text('MEPS', { size: SIZES.sectionHeader, style: 'bold', color: '#222222', gap: LINE.tight })
      for (const m of schema.meps) {
        const v = content.meps?.[m.key]
        w.text(`${m.label}: ${v || '—'}`, { indent: 4, gap: LINE.tight })
      }
      w.spacer(3)
    }
    for (const row of schema.rows || []) {
      w.newPageIfRoomBelow(0.2)
      renderGridRow(w, row, schema.columns || [], content)
    }
    for (const footer of schema.footers || []) {
      renderField(w, footer, content[footer.key])
    }
  }
}

// ── Public API ──────────────────────────────────────────────

export function downloadReflectionPdf(reflection, template, { memberName } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const w = createWriter(doc)
  renderReflection(w, reflection, template, memberName)
  const safeTitle = (reflection.content?.headline || 'reflection')
    .toString()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'reflection'
  const date = new Date(reflection.updated_at || reflection.created_at || Date.now())
    .toISOString()
    .slice(0, 10)
  doc.save(`${safeTitle}-${date}.pdf`)
}

export function downloadAllReflectionsPdf(reflections, templates, { memberName, forumName } = {}) {
  if (!reflections || reflections.length === 0) return
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const w = createWriter(doc)

  // Cover page
  w.text('Reflections', { size: 24, style: 'bold', color: '#0f1724', gap: LINE.normal })
  const sub = [memberName, forumName].filter(Boolean).join(' · ')
  if (sub) w.text(sub, { size: SIZES.subtitle, color: '#555555', gap: LINE.tight })
  w.text(`Exported ${formatDate(new Date().toISOString())}`, { size: SIZES.meta, color: '#888888', gap: LINE.normal })
  w.text(`${reflections.length} ${reflections.length === 1 ? 'reflection' : 'reflections'}`, { size: SIZES.meta, color: '#888888', gap: LINE.loose })

  // Sort newest first for reading
  const sorted = [...reflections].sort((a, b) => {
    const ad = new Date(a.updated_at || a.created_at || 0).getTime()
    const bd = new Date(b.updated_at || b.created_at || 0).getTime()
    return bd - ad
  })

  sorted.forEach((r, idx) => {
    if (idx > 0) w.addPage()
    const tmpl = templates.find(t => t.slug === r.template_slug)
    renderReflection(w, r, tmpl, memberName)
  })

  const date = new Date().toISOString().slice(0, 10)
  const safe = (memberName || 'reflections').toString().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40)
  doc.save(`${safe}-reflections-${date}.pdf`)
}
