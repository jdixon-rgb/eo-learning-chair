import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { BUDGET_CATEGORIES, FISCAL_MONTHS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DollarSign, AlertTriangle } from 'lucide-react'

// ── Inline editable cell ──────────────────────────────────────────────
function EditableCell({ value, onChange, warn, contracted }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEditing = useCallback(() => {
    setDraft(value || 0)
    setEditing(true)
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed !== (value || 0)) {
      onChange(parsed)
    }
  }, [draft, value, onChange])

  const cancel = useCallback(() => {
    setEditing(false)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }, [commit, cancel])

  if (editing) {
    return (
      <input
        type="number"
        className="w-full h-full px-2 py-1 text-right text-sm bg-white border border-eo-blue rounded focus:outline-none focus:ring-1 focus:ring-eo-blue"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    )
  }

  return (
    <button
      type="button"
      className={`w-full h-full px-2 py-1 text-right text-sm cursor-pointer hover:bg-accent/40 rounded transition-colors ${
        warn ? 'bg-red-50 text-eo-pink font-semibold' : contracted ? 'text-green-600 font-semibold' : ''
      }`}
      onClick={startEditing}
    >
      {value ? formatCurrency(value) : '\u2014'}
    </button>
  )
}

// ── View field options ────────────────────────────────────────────────
const VIEW_OPTIONS = [
  { key: 'budget_amount', label: 'Budget' },
  { key: 'contracted_amount', label: 'Contracted' },
  { key: 'actual_amount', label: 'Actual' },
]

