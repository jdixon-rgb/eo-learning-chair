import { useLocation } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { APP_NAME } from '@/lib/appBranding'
import { Menu, Palette, Shield } from 'lucide-react'

export default function TopBar({ onMenuToggle }) {
  const { chapter } = useStore()
  const { activePresidentTheme, activePresidentName, presidentElectTheme, presidentElectName, totalChairAllocated } = useBoardStore()
  const { isSuperAdmin, isImpersonating } = useAuth()
  const location = useLocation()

  // On the Super Admin platform surface (super-admin not impersonating,
  // viewing /super-admin/* routes) the chapter-scoped theme + budget
  // aren't meaningful — render a platform header instead.
  const isPlatformSurface =
    isSuperAdmin && !isImpersonating && location.pathname.startsWith('/super-admin')

  if (isPlatformSurface) {
    return (
      <header className="h-14 md:h-16 border-b border-border bg-white flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-foreground p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold tracking-tight">
            <span className="text-primary">Our</span>Chapter OS
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-warm bg-warm/10 px-2 py-1 rounded">
          <Shield className="h-3 w-3" />
          SUPER ADMIN
        </div>
      </header>
    )
  }

  // Default chapter-context header (theme + budget).
  // Prefer President Elect (incoming) since this tool plans the next FY
  const theme = presidentElectTheme || activePresidentTheme || chapter.president_theme || ''
  const presidentName = presidentElectName || activePresidentName || chapter.president_name || ''
  const chapterBudget = chapter.total_budget || 0
  const budgetUsed = totalChairAllocated
  const budgetPercent = chapterBudget > 0 ? ((budgetUsed / chapterBudget) * 100).toFixed(0) : 0
  const remaining = chapterBudget - budgetUsed
  const currency = chapter?.currency || 'USD'

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
        <Palette className="h-5 w-5 text-primary hidden sm:block" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            <span className="hidden sm:inline">Theme: </span>
            <span className="text-primary">{theme}</span>
          </p>
          {presidentName && (
            <p className="text-xs text-muted-foreground hidden sm:block">President: {presidentName}</p>
          )}
        </div>
      </div>

      {/* Right: Budget Quick View */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground hidden sm:block">Budget Used</p>
          <p className="text-xs sm:text-sm font-semibold">
            <span className="hidden sm:inline">{formatCurrency(budgetUsed, currency)} / </span>
            <span className="sm:hidden">{formatCurrency(remaining, currency)} left</span>
            <span className="hidden sm:inline">{formatCurrency(chapterBudget, currency)}</span>
            <span className={`ml-1 sm:ml-2 text-xs ${remaining < 50000 ? 'text-destructive' : 'text-green-600'}`}>
              ({budgetPercent}%)
            </span>
          </p>
        </div>
        <div className="w-16 sm:w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              remaining < 50000 ? 'bg-destructive' : remaining < 100000 ? 'bg-warm' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(Number(budgetPercent), 100)}%` }}
          />
        </div>
      </div>
    </header>
  )
}
