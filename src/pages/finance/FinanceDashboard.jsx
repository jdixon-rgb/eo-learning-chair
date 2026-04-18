import { Link } from 'react-router-dom'
import { DollarSign, Sparkles, ArrowRight } from 'lucide-react'

// Finance Chair stub. The role currently has no dedicated dashboard —
// the chair's primary surface is the Chapter Budget page. This stub
// keeps the role's homePath valid so role-switching doesn't crash, and
// signals what's planned.
export default function FinanceDashboard() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Finance Chair
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-FY chapter budget oversight, allocation across chairs, variance reporting.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Dashboard coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
              The Finance Chair dashboard will surface chapter-wide budget health, per-chair
              allocations, contracted vs. actual spend, and FY-over-FY variance. For now, head
              to the chapter budget surface to manage allocations.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <Link
            to="/budget"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Open Budget
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
