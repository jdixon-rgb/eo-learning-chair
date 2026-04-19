// Chapter-scoped data backup as multi-sheet XLSX workbooks.
//
// Built to fulfill the Beta Terms promise that users can download their
// own data at any time (see migration 051). Each chair surface gets one
// "Download Backup" button that produces a workbook of everything they
// own — primary table on sheet 1, related child tables on subsequent
// sheets.
//
// xlsx is lazy-loaded so the ~430 KB library only hits the network when
// a user actually clicks Download, matching the existing convention in
// MemberManagementPage.

const loadXLSX = () => import('xlsx')

// Sanitize a chapter name for use in a filename.
function fileSafe(name) {
  return (name || 'Chapter').replace(/[^a-zA-Z0-9]+/g, '')
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Convert any value to a cell-safe primitive. Arrays + objects get
// JSON-stringified so jsonb columns survive the trip.
function cellize(v) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  if (v instanceof Date) return v.toISOString()
  return JSON.stringify(v)
}

function rowsToSheet(XLSX, rows) {
  if (!rows || rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([['(no data)']])
  }
  const flat = rows.map(r => {
    const out = {}
    for (const [k, v] of Object.entries(r)) out[k] = cellize(v)
    return out
  })
  return XLSX.utils.json_to_sheet(flat)
}

function triggerDownload(XLSX, workbook, filename) {
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' })
}

/**
 * Speakers backup — Library (cross-FY persistent) + Pipeline (current FY).
 * pipelineSpeakers is the joined view (library fields + pipeline metadata).
 */
export async function downloadSpeakersBackup({ chapterName, speakers, pipelineSpeakers, fiscalYear }) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, speakers), 'Library')
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, pipelineSpeakers), `Pipeline ${fiscalYear || ''}`.trim())
  triggerDownload(XLSX, wb, `${fileSafe(chapterName)}-Speakers-Backup-${todayIso()}.xlsx`)
}

/**
 * Events backup — Events table + Budget Items + Contract Checklists +
 * Event Documents metadata. All scoped to the active fiscal year by
 * what the store has loaded.
 */
export async function downloadEventsBackup({ chapterName, events, budgetItems, contractChecklists, eventDocuments, fiscalYear }) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, events), 'Events')
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, budgetItems), 'Budget Items')

  // Contract checklists store an `items` jsonb array — explode to one row
  // per (event, checklist item) so the audit trail is grep-friendly.
  const explodedChecklists = []
  for (const cl of contractChecklists || []) {
    const items = Array.isArray(cl.items) ? cl.items : []
    if (items.length === 0) {
      explodedChecklists.push({ event_id: cl.event_id, item_label: '(empty)', completed: '', notes: '' })
      continue
    }
    for (const it of items) {
      explodedChecklists.push({
        event_id: cl.event_id,
        item_label: it.label ?? it.id ?? '',
        completed: it.completed ?? false,
        notes: it.notes ?? '',
      })
    }
  }
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, explodedChecklists), 'Contract Checklists')

  // Documents — metadata only (filenames + storage paths). Actual files
  // remain in Supabase Storage; this lets the user know what to re-upload.
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, eventDocuments || []), 'Event Documents')

  triggerDownload(XLSX, wb, `${fileSafe(chapterName)}-Events-Backup-${fiscalYear || todayIso()}.xlsx`)
}

/**
 * Venues backup — single sheet, all venues (cross-FY persistent).
 */
export async function downloadVenuesBackup({ chapterName, venues }) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, rowsToSheet(XLSX, venues), 'Venues')
  triggerDownload(XLSX, wb, `${fileSafe(chapterName)}-Venues-Backup-${todayIso()}.xlsx`)
}
