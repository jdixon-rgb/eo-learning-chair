import { Sparkles } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

// Stub for the Forum Placement Chair → Member Leads surface. Surfaces
// prospective-member referrals submitted by members through the
// Member-section "Refer a member" flow. The actual referrals data model
// + member-side submission UI ship in a follow-up.
export default function MemberLeadsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Member Leads"
        subtitle="Prospective-member referrals submitted by chapter members."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
              Lead inbox arrives with the member-referral feature. You'll see
              who referred whom, contact details, why the referrer thinks
              they're a fit, and the current outreach status for each lead.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
