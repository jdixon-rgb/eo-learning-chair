import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { Menu, User } from 'lucide-react'
import eoCirclesBlue from '@/assets/eo-circles-blue.png'

export default function TopBar({ onMenuToggle }) {
  const { chapter, totalEstimated, budgetRemaining } = useStore()
  const { profile } = useAuth()
  const budgetPercent = ((totalEstimated / chapter.total_budget) * 100).toFixed(0)

  return (
    <header className="h-14 md:h-16 border-b border-border bg-white flex items-center justify-between px-4 md:px-6">
      {/* Left: Hamburger (mobile) + Theme */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-foreground p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={eoCirclesBlue} alt="EO" className="h-5 w-5 hidden sm:block" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            <span className="hidden sm:inline">Theme: </span>
            <span className="text-eo-blue">{chapter.president_theme}</span>
          </p>
          {chapter.president_name && (
            <p className="text-xs text-muted-foreground hidden sm:block">President: {chapter.president_name}</p>
          )}
        </div>
      </div>

      {/* Right: Budget Quick View */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground hidden sm:block">Budget Used</p>
          <p className="text-xs sm:text-sm font-semibold">
            <span className="hidden sm:inline">{formatCurrency(totalEstimated)} / </span>
            <span className="sm:hidden">{formatCurrency(budgetRemaining)} left</span>
            <span className="hidden sm:inline">{formatCurrency(chapter.total_budget)}</span>
            <span className={`ml-1 sm:ml-2 text-xs ${budgetRemaining < 50000 ? 'text-eo-pink' : 'text-green-600'}`}>
              ({budgetPercent}%)
            </span>
          </p>
        </div>
        <div className="w-16 sm:w-24 h-2 bg-secondary rounded-full overflow-hidden">
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
