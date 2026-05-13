import { useState, useMemo } from 'react'
import {
  UserCheck, Plus, Compass, UserPlus, MessageSquare, Clock,
  Shuffle, ChevronDown, ChevronRight, X, Trash2, Save,
  ThumbsUp, ThumbsDown, AlertTriangle, Sparkles,
} from 'lucide-react'
import { useEngagementStore } from '@/lib/engagementStore'
import { useBoardStore } from '@/lib/boardStore'
import TourTip from '@/components/TourTip'
import StarRating from '@/components/StarRating'

const RENEWAL_LABELS = {
  unknown: 'Unknown',
  on_track: 'On track',
  at_risk: 'At risk',
  renewed: 'Renewed',
  lapsed: 'Lapsed',
}

const REACTION_OPTIONS = [
  { value: 'great', label: 'Great — real connection', icon: Sparkles, tone: 'text-emerald-600' },
  { value: 'helpful', label: 'Helpful — touches happening', icon: ThumbsUp, tone: 'text-emerald-600' },
  { value: 'silent', label: 'Silent — could be more', icon: Clock, tone: 'text-amber-600' },
  { value: 'no_touches', label: 'No touches yet', icon: AlertTriangle, tone: 'text-amber-600' },
  { value: 'mismatch', label: 'Not the right fit', icon: ThumbsDown, tone: 'text-rose-600' },
]

