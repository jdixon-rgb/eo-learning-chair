import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

export default function TopBar() {
  const { chapter, totalEstimated, budgetRemaining } = useStore()
  const budgetPercent = ((totalEstimated / chapter.total_budget) * 100).toFixed(0)

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6">
      {/* Theme */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-eo-coral" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Theme: <span className="text-eo-blue">{chapter.president_theme}</span>
          </p>
          {chapter.president_name && (
            <p className="text-xs text-muted-foreground">President: {chapter.president_name}</p>
          )}
        </div>
      </div>

      {/* Budget Quick View */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Budget Used</p>
          <p className="text-sm font-semibold">
            {formatCurrency(totalEstimated)} / {formatCurrency(chapter.total_budget)}
            <span className={`ml-2 text-xs ${budgetRemaining < 50000 ? 'text-eo-pink' : 'text-green-600'}`}>
              ({budgetPercent}%)
            </span>
          </p>
        </div>
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetRemaining < 50000 ? 'bg-eo-pink' : budgetRemaining < 100000 ? 'bg-eo-coral' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(Number(budgetPercent), 100)}%` }}
          />
        </div>
      </div>
    </header>
  )
}
