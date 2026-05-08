import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Activity, Megaphone } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

// Forum Health Chair stub. The role owns chapter-wide forum health:
// triages forums needing attention, broadcasts to all moderators, runs
// the moderator summit. The full dashboard (forum-health rollups,
// moderator alerts composer, summit calendar) lands in a follow-up; this
// stub keeps the role's homePath valid so role-switching doesn't crash.
export default function ForumHealthDashboard() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Forum Health Chair"
        subtitle="Chapter-wide forum health: moderator support, summit programming, alerts."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Dashboard coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
              This dashboard will surface forum-by-forum health scores, moderator
              tenure, vacancy alerts, and a composer for chapter-wide moderator
              communications. For now, use the existing Forums admin to manage
              per-forum data.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-4">
          <Link
            to="/board/forums"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Activity className="h-4 w-4" />
            Open Forums
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/forum-health/comms"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Megaphone className="h-4 w-4" />
            Moderator Comms
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
