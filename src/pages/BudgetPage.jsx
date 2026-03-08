import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { BUDGET_CATEGORIES, FISCAL_MONTHS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, AlertTriangle, ArrowRight, PieChart } from 'lucide-react'

export default function BudgetPage() {
  const navigate = useNavigate()
  const { chapter, events, budgetItems, totalEstimated, totalBudgetUsed, budgetRemaining } = useStore()

  const budgetPercent = (totalEstimated / chapter.total_budget) * 100
  const budgetHealth = budgetPercent > 90 ? 'critical' : budgetPercent > 75 ? 'warning' : 'healthy'

  // By category
  const byCategory = BUDGET_CATEGORIES.map(cat => {
    const items = budgetItems.filter(b => b.category === cat.id)
    const estimated = items.reduce((s, b) => s + (b.estimated_amount || 0), 0)
    const actual = items.reduce((s, b) => s + (b.actual_amount || 0), 0)
    return { ...cat, estimated, actual, count: items.length }
  }).filter(c => c.count > 0)

  // By event
  const byEvent = events.map(event => {
    const items = budgetItems.filter(b => b.event_id === event.id)
    const estimated = items.reduce((s, b) => s + (b.estimated_amount || 0), 0)
    const actual = items.reduce((s, b) => s + (b.actual_amount || 0), 0)
    const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
    return { ...event, estimated, actual, itemCount: items.length, month }
  }).sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99))

  // Warnings
  const warnings = []
  const eventsWithoutBudget = events.filter(e => !budgetItems.some(b => b.event_id === e.id))
  if (eventsWithoutBudget.length > 0) {
    warnings.push(`${eventsWithoutBudget.length} event(s) have no budget allocated.`)
  }
  if (budgetHealth === 'critical') {
    warnings.push(`Budget is ${budgetPercent.toFixed(0)}% allocated — only ${formatCurrency(budgetRemaining)} remaining.`)
  }
  const speakerFees = budgetItems.filter(b => b.category === 'speaker_fee').reduce((s, b) => s + (b.estimated_amount || 0), 0)
  if (speakerFees > chapter.total_budget * 0.5) {
    warnings.push(`Speaker fees are ${((speakerFees / chapter.total_budget) * 100).toFixed(0)}% of total budget. Consider negotiating or bundling.`)
  }

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-muted-foreground">Estimated</p>
            <p className="text-lg font-bold">{formatCurrency(totalEstimated)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Actual Spent</p>
            <p className="text-lg font-bold">{formatCurrency(totalBudgetUsed)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={`text-lg font-bold ${budgetRemaining < 50000 ? 'text-eo-pink' : 'text-green-600'}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4" /> By Category
          </h3>
          <div className="space-y-3">
            {byCategory.map(cat => {
              const pct = totalEstimated > 0 ? (cat.estimated / totalEstimated) * 100 : 0
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                      <span>{cat.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(cat.estimated)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: cat.color, width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {byCategory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No budget items yet.</p>
            )}
          </div>
        </div>

        {/* By Event */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> By Event
          </h3>
          <div className="space-y-2">
            {byEvent.map(event => {
              const pct = chapter.total_budget > 0 ? (event.estimated / chapter.total_budget) * 100 : 0
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {event.month && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{event.month.shortName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full bg-eo-blue rounded-full" style={{ width: `${Math.min(pct * (100 / 20), 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold">{formatCurrency(event.estimated)}</p>
                    {event.actual > 0 && (
                      <p className="text-[11px] text-muted-foreground">Actual: {formatCurrency(event.actual)}</p>
                    )}
                  </div>
                </div>
              )
            })}
            {byEvent.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No events with budgets yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
