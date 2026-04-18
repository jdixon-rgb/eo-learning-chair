import { useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { UserCircle, Check, X, ChevronDown } from 'lucide-react'

// Quarterly ping: "has anything changed in your profile?"
// Shows when the member has no check-in in the last 90 days.
// One-tap "All good", or "Something changed" → free-text note that
// queues a change_requested row for the admin team to action.
export default function ProfileFreshnessCard({ currentMember }) {
  const { submitProfileCheckin, profileIsStale, latestCheckinForMember } = useBoardStore()
  const [justSubmitted, setJustSubmitted] = useState(null) // null | 'no_change' | 'change_requested'
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [note, setNote] = useState('')
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

  const handleSubmitChange = async () => {
    if (submitting || !note.trim()) return
    setSubmitting(true)
    try {
      await submitProfileCheckin({ memberId: currentMember.id, kind: 'change_requested', note: note.trim() })
      setJustSubmitted('change_requested')
    } finally {
      setSubmitting(false)
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
          <p className="text-sm text-white/80">
            Thanks — we&apos;ll check back in a few months.
          </p>
        </div>
      </div>
    )
  }

  if (justSubmitted === 'change_requested') {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 font-medium">Got it — someone will reach out to update your profile.</p>
            <p className="text-xs text-white/50 mt-1 italic">&ldquo;{note.trim()}&rdquo;</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <UserCircle className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1">Profile check-in</p>
          <p className="text-base text-white/90 font-medium">Has anything changed in your world since we last checked?</p>
          <p className="text-xs text-white/50 mt-1">
            New company, role, partner, kids, address, interests — anything we should know.
            {latest && <> Last confirmed {new Date(latest.created_at).toLocaleDateString()}.</>}
          </p>
        </div>
      </div>

      {!showChangeForm ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleAllGood}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-500/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Check className="h-4 w-4" /> All good
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowChangeForm(true)}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm font-medium hover:bg-white/15 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <ChevronDown className="h-4 w-4" /> Something changed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            autoFocus
            placeholder="What changed? e.g. new company name, moved to Scottsdale, got married, joined a new board…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting || !note.trim()}
              onClick={handleSubmitChange}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send to chapter team
            </button>
            <button
              type="button"
              onClick={() => { setShowChangeForm(false); setNote('') }}
              className="px-4 py-2 text-sm text-white/50 hover:text-white/80 inline-flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
