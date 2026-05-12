import { useCallback, useMemo } from 'react'
import { useStore } from './store'
import { formatCurrency as formatCurrencyBase } from './utils'

const LOCALE_BY_CURRENCY = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', CNY: 'zh-CN',
  JPY: 'ja-JP', AUD: 'en-AU', CAD: 'en-CA',
}

// Returns a currency formatter bound to the active chapter's preferred
// currency. Use this hook in any page/component that displays monetary
// values so a chapter set to CNY/EUR/JPY/etc. doesn't end up rendering
// USD everywhere except the dashboard.
export function useFormatCurrency() {
  const { chapter } = useStore()
  const currency = chapter?.currency || 'USD'
  return useCallback((amount) => formatCurrencyBase(amount, currency), [currency])
}

// Returns just the currency symbol for the active chapter ("$", "¥",
// "€", etc.). Use for input labels and placeholders where the symbol
// is the only thing that needs to be chapter-aware.
export function useCurrencySymbol() {
  const { chapter } = useStore()
  const currency = chapter?.currency || 'USD'
  return useMemo(() => {
    const locale = LOCALE_BY_CURRENCY[currency] || 'en-US'
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value || '$'
  }, [currency])
}