export default function PairingsPage() {
  const {
    navigators, pairings, addPairing, reassignPairing, endPairing, deletePairing,
    logSession, sessionsForPairing,
    submitFeedback, feedbackForPairing,
    upsertNewMemberProfile, profileForMember,
    activePairingsForNavigator,
  } = useEngagementStore()
  const { chapterMembers } = useBoardStore()

  const [showAddPairing, setShowAddPairing] = useState(false)
  const [pairingForm, setPairingForm] = useState({ navigator_id: '', member_id: '', cadence: 'biweekly' })
  const [expandedPairing, setExpandedPairing] = useState(null)
  const [reassignTarget, setReassignTarget] = useState(null)
  const [reassignTo, setReassignTo] = useState('')

  const memberById = useMemo(() => {
    const m = new Map()
    chapterMembers.forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  const navigatorById = useMemo(() => {
    const m = new Map()
    navigators.forEach(n => m.set(n.id, n))
    return m
  }, [navigators])

  const activeNavigators = useMemo(() =>
    navigators.filter(n => n.status === 'active')
      .sort((a, b) => {
        const an = memberById.get(a.chapter_member_id)?.name || ''
        const bn = memberById.get(b.chapter_member_id)?.name || ''
        return an.localeCompare(bn)
      }),
    [navigators, memberById])

  // Group active pairings by navigator
  const groups = useMemo(() => {
    const map = new Map()
    activeNavigators.forEach(n => map.set(n.id, []))
    pairings
      .filter(p => p.status === 'active')
      .forEach(p => {
        if (!map.has(p.navigator_id)) map.set(p.navigator_id, [])
        map.get(p.navigator_id).push(p)
      })
    return map
  }, [pairings, activeNavigators])

  // Unpaired new members: anyone with no active pairing as the "member" side
  const pairedMemberIds = useMemo(() => {
    const s = new Set()
    pairings.filter(p => p.status === 'active').forEach(p => s.add(p.member_id))
    return s
  }, [pairings])

  const unpairedMembers = useMemo(() =>
    chapterMembers
      .filter(cm => cm.status === 'active' && !pairedMemberIds.has(cm.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [chapterMembers, pairedMemberIds])

  const eligibleMembersForAdd = useMemo(() => unpairedMembers, [unpairedMembers])

  const submitPairing = (e) => {
    e.preventDefault()
    if (!pairingForm.navigator_id || !pairingForm.member_id) return
    addPairing(pairingForm)
    setPairingForm({ navigator_id: '', member_id: '', cadence: 'biweekly' })
    setShowAddPairing(false)
  }

  const handleReassign = () => {
    if (!reassignTarget || !reassignTo) return
    reassignPairing(reassignTarget, reassignTo)
    setReassignTarget(null)
    setReassignTo('')
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <TourTip />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pairings</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Navigators on top, the new members they guide below. Log touches, capture two-way feedback, keep first-year obligations visible.
          </p>
        </div>
        <button
          onClick={() => setShowAddPairing(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          New pairing
        </button>
      </header>

      {/* Unpaired new members callout */}
      {unpairedMembers.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {unpairedMembers.length} member{unpairedMembers.length === 1 ? '' : 's'} without an active navigator
              </p>
              <p className="text-xs text-amber-700 mt-1">
                The handoff packet should never let a new member fall through. Pair them now.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {unpairedMembers.slice(0, 12).map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPairingForm({ navigator_id: '', member_id: m.id, cadence: 'biweekly' })
                      setShowAddPairing(true)
                    }}
                    className="text-[11px] bg-white border border-amber-300 text-amber-900 rounded-full px-2.5 py-1 hover:bg-amber-100"
                  >
                    {m.name}{m.forum ? ` · ${m.forum}` : ''}
                  </button>
                ))}
                {unpairedMembers.length > 12 && (
                  <span className="text-[11px] text-amber-700 self-center">+{unpairedMembers.length - 12} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeNavigators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Compass className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No active navigators</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Add navigators first on the Navigators page, then come back here to pair them with new members.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeNavigators.map(nav => {
            const navMember = memberById.get(nav.chapter_member_id)
            const navPairings = groups.get(nav.id) || []
            const activeCount = activePairingsForNavigator(nav.id)
            const cap = nav.max_concurrent_pairings
            const overCap = cap != null && activeCount > cap

            return (
              <div key={nav.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                {/* Navigator header row */}
                <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Compass className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{navMember?.name || 'Unknown navigator'}</p>
                        {nav.staff_rating > 0 && <StarRating value={nav.staff_rating} readonly size="sm" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{navMember?.forum || '—'}{navMember?.email ? ` · ${navMember.email}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 shrink-0">
                    <div className={overCap ? 'text-amber-700 font-semibold' : ''}>
                      {activeCount}{cap != null ? ` / ${cap}` : ''} active
                    </div>
                    {overCap && <div className="text-[10px] text-amber-700">Over capacity</div>}
                  </div>
                </div>

                {/* Paired members */}
                {navPairings.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-gray-500 italic">
                    No active pairings. Use "New pairing" to assign new members to {navMember?.name?.split(' ')[0] || 'this navigator'}.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {navPairings.map(p => {
                      const member = memberById.get(p.member_id)
                      const expanded = expandedPairing === p.id
                      const sessions = sessionsForPairing(p.id)
                      const lastTouch = sessions[0]?.session_date
                      const fb = feedbackForPairing(p.id)
                      const latestReaction = fb[0]
                      const profile = profileForMember(p.member_id)
                      return (
                        <li key={p.id} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              onClick={() => setExpandedPairing(expanded ? null : p.id)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              {expanded
                                ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 truncate">{member?.name || 'Unknown member'}</p>
                                  {profile?.first_year_renewal_status && profile.first_year_renewal_status !== 'unknown' && (
                                    <RenewalPill status={profile.first_year_renewal_status} />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {member?.forum || '—'}
                                  {lastTouch ? ` · last touch ${formatDate(lastTouch)}` : ' · no touches yet'}
                                  {latestReaction ? ` · ${REACTION_OPTIONS.find(r => r.value === latestReaction.reaction)?.label.split('—')[0].trim()}` : ''}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setReassignTarget(p.id); setReassignTo('') }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-emerald-700"
                                title="Reassign"
                              >
                                <Shuffle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`End this pairing with ${member?.name || 'this member'}? You can start a new one anytime.`)) {
                                    endPairing(p.id, 'completed')
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-700"
                                title="End pairing"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Permanently delete this pairing? Use End instead to preserve history.')) {
                                    deletePairing(p.id)
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <PairingDetail
                              pairing={p}
                              member={member}
                              profile={profile}
                              sessions={sessions}
                              feedback={fb}
                              onLogSession={(notes, date) => logSession({ pairing_id: p.id, notes, session_date: date })}
                              onSubmitFeedback={(reaction, note) => submitFeedback({
                                pairing_id: p.id,
                                chapter_member_id: p.member_id,
                                reaction,
                                note,
                              })}
                              onSaveProfile={(patch) => upsertNewMemberProfile(p.member_id, patch)}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add pairing modal */}
      {showAddPairing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold">New pairing</h2>
              <button onClick={() => setShowAddPairing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitPairing} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Navigator</label>
                <select
                  required
                  value={pairingForm.navigator_id}
                  onChange={e => setPairingForm(f => ({ ...f, navigator_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a navigator…</option>
                  {activeNavigators.map(n => {
                    const cm = memberById.get(n.chapter_member_id)
                    const count = activePairingsForNavigator(n.id)
                    const cap = n.max_concurrent_pairings
                    const overCap = cap != null && count >= cap
                    return (
                      <option key={n.id} value={n.id}>
                        {cm?.name || 'Unknown'}
                        {cap != null ? ` (${count}/${cap})` : ` (${count})`}
                        {overCap ? ' — at capacity' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New member</label>
                <select
                  required
                  value={pairingForm.member_id}
                  onChange={e => setPairingForm(f => ({ ...f, member_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a member…</option>
                  {eligibleMembersForAdd.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.forum ? ` — ${m.forum}` : ''}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Only members without an active navigator appear here.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cadence</label>
                <select
                  value={pairingForm.cadence}
                  onChange={e => setPairingForm(f => ({ ...f, cadence: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddPairing(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90">
                  Create pairing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold">Reassign to a new navigator</h2>
              <button onClick={() => setReassignTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                The current pairing will be marked "reassigned" and a new pairing started. Touch and feedback history are kept on the old pairing.
              </p>
              <select
                value={reassignTo}
                onChange={e => setReassignTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select the new navigator…</option>
                {activeNavigators
                  .filter(n => {
                    const current = pairings.find(p => p.id === reassignTarget)
                    return current ? n.id !== current.navigator_id : true
                  })
                  .map(n => {
                    const cm = memberById.get(n.chapter_member_id)
                    return <option key={n.id} value={n.id}>{cm?.name || 'Unknown'}</option>
                  })}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReassignTarget(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reassignTo}
                  onClick={handleReassign}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reassign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RenewalPill({ status }) {
  const styles = {
    on_track: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
    renewed: 'bg-sky-50 text-sky-700 border-sky-200',
    lapsed: 'bg-rose-50 text-rose-700 border-rose-200',
    unknown: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${styles[status] || styles.unknown}`}>
      {RENEWAL_LABELS[status] || status}
    </span>
  )
}

function PairingDetail({ pairing, member, profile, sessions, feedback, onLogSession, onSubmitFeedback, onSaveProfile }) {
  const [touchNotes, setTouchNotes] = useState('')
  const [touchDate, setTouchDate] = useState(new Date().toISOString().slice(0, 10))
  const [feedbackReaction, setFeedbackReaction] = useState('')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [profileDraft, setProfileDraft] = useState({
    joined_on: profile?.joined_on || '',
    placement_notes: profile?.placement_notes || '',
    expectations_notes: profile?.expectations_notes || '',
    first_year_renewal_status: profile?.first_year_renewal_status || 'unknown',
    first_year_renewal_notes: profile?.first_year_renewal_notes || '',
  })
  const [profileDirty, setProfileDirty] = useState(false)

  const updateDraft = (patch) => {
    setProfileDraft(prev => ({ ...prev, ...patch }))
    setProfileDirty(true)
  }

  const submitTouch = () => {
    if (!touchNotes.trim()) return
    onLogSession(touchNotes.trim(), touchDate)
    setTouchNotes('')
    setTouchDate(new Date().toISOString().slice(0, 10))
  }

  const submitReaction = (reaction) => {
    onSubmitFeedback(reaction, feedbackNote.trim())
    setFeedbackReaction('')
    setFeedbackNote('')
  }

  const saveProfile = () => {
    onSaveProfile({
      joined_on: profileDraft.joined_on || null,
      placement_notes: profileDraft.placement_notes,
      expectations_notes: profileDraft.expectations_notes,
      expectations_set_at: profileDraft.expectations_notes && !profile?.expectations_set_at
        ? new Date().toISOString()
        : profile?.expectations_set_at,
      first_year_renewal_status: profileDraft.first_year_renewal_status,
      first_year_renewal_notes: profileDraft.first_year_renewal_notes,
    })
    setProfileDirty(false)
  }

  return (
    <div className="mt-3 pl-7 grid md:grid-cols-3 gap-4">
      {/* Log a touch */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-700">
          <Clock className="h-3.5 w-3.5" /> Log a touch
        </div>
        <input
          type="date"
          value={touchDate}
          onChange={e => setTouchDate(e.target.value)}
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5 mb-2"
        />
        <textarea
          value={touchNotes}
          onChange={e => setTouchNotes(e.target.value)}
          rows={3}
          placeholder="What did you talk about? Anything to flag?"
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
        />
        <button
          onClick={submitTouch}
          disabled={!touchNotes.trim()}
          className="mt-2 w-full text-xs font-semibold bg-emerald-600 text-white rounded-md py-1.5 hover:bg-emerald-700 disabled:opacity-40"
        >
          Log touch
        </button>
        {sessions.length > 0 && (
          <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {sessions.slice(0, 5).map(s => (
              <li key={s.id} className="text-[11px] text-gray-600 border-l-2 border-emerald-200 pl-2">
                <span className="text-gray-400 font-medium">{formatDate(s.session_date)}</span>
                <p className="line-clamp-2">{s.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Member feedback */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-700">
          <MessageSquare className="h-3.5 w-3.5" /> {member?.name?.split(' ')[0] || 'Member'}'s reaction
        </div>
        <p className="text-[10px] text-gray-500 mb-2">
          One tap from the new member. No survey.
        </p>
        <div className="space-y-1">
          {REACTION_OPTIONS.map(opt => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => setFeedbackReaction(opt.value)}
                className={`w-full flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-md border transition-colors ${
                  feedbackReaction === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-3 w-3 ${opt.tone}`} />
                <span className="text-left flex-1">{opt.label}</span>
              </button>
            )
          })}
        </div>
        {feedbackReaction && (
          <>
            <textarea
              value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)}
              rows={2}
              placeholder="Optional note (private to chair)"
              className="mt-2 w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
            />
            <button
              onClick={() => submitReaction(feedbackReaction)}
              className="mt-2 w-full text-xs font-semibold bg-primary text-white rounded-md py-1.5 hover:bg-primary/90"
            >
              Save reaction
            </button>
          </>
        )}
        {feedback.length > 0 && (
          <ul className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
            {feedback.slice(0, 5).map(f => (
              <li key={f.id} className="text-[11px] text-gray-600">
                <span className="text-gray-400">{formatDate(f.created_at)}</span>{' '}
                <span className="font-medium">{REACTION_OPTIONS.find(r => r.value === f.reaction)?.label.split('—')[0].trim()}</span>
                {f.note && <p className="text-gray-500 italic">{f.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* New-member profile */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Sparkles className="h-3.5 w-3.5" /> Member profile
          </div>
          {profileDirty && (
            <button
              onClick={saveProfile}
              className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Save className="h-3 w-3" /> Save
            </button>
          )}
        </div>
        <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-1">EO join date</label>
        <input
          type="date"
          value={profileDraft.joined_on}
          onChange={e => updateDraft({ joined_on: e.target.value })}
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
        />
        <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-2">Placement notes</label>
        <textarea
          value={profileDraft.placement_notes}
          onChange={e => updateDraft({ placement_notes: e.target.value })}
          rows={2}
          placeholder="Why this forum, what to watch for"
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
        />
        <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-2">Expectations conversation</label>
        <textarea
          value={profileDraft.expectations_notes}
          onChange={e => updateDraft({ expectations_notes: e.target.value })}
          rows={2}
          placeholder="The honest 'real people, real system' chat — what was said?"
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
        />
        <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-2">First-year renewal</label>
        <select
          value={profileDraft.first_year_renewal_status}
          onChange={e => updateDraft({ first_year_renewal_status: e.target.value })}
          className="w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
        >
          {Object.entries(RENEWAL_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {profileDraft.first_year_renewal_status !== 'unknown' && (
          <textarea
            value={profileDraft.first_year_renewal_notes}
            onChange={e => updateDraft({ first_year_renewal_notes: e.target.value })}
            rows={2}
            placeholder="Renewal context"
            className="mt-2 w-full text-xs rounded-md border border-gray-300 px-2 py-1.5"
          />
        )}
      </section>
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
