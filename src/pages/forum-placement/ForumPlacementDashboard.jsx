import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, UserPlus, Users2 } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

// Forum Placement Chair stub. The role owns the new-member pipeline:
// triages member referrals (from the Member-section "Refer a member"
// flow), tracks where each prospective member is in onboarding, and
// places them into a forum once approved. Full dashboard (referral
// inbox, placement queue, capacity-by-forum view) lands in a follow-up.
export default function ForumPlacementDashboard() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Forum Placement Chair"
        subtitle="New-member pipeline: referrals from members, placement into forums."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Dashboard coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
              This dashboard will surface incoming member referrals from the
              membership, forum capacity by chapter forum, and a placement queue
              of approved prospects awaiting a slot. For now, the Forums admin
              gives you per-forum rosters.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-4">
          <Link
            to="/forum-placement/leads"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <UserPlus className="h-4 w-4" />
            Member Leads
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/board/forums"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Users2 className="h-4 w-4" />
            Open Forums
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
