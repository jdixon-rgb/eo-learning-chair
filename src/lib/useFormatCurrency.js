import { useCallback } from 'react'
import { useStore } from './store'
import { formatCurrency as formatCurrencyBase } from './utils'

// Returns a currency formatter bound to the active chapter's preferred
// currency. Use this hook in any page/component that displays monetary
// values so a chapter set to CNY/EUR/JPY/etc. doesn't end up rendering
// USD everywhere except the dashboard.
export function useFormatCurrency() {
  const { chapter } = useStore()
  const currency = chapter?.currency || 'USD'
  return useCallback((amount) => formatCurrencyBase(amount, currency), [currency])
}
