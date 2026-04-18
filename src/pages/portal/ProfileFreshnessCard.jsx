import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '@/lib/boardStore'
import { UserCircle, Check, ChevronRight } from 'lucide-react'

// Quarterly ping: "has anything changed in your profile?"
// Shows when the member has no check-in in the last 90 days.
// One-tap "All good", or "Something changed" → free-text note that
// queues a change_requested row for the admin team to action.
export default function ProfileFreshnessCard({ currentMember }) {
  const { submitProfileCheckin, profileIsStale, latestCheckinForMember } = useBoardStore()
  const navigate = useNavigate()
  const [justSubmitted, setJustSubmitted] = useState(null) // null | 'no_change' | 'change_requested'
  const [submitting, setSubmitting] = useState(false)

  if (!currentMember) return null

  // Only render if profile is stale (no check-in in last 90 days)
  const stale = profileIsStale(currentMember.id)
  if (!stale && !justSubmitted) return null

  const latest = latestCheckinForMember(currentMember.id)

  const handleAllGood = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submitProfileCheckin({ memberId: currentMember.id, kind: 'no_change' })
      setJustSubmitted('no_change')
    } finally {
      setSubmitting(false)
    }
  }

  // "Something changed" sends the user to their profile page so they
  // can edit directly. We still log a change_requested check-in so
  // the chapter team has a paper trail of who self-updated and when.
  const handleSomethingChanged = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submitProfileCheckin({
        memberId: currentMember.id,
        kind: 'change_requested',
        note: 'Member opened profile to self-edit',
      })
    } finally {
      setSubmitting(false)
      navigate('/portal/profile')
    }
  }

  // Post-submit confirmation states
  if (justSubmitted === 'no_change') {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-sm text-foreground/90">
            Thanks — we&apos;ll check back in a few months.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-warm/30 bg-warm/10 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-warm/20 flex items-center justify-center shrink-0 mt-0.5">
          <UserCircle className="h-4 w-4 text-warm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-warm font-semibold mb-1">Profile check-in</p>
          <p className="text-base text-foreground font-medium">Has anything changed in your world since we last checked?</p>
          <p className="text-xs text-muted-foreground mt-1">
            New company, role, partner, kids, address, interests — anything we should know.
            {latest && <> Last confirmed {new Date(latest.created_at).toLocaleDateString()}.</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={handleAllGood}
          className="px-4 py-2 rounded-lg bg-community text-community-foreground text-sm font-medium hover:bg-community/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> All good
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSomethingChanged}
          className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 inline-flex items-center gap-2"
        >
          Something changed <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
