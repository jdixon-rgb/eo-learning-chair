/**
 * Fiscal year utilities for EO chapters.
 * EO fiscal year runs Aug 1 – Jul 31 (fiscal_year_start = 8).
 * FY string format: "2025-2026" (start year – end year).
 */

/**
 * Get the current fiscal year string based on today's date and the chapter's FY start month.
 * @param {number} fyStart - Calendar month the FY starts (1-12, default 8 = August)
 * @returns {string} e.g. "2025-2026"
 */
export function getCurrentFiscalYear(fyStart = 8) {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  const startYear = month >= fyStart ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

/**
 * Generate an array of fiscal year option strings.
 * Returns [current, next, +2] by default.
 * @param {number} fyStart - Calendar month the FY starts (1-12, default 8)
 * @param {number} count - Number of fiscal years to return (default 3)
 * @returns {string[]} e.g. ["2025-2026", "2026-2027", "2027-2028"]
 */
export function getFiscalYearOptions(fyStart = 8, count = 3) {
  const current = getCurrentFiscalYear(fyStart)
  const startYear = parseInt(current.split('-')[0], 10)
  return Array.from({ length: count }, (_, i) => `${startYear + i}-${startYear + i + 1}`)
}

/**
 * Format a fiscal year string for display.
 * @param {string} fy - e.g. "2025-2026"
 * @returns {string} e.g. "FY 2025–2026"
 */
export function formatFiscalYear(fy) {
  if (!fy) return ''
  return `FY ${fy.replace('-', '\u2013')}`
}

/**
 * Parse a fiscal year string into start and end years.
 * @param {string} fy - e.g. "2025-2026"
 * @returns {{ startYear: number, endYear: number }}
 */
export function parseFiscalYear(fy) {
  const [s, e] = (fy || '').split('-').map(Number)
  return { startYear: s, endYear: e }
}

/**
 * Shift a fiscal year string by a number of years.
 * @param {string} fy - e.g. "2026-2027"
 * @param {number} delta - +1 = next FY, -1 = prior FY
 * @returns {string} e.g. shiftFiscalYear("2026-2027", -1) === "2025-2026"
 */
export function shiftFiscalYear(fy, delta) {
  const { startYear, endYear } = parseFiscalYear(fy)
  if (!startYear || !endYear) return fy
  return `${startYear + delta}-${endYear + delta}`
}
