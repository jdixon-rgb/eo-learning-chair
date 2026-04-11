import { useState, useMemo } from 'react'
import { useEngagementStore } from '@/lib/engagementStore'
import { useBoardStore } from '@/lib/boardStore'
import { useAuth } from '@/lib/auth'
import { Send, Plus, X, Check, Archive, RotateCcw, Trash2 } from 'lucide-react'

// One-tap broadcasts to every active navigator.
// Chair composes a single prompt with response options (default Y/N),
// every active navigator sees it on their portal home and taps one option,
// the chair sees aggregated counts + a breakdown of who responded with what.
export default function NavigatorBroadcastsPage() {
  const {
    navigators, broadcasts, broadcastResponses,
    createBroadcast, closeBroadcast, reopenBroadcast, deleteBroadcast,
    responsesForBroadcast,
  } = useEngagementStore()
  const { chapterMembers } = useBoardStore()
  const { profile } = useAuth()

  const [showCompose, setShowCompose] = useState(false)

  const memberById = useMemo(() => {
    const m = new Map()
    chapterMembers.forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  const currentMember = useMemo(() => {
    const email = profile?.email
    if (!email) return null
    return chapterMembers.find(cm => (cm.email || '').toLowerCase() === email.toLowerCase()) || null
  }, [chapterMembers, profile])

  const activeNavigators = useMemo(
    () => navigators.filter(n => n.status === 'active'),
    [navigators],
  )

  const sortedBroadcasts = useMemo(
    () => [...broadcasts].sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || '')),
    [broadcasts],
  )

  const handleSend = ({ prompt, options }) => {
    createBroadcast({ prompt, options, senderMemberId: currentMember?.id })
    setShowCompose(false)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Navigator Broadcasts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fire one question to all {activeNavigators.length} active navigators. They tap a single answer — no thread to manage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-eo-blue text-white text-sm font-medium hover:bg-eo-blue/90 shrink-0"
        >
          <Plus className="h-4 w-4" /> New broadcast
        </button>
      </header>

      {activeNavigators.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
          You don&apos;t have any active navigators yet. Broadcasts only go to navigators whose status is &ldquo;active&rdquo; on the Navigators page.
        </div>
      )}

      {showCompose && (
        <ComposeBroadcastModal
          onClose={() => setShowCompose(false)}
          onSend={handleSend}
          activeNavigatorCount={activeNavigators.length}
        />
      )}

      {sortedBroadcasts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Send className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No broadcasts yet. Send your first one when you&apos;re ready to do a check-in.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBroadcasts.map(b => (
            <BroadcastCard
              key={b.id}
              broadcast={b}
              responses={responsesForBroadcast(b.id)}
              activeNavigators={activeNavigators}
              memberById={memberById}
              onClose={() => closeBroadcast(b.id)}
              onReopen={() => reopenBroadcast(b.id)}
              onDelete={() => {
                if (window.confirm('Delete this broadcast and all its responses?')) {
                  deleteBroadcast(b.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Compose modal
// ────────────────────────────────────────────────────────────
function ComposeBroadcastModal({ onClose, onSend, activeNavigatorCount }) {
  const [prompt, setPrompt] = useState('How\u2019s your connection going?')
  const [options, setOptions] = useState([
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ])

  const addOption = () => {
    setOptions(prev => [...prev, { value: `opt${prev.length + 1}`, label: '' }])
  }
  const removeOption = (idx) => {
    setOptions(prev => prev.filter((_, i) => i !== idx))
  }
  const updateOption = (idx, patch) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  }

  const canSend = prompt.trim().length > 0 && options.length >= 2 && options.every(o => o.label.trim().length > 0)

  const handleSend = () => {
    if (!canSend) return
    // Auto-derive value from label if value is empty or looks auto-generated
    const cleaned = options.map(o => ({
      value: (o.value && !/^opt\d+$/.test(o.value)) ? o.value : o.label.toLowerCase().replace(/\s+/g, '_').slice(0, 32),
      label: o.label.trim(),
    }))
    onSend({ prompt: prompt.trim(), options: cleaned })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Navigator Broadcast</h2>
            <p className="text-xs text-gray-500 mt-1">Will be sent to {activeNavigatorCount} active navigator{activeNavigatorCount === 1 ? '' : 's'}.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            placeholder="e.g. How's your connection going?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-eo-blue focus:ring-1 focus:ring-eo-blue outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Response options</label>
            <button type="button" onClick={addOption} className="text-xs text-eo-blue hover:underline">+ Add option</button>
          </div>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={e => updateOption(idx, { label: e.target.value })}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-eo-blue focus:ring-1 focus:ring-eo-blue outline-none"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-gray-400 hover:text-red-500 p-1.5"
                    title="Remove option"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Minimum 2 options. Navigators tap one to respond.</p>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-eo-blue text-white text-sm font-medium hover:bg-eo-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Broadcast card — one past or open broadcast with aggregated responses
// ────────────────────────────────────────────────────────────
function BroadcastCard({ broadcast, responses, activeNavigators, memberById, onClose, onReopen, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const options = Array.isArray(broadcast.options) ? broadcast.options : []
  const optionCounts = useMemo(() => {
    const counts = {}
    options.forEach(o => { counts[o.value] = 0 })
    responses.forEach(r => {
      counts[r.response_value] = (counts[r.response_value] || 0) + 1
    })
    return counts
  }, [options, responses])

  const total = responses.length
  const outstanding = activeNavigators.length - total
  const pct = activeNavigators.length > 0 ? Math.round((total / activeNavigators.length) * 100) : 0

  // Who hasn't responded yet (by navigator_id)
  const respondedNavigatorIds = new Set(responses.map(r => r.navigator_id))
  const notYetResponded = activeNavigators.filter(n => !respondedNavigatorIds.has(n.id))

  const sentAt = broadcast.sent_at ? new Date(broadcast.sent_at) : null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
              broadcast.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {broadcast.status}
            </span>
            {sentAt && (
              <span className="text-xs text-gray-400">{sentAt.toLocaleDateString()} {sentAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            )}
          </div>
          <p className="text-base font-medium text-gray-900 whitespace-pre-line">{broadcast.prompt}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {broadcast.status === 'open' ? (
            <button onClick={onClose} className="text-gray-400 hover:text-amber-600 p-1.5" title="Close broadcast"><Archive className="h-4 w-4" /></button>
          ) : (
            <button onClick={onReopen} className="text-gray-400 hover:text-emerald-600 p-1.5" title="Reopen broadcast"><RotateCcw className="h-4 w-4" /></button>
          )}
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1.5" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <span className="font-semibold text-gray-900">{total} of {activeNavigators.length}</span>
        <span>responded ({pct}%)</span>
        {outstanding > 0 && broadcast.status === 'open' && (
          <span className="text-amber-600">· {outstanding} outstanding</span>
        )}
      </div>

      {/* Option bars */}
      <div className="space-y-1.5 mb-3">
        {options.map(opt => {
          const count = optionCounts[opt.value] || 0
          const optionPct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={opt.value} className="flex items-center gap-3">
              <div className="w-24 text-xs font-medium text-gray-700 shrink-0 truncate">{opt.label}</div>
              <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-eo-blue/70"
                  style={{ width: `${optionPct}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                  {count}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="text-xs text-eo-blue hover:underline"
      >
        {expanded ? 'Hide details' : 'See who responded'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Responses grouped by option */}
          {options.map(opt => {
            const optResponses = responses.filter(r => r.response_value === opt.value)
            if (optResponses.length === 0) return null
            return (
              <div key={opt.value}>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">{opt.label}</div>
                <div className="space-y-1">
                  {optResponses.map(r => {
                    const nav = activeNavigators.find(n => n.id === r.navigator_id)
                    const member = nav ? memberById.get(nav.chapter_member_id) : memberById.get(r.chapter_member_id)
                    return (
                      <div key={r.id} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{member?.name || 'Unknown'}</span>
                          {r.note && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">&ldquo;{r.note}&rdquo;</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Not yet responded */}
          {notYetResponded.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 mb-1">Not yet responded</div>
              <div className="flex flex-wrap gap-1.5">
                {notYetResponded.map(nav => {
                  const member = memberById.get(nav.chapter_member_id)
                  return (
                    <span key={nav.id} className="inline-block text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      {member?.name || 'Unknown'}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