// ── BudgetPage ────────────────────────────────────────────────────────
export default function BudgetPage() {
  const navigate = useNavigate()
  const {
    chapter, events, speakers, budgetItems,
    totalBudgeted, totalContracted, totalActualSpent, budgetRemaining,
    upsertBudgetItem,
  } = useStore()

  const [activeField, setActiveField] = useState('budget_amount')

  // Budget health
  const budgetPercent = chapter.total_budget > 0
    ? (totalBudgeted / chapter.total_budget) * 100
    : 0
  const budgetHealth = budgetPercent > 90 ? 'critical' : budgetPercent > 75 ? 'warning' : 'healthy'

  // Events sorted by fiscal month
  const sortedEvents = [...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99))

  // Helper: get item value for a given event + category + field
  const getCellValue = useCallback((eventId, categoryId) => {
    const item = budgetItems.find(b => b.event_id === eventId && b.category === categoryId)
    return item ? (item[activeField] || 0) : 0
  }, [budgetItems, activeField])

  // Helper: get budget_amount for warn comparison (contracted > budget)
  const getBudgetValue = useCallback((eventId, categoryId) => {
    const item = budgetItems.find(b => b.event_id === eventId && b.category === categoryId)
    return item ? (item.budget_amount || 0) : 0
  }, [budgetItems])

  // Helper: check if item has a contracted amount (for green styling)
  const hasContracted = useCallback((eventId, categoryId) => {
    const item = budgetItems.find(b => b.event_id === eventId && b.category === categoryId)
    return item ? (item.contracted_amount || 0) > 0 : false
  }, [budgetItems])

  // Row total for an event
  const getRowTotal = useCallback((eventId) => {
    return BUDGET_CATEGORIES.reduce((sum, cat) => sum + getCellValue(eventId, cat.id), 0)
  }, [getCellValue])

  // Column total for a category
  const getColTotal = useCallback((categoryId) => {
    return sortedEvents.reduce((sum, event) => sum + getCellValue(event.id, categoryId), 0)
  }, [sortedEvents, getCellValue])

  // Grand total across all cells
  const grandTotal = sortedEvents.reduce((sum, event) => sum + getRowTotal(event.id), 0)

  // Summary values based on active field
  const summaryTotal = activeField === 'budget_amount' ? totalBudgeted
    : activeField === 'contracted_amount' ? totalContracted
    : totalActualSpent

  // Unallocated = total_budget - totalBudgeted (always based on budget_amount)
  const unallocated = chapter.total_budget - totalBudgeted

  // Warnings
  const warnings = []
  const eventsWithoutBudget = events.filter(e => !budgetItems.some(b => b.event_id === e.id))
  if (eventsWithoutBudget.length > 0) {
    warnings.push(`${eventsWithoutBudget.length} event(s) have no budget items.`)
  }
  if (budgetHealth === 'critical') {
    warnings.push(`Budget is ${budgetPercent.toFixed(0)}% allocated — only ${formatCurrency(budgetRemaining)} remaining.`)
  }
  if (totalBudgeted > chapter.total_budget) {
    warnings.push(`Over-allocated by ${formatCurrency(totalBudgeted - chapter.total_budget)}. Total budgeted exceeds the ${formatCurrency(chapter.total_budget)} budget.`)
  }

  // Speaker lookup
  const speakerName = useCallback((speakerId) => {
    if (!speakerId) return '\u2014'
    const s = speakers.find(sp => sp.id === speakerId)
    return s ? s.name : '\u2014'
  }, [speakers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatCurrency(chapter.total_budget)} total budget &middot; FY 2026–2027
        </p>
      </div>

      {/* Budget Health Bar */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Budget Health</h3>
          <Badge variant={budgetHealth === 'critical' ? 'destructive' : budgetHealth === 'warning' ? 'coral' : 'success'}>
            {budgetHealth === 'critical' ? 'Critical' : budgetHealth === 'warning' ? 'Warning' : 'Healthy'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1">
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetHealth === 'critical' ? 'bg-eo-pink' : budgetHealth === 'warning' ? 'bg-eo-coral' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold w-14 text-right">{budgetPercent.toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Budgeted</p>
            <p className="text-lg font-bold">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unallocated</p>
            <p className={`text-lg font-bold ${unallocated < 0 ? 'text-eo-pink' : 'text-green-600'}`}>
              {formatCurrency(unallocated)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={`text-lg font-bold ${budgetRemaining < 0 ? 'text-eo-pink' : 'text-green-600'}`}>
              {formatCurrency(budgetRemaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-eo-coral/30 bg-orange-50 p-4 space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-eo-coral shrink-0 mt-0.5" />
              <span className="text-eo-navy">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* View Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.key}
            type="button"
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeField === opt.key
                ? 'bg-eo-blue text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setActiveField(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Spreadsheet Grid */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wide border-b w-16">Month</th>
              <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wide border-b min-w-[160px]">Event</th>
              <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wide border-b min-w-[120px]">Speaker</th>
              {BUDGET_CATEGORIES.map(cat => (
                <th
                  key={cat.id}
                  className="text-right px-2 py-2.5 font-semibold text-xs uppercase tracking-wide border-b min-w-[100px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.label}
                  </div>
                </th>
              ))}
              <th className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wide border-b min-w-[100px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map(event => {
              const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
              const rowTotal = getRowTotal(event.id)
              return (
                <tr key={event.id} className="hover:bg-accent/20 border-b border-border/50">
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {month ? month.shortName : '\u2014'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-eo-blue hover:underline font-medium text-left"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      {event.title}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">
                    {speakerName(event.speaker_id)}
                  </td>
                  {BUDGET_CATEGORIES.map(cat => {
                    const cellValue = getCellValue(event.id, cat.id)
                    const warn = activeField === 'contracted_amount'
                      && cellValue > getBudgetValue(event.id, cat.id)
                      && cellValue > 0
                    return (
                      <td key={cat.id} className="px-0 py-0">
                        <EditableCell
                          value={cellValue}
                          onChange={(val) => upsertBudgetItem(event.id, cat.id, activeField, val)}
                          warn={warn}
                          contracted={activeField !== 'contracted_amount' && hasContracted(event.id, cat.id)}
                        />
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-semibold">
                    {rowTotal ? formatCurrency(rowTotal) : '\u2014'}
                  </td>
                </tr>
              )
            })}
            {sortedEvents.length === 0 && (
              <tr>
                <td colSpan={3 + BUDGET_CATEGORIES.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                  No events yet. Add events to start budgeting.
                </td>
              </tr>
            )}
          </tbody>
          {sortedEvents.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 font-semibold border-t">
                <td className="px-3 py-2.5" colSpan={3}>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    Totals
                  </div>
                </td>
                {BUDGET_CATEGORIES.map(cat => (
                  <td key={cat.id} className="px-2 py-2.5 text-right">
                    {getColTotal(cat.id) ? formatCurrency(getColTotal(cat.id)) : '\u2014'}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right">
                  {grandTotal ? formatCurrency(grandTotal) : '\u2014'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
