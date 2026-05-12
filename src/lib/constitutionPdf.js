// Constitution → PDF generator (jsPDF).
// Mirrors the writer pattern used in reflectionsPdf.js — no screenshotting,
// just structured text-selectable output. Letter page, margins in mm.

import { jsPDF } from 'jspdf'

const PAGE = { width: 215.9, height: 279.4 }
const MARGIN = { top: 22, right: 20, bottom: 22, left: 20 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

const SIZES = {
  title: 20,
  subtitle: 11,
  meta: 9,
  sectionHeader: 13,
  body: 11,
  footer: 8,
}
const LINE = { tight: 4, normal: 5, loose: 7 }

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

function createWriter(doc) {
  let y = MARGIN.top

  function ensureSpace(needed) {
    if (y + needed > PAGE.height - MARGIN.bottom) {
      doc.addPage()
      y = MARGIN.top
    }
  }

  function text(str, opts = {}) {
    const { size = SIZES.body, style = 'normal', color = '#111111', indent = 0, gap = LINE.normal, align = 'left' } = opts
    if (!str && str !== 0) return
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color)
    const maxWidth = CONTENT_WIDTH - indent
    // Preserve user-authored line breaks (constitution bodies may contain
    // intentional paragraph splits) by splitting first and wrapping each.
    const paragraphs = String(str).split(/\r?\n/)
    const lineHeight = size * 0.4
    for (let p = 0; p < paragraphs.length; p++) {
      const lines = doc.splitTextToSize(paragraphs[p], maxWidth)
      for (const line of lines) {
        ensureSpace(lineHeight)
        const x = align === 'center'
          ? MARGIN.left + (CONTENT_WIDTH - doc.getTextWidth(line)) / 2
          : MARGIN.left + indent
        doc.text(line, x, y)
        y += lineHeight
      }
      // Blank line between paragraphs (but not after the last one)
      if (p < paragraphs.length - 1) y += lineHeight * 0.5
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

  function newPageIfRoomBelow(pct = 0.2) {
    const remaining = PAGE.height - MARGIN.bottom - y
    const pageHeight = PAGE.height - MARGIN.top - MARGIN.bottom
    if (remaining < pageHeight * pct) {
      doc.addPage()
      y = MARGIN.top
    }
  }

  return { text, hr, spacer, ensureSpace, newPageIfRoomBelow, get y() { return y } }
}

function statusLabel(status, versionNumber, adoptedAt) {
  const v = versionNumber != null ? `v${versionNumber}` : ''
  if (status === 'adopted') return `Adopted ${v}${adoptedAt ? ` · ${formatDate(adoptedAt)}` : ''}`
  if (status === 'proposed') return `Proposed ${v} · awaiting ratification`
  if (status === 'draft') return `Draft ${v}`
  if (status === 'archived') return `Archived ${v}`
  return v
}

// Page-numbering footer, applied after all content has been written.
function stampFooter(doc, forumName) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(SIZES.footer)
    doc.setTextColor('#888888')
    const left = forumName || ''
    const right = `Page ${i} of ${total}`
    doc.text(left, MARGIN.left, PAGE.height - 8)
    doc.text(right, PAGE.width - MARGIN.right - doc.getTextWidth(right), PAGE.height - 8)
  }
}

function safeFilename(forumName, version) {
  const slug = (forumName || 'forum').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const v = version?.version_number != null ? `v${version.version_number}` : 'draft'
  const status = version?.status || 'draft'
  return `${slug}-constitution-${v}-${status}.pdf`
}

export function downloadConstitutionPdf({ version, forumName }) {
  if (!version) return
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const w = createWriter(doc)

  // Header block
  w.text(forumName || 'Forum', { size: SIZES.subtitle, color: '#666666', gap: LINE.tight, align: 'center' })
  w.text(version.title || 'Forum Constitution', { size: SIZES.title, style: 'bold', color: '#111111', gap: LINE.tight, align: 'center' })
  w.text(statusLabel(version.status, version.version_number, version.adopted_at), {
    size: SIZES.meta, color: '#888888', gap: LINE.loose, align: 'center',
  })
  w.hr()
  w.spacer(2)

  // Preamble
  if ((version.preamble || '').trim()) {
    w.text(version.preamble, { size: SIZES.body, style: 'italic', color: '#333333', gap: LINE.loose })
  }

  // Sections
  const sections = Array.isArray(version.sections) ? version.sections : []
  sections.forEach((section, idx) => {
    w.newPageIfRoomBelow(0.18)
    const heading = section.heading || 'Untitled section'
    w.text(`${idx + 1}. ${heading}`, {
      size: SIZES.sectionHeader, style: 'bold', color: '#111111', gap: LINE.tight,
    })
    if ((section.body || '').trim()) {
      w.text(section.body, { size: SIZES.body, color: '#222222', gap: LINE.normal })
    }
    w.spacer(2)
  })

  if (sections.length === 0 && !(version.preamble || '').trim()) {
    w.text('This constitution has no content yet.', { color: '#888888', style: 'italic' })
  }

  stampFooter(doc, forumName)
  doc.save(safeFilename(forumName, version))
}
