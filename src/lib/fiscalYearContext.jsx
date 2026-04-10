import { createContext, useContext, useState, useEffect, useMemo, createElement } from 'react'
import { useChapter } from './chapter'
import { getCurrentFiscalYear, getFiscalYearOptions } from './fiscalYear'

const FiscalYearContext = createContext(null)

const STORAGE_KEY = 'eo-active-fiscal-year'

export function FiscalYearProvider({ children }) {
  const { activeChapter, isChapterReady } = useChapter()

  const fyStart = activeChapter?.fiscal_year_start ?? 8

  const currentFiscalYear = useMemo(() => getCurrentFiscalYear(fyStart), [fyStart])
  const fiscalYearOptions = useMemo(() => getFiscalYearOptions(fyStart, 3), [fyStart])

  const [activeFiscalYear, setActiveFiscalYearRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved || null
    } catch { return null }
  })

  const [isFiscalYearReady, setIsFiscalYearReady] = useState(false)

  // Validate saved value against available options; default to current FY
  useEffect(() => {
    if (!isChapterReady) return

    const saved = localStorage.getItem(STORAGE_KEY)
    const valid = saved && fiscalYearOptions.includes(saved)
    const fy = valid ? saved : currentFiscalYear

    setActiveFiscalYearRaw(fy)
    setIsFiscalYearReady(true)
  }, [isChapterReady, fiscalYearOptions, currentFiscalYear])

  const setActiveFiscalYear = (fy) => {
    setActiveFiscalYearRaw(fy)
    try {
      localStorage.setItem(STORAGE_KEY, fy)
    } catch { /* storage full */ }
  }

  const value = {
    activeFiscalYear: activeFiscalYear || currentFiscalYear,
    setActiveFiscalYear,
    fiscalYearOptions,
    currentFiscalYear,
    isFiscalYearReady,
  }

  return createElement(FiscalYearContext.Provider, { value }, children)
}

export function useFiscalYear() {
  const ctx = useContext(FiscalYearContext)
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider')
  return ctx
}
