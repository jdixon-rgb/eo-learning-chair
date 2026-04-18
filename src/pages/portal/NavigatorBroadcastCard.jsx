import { useState, useMemo } from 'react'
import { useEngagementStore } from '@/lib/engagementStore'
import { Send, Check, ChevronDown, ChevronUp } from 'lucide-react'

// Navigator-only card that appears on the member portal dashboard
// when the member is an active navigator AND there are open broadcasts
// they haven't responded to yet. One tap to answer.
export default function NavigatorBroadcastCard({ currentMember }) {
  const {
    broadcasts, broadcastResponses, navigators,
    submitBroadcastResponse, navigatorForMember,
  } = useEngagementStore()

  const navigator = useMemo(
    () => navigatorForMember(currentMember?.id),
    [navigatorForMember, currentMember],
  )

  // Don't render anything if the member isn't an active navigator
  if (!currentMember || !navigator) return null

  // Open broadcasts (newest first)
  const openBroadcasts = broadcasts
    .filter(b => b.status === 'open')
    .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))

  if (openBroadcasts.length === 0) return null

  return (
    <div className="space-y-3">
      {openBroadcasts.map(b => (
        <BroadcastItem
          key={b.id}
          broadcast={b}
          navigator={navigator}
          currentMember={currentMember}
          responses={broadcastResponses}
          onSubmit={submitBroadcastResponse}
        />
      ))}
    </div>
  )
}

function BroadcastItem({ broadcast, navigator, currentMember, responses, onSubmit }) {
  const options = Array.isArray(broadcast.options) ? broadcast.options : []

  // Has this navigator already responded?
  const myResponse = responses.find(r => r.broadcast_id === broadcast.id && r.navigator_id === navigator.id)
  const [note, setNote] = useState(myResponse?.note || '')
  const [showNote, setShowNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePick = async (value) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        broadcastId: broadcast.id,
        navigatorId: navigator.id,
        chapterMemberId: currentMember.id,
        responseValue: value,
        note,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (myResponse) {
    const pickedLabel = options.find(o => o.value === myResponse.response_value)?.label || myResponse.response_value
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-0.5">Navigator check-in · Thanks</p>
            <p className="text-sm text-white/80 mb-1">{broadcast.prompt}</p>
            <p className="text-xs text-white/50">
              You answered <span className="text-white/80 font-medium">{pickedLabel}</span>
              {myResponse.note && <span className="block mt-1 italic">&ldquo;{myResponse.note}&rdquo;</span>}
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => handlePick(opt.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    opt.value === myResponse.response_value
                      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Send className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Navigator check-in</p>
          <p className="text-base text-white/90 font-medium whitespace-pre-line">{broadcast.prompt}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={submitting}
            onClick={() => handlePick(opt.value)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowNote(v => !v)}
        className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70"
      >
        {showNote ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showNote ? 'Hide note' : 'Add a note (optional)'}
      </button>
      {showNote && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Optional context for the chair…"
          className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
        />
      )}
    </div>
  )
}
