import { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, Plus, Trash2,
  RotateCcw, X, ChevronDown, ChevronUp, ScrollText,
} from 'lucide-react'
import { useBoardStore } from '@/lib/boardStore'
import { useForumStore } from '@/lib/forumStore'
import { useChapter } from '@/lib/chapter'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/lib/pageHeader'

const RISK_LEVELS = [
  { value: 'low', label: 'Low', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'medium', label: 'Medium', tone: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'high', label: 'High', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
]

// Reasons reflect the actual churn signals board chairs report. Order
// is roughly strongest-to-weakest churn signal so the high-risk
// reasons sit at the top of the picker. Older `no_show_seeding`
// entries (if any exist) fall through to the raw-value display in
// reasonLabel() — that label was jargon and was removed from the
// picker on 2026-05-15.
const REASON_PRESETS = [
  { value: 'not_renewing', label: 'Not renewing' },
  { value: 'missing_events', label: 'Missing events' },
  { value: 'left_forum', label: 'Left their forum' },
  { value: 'on_the_fence_call', label: 'On-the-fence call' },
  { value: 'disengaged', label: 'Disengaged' },
  { value: 'culture_fit', label: 'Culture fit concern' },
  { value: 'life_pressure', label: 'Life pressure' },
  { value: 'other', label: 'Other' },
]

// Display-only lookup so historical entries with the old reason keys
// still render with a readable label instead of the raw enum value.
// Don't add new keys here — add them to REASON_PRESETS above.
const LEGACY_REASON_LABELS = {
  no_show_seeding: "Didn't show to seeding",
  attendance: 'Attendance issues',
  considering_exit: 'Considering leaving EO',
  moderator_leaving: 'Moderator stepping down',
}

const ACTIONS = [
  { value: 'watch', label: 'Watch' },
  { value: 'coach', label: 'Coach 1:1' },
  { value: 'reassess', label: 'Reassess fit' },
  { value: 'reassign', label: 'Reassign forum' },
  { value: 'exit', label: 'Plan exit' },
]

function riskTone(level) {
  return RISK_LEVELS.find(r => r.value === level)?.tone
    ?? 'bg-muted text-muted-foreground border-border'
}

function reasonLabel(value) {
  return REASON_PRESETS.find(r => r.value === value)?.label
    ?? LEGACY_REASON_LABELS[value]
    ?? value
}

function actionLabel(value) {
  return ACTIONS.find(a => a.value === value)?.label ?? value
}

function relativeDays(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const EMPTY_DRAFT = {
  forum_id: '',
  chapter_member_id: '',
  risk_level: 'medium',
  reasons: [],
  notes: '',
  better_fit_note: '',
  recommended_action: null,
}

export default function AtRiskMembersPage() {
  const { forums, chapterMembers } = useBoardStore()
  const {
    atRiskEntries,
    addAtRiskEntry, updateAtRiskEntry, resolveAtRiskEntry,
    reopenAtRiskEntry, touchAtRiskReviewed, deleteAtRiskEntry,
  } = useForumStore()
  const { user, profile, effectiveRole } = useAuth()
  const { activeChapterId } = useChapter()

  const canView = hasPermission(effectiveRole, 'canViewAtRisk')
  const canFlag = hasPermission(effectiveRole, 'canFlagAtRisk')

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [flagSubmitted, setFlagSubmitted] = useState(false)
  const [flagError, setFlagError] = useState('')
  const [filterForum, setFilterForum] = useState('all')
  const [filterStatus, setFilterStatus] = useState('open')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [resolveOpenFor, setResolveOpenFor] = useState(null)
  const [resolveOutcome, setResolveOutcome] = useState('')

  const myMemberId = useMemo(() => {
    const email = user?.email || profile?.email
    if (!email) return null
    const m = chapterMembers.find(x => (x.email || '').toLowerCase() === email.toLowerCase())
    return m?.id ?? null
  }, [chapterMembers, user, profile])

  const activeForums = useMemo(
    () => forums.filter(f => f.is_active).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [forums]
  )

  const forumNameById = useMemo(() => {
    const m = new Map()
    for (const f of forums) m.set(f.id, f.name)
    return m
  }, [forums])

  const memberById = useMemo(() => {
    const m = new Map()
    for (const cm of chapterMembers) m.set(cm.id, cm)
    return m
  }, [chapterMembers])

  // Every active chapter member, alphabetical — drives the member-first
  // flag flow so flaggers don't have to know which forum the person is
  // in before they can pick them.
  const assignableMembers = useMemo(() => {
    return chapterMembers
      .filter(m => m.status === 'active')
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [chapterMembers])

  // Members assignable to a given forum (matches by name today, like the rest of the app)
  function membersInForum(forumId) {
    const f = forums.find(x => x.id === forumId)
    if (!f) return []
    return chapterMembers
      .filter(m => (m.forum || '').toLowerCase() === f.name.toLowerCase() && m.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  // Already-flagged-open members for a forum (so we don't double-flag)
  function alreadyFlaggedMemberIds(forumId) {
    return new Set(
      atRiskEntries
        .filter(e => e.forum_id === forumId && e.status === 'open')
        .map(e => e.chapter_member_id)
    )
  }

  const filtered = useMemo(() => {
    return atRiskEntries
      .filter(e => filterForum === 'all' || e.forum_id === filterForum)
      .filter(e => filterStatus === 'all' || e.status === filterStatus)
      .slice()
      .sort((a, b) => {
        // Open first, then by risk level desc, then by oldest review at top
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1
        const riskRank = { high: 3, medium: 2, low: 1 }
        const dr = (riskRank[b.risk_level] || 0) - (riskRank[a.risk_level] || 0)
        if (dr !== 0) return dr
        const ta = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0
        const tb = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0
        return ta - tb
      })
  }, [atRiskEntries, filterForum, filterStatus])

  const groupedByForum = useMemo(() => {
    const groups = new Map()
    for (const e of filtered) {
      if (!groups.has(e.forum_id)) groups.set(e.forum_id, [])
      groups.get(e.forum_id).push(e)
    }
    return Array.from(groups.entries())
      .map(([fid, list]) => ({
        forumId: fid,
        forumName: forumNameById.get(fid) || 'Unknown forum',
        list,
      }))
      .sort((a, b) => a.forumName.localeCompare(b.forumName))
  }, [filtered, forumNameById])

  function handleAdd() {
    if (!draft.forum_id || !draft.chapter_member_id) return
    addAtRiskEntry(draft, myMemberId)
    setDraft(EMPTY_DRAFT)
    setShowAdd(false)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setEditDraft({
      risk_level: entry.risk_level,
      reasons: entry.reasons || [],
      notes: entry.notes || '',
      better_fit_note: entry.better_fit_note || '',
      recommended_action: entry.recommended_action,
    })
  }

  function saveEdit() {
    if (!editingId || !editDraft) return
    updateAtRiskEntry(editingId, editDraft)
    setEditingId(null)
    setEditDraft(null)
  }

  function toggleReason(list, value) {
    return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
  }

  const totalOpen = atRiskEntries.filter(e => e.status === 'open').length
  const totalHigh = atRiskEntries.filter(e => e.status === 'open' && e.risk_level === 'high').length

  // Submission-only view for board roles that can FLAG but not VIEW.
  // No tiles, no filters, no roster — just the form + a thank-you on
  // submit. Goes through supabase directly (not the optimistic store)
  // so we can surface RLS / unique-constraint errors to the submitter
  // — they have no list view to verify the entry landed.
  // forumIdOverride lets the member-first flow pass the forum_id we
  // derived from the selected member, since `draft.forum_id` is only
  // populated in the fallback case where the member has no forum.
  async function handleFlagSubmit(forumIdOverride) {
    const forumId = forumIdOverride || draft.forum_id
    if (!forumId || !draft.chapter_member_id) return
    setFlagError('')
    if (!isSupabaseConfigured()) {
      setFlagError('Supabase is not configured in this environment.')
      return
    }
    const now = new Date().toISOString()
    const row = {
      chapter_id: activeChapterId,
      forum_id: forumId,
      chapter_member_id: draft.chapter_member_id,
      risk_level: draft.risk_level,
      reasons: draft.reasons,
      notes: draft.notes,
      better_fit_note: draft.better_fit_note,
      recommended_action: draft.recommended_action,
      status: 'open',
      last_reviewed_at: now,
      created_by: myMemberId,
    }
    const { error } = await supabase.from('forum_at_risk_entries').insert(row)
    if (error) {
      // Unique-constraint hit means an open entry already exists for
      // (forum, member). That's good news — the chair is already on it.
      if (error.code === '23505') {
        setFlagError('The Forum Health Chair already has an open entry for this person — no need to flag again.')
      } else {
        setFlagError(`Could not submit: ${error.message}`)
      }
      return
    }
    setDraft(EMPTY_DRAFT)
    setFlagSubmitted(true)
  }

  if (!canView && canFlag) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Flag a Member At Risk"
          subtitle="Quietly tell the Forum Health Chair you're worried about someone. The list of who's been flagged stays private to the Health and Placement chairs."
        />

        {flagSubmitted ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-sm font-medium">Thanks — the Forum Health Chair will take it from here.</p>
            <Button variant="outline" onClick={() => setFlagSubmitted(false)}>Flag another</Button>
          </div>
        ) : (() => {
          // Member-first flow: most flaggers don't know which forum the
          // person is in — they just know the person. Pick the member
          // from the full active roster; forum auto-derives from
          // chapter_members.forum (string-matched to forums.name, the
          // same way the rest of the app does it). Only fall back to a
          // forum picker if the selected member isn't assigned to one,
          // because the DB requires forum_id NOT NULL.
          const selectedMember = draft.chapter_member_id ? memberById.get(draft.chapter_member_id) : null
          const derivedForumId = (() => {
            const fname = (selectedMember?.forum || '').trim().toLowerCase()
            if (!fname) return ''
            return forums.find(f => (f.name || '').toLowerCase() === fname)?.id || ''
          })()
          const effectiveForumId = derivedForumId || draft.forum_id
          const derivedForumName = derivedForumId
            ? forumNameById.get(derivedForumId)
            : ''
          return (
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Member</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={draft.chapter_member_id}
                onChange={e => setDraft(d => ({ ...d, chapter_member_id: e.target.value, forum_id: '' }))}
              >
                <option value="">Search or select a member…</option>
                {assignableMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.company ? ` · ${m.company}` : ''}
                  </option>
                ))}
              </select>
              {selectedMember && derivedForumName && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Forum: <span className="text-foreground font-medium">{derivedForumName}</span>
                </p>
              )}
              {selectedMember && !derivedForumId && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {selectedMember.name} isn't assigned to a forum yet — pick one
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={draft.forum_id}
                    onChange={e => setDraft(d => ({ ...d, forum_id: e.target.value }))}
                  >
                    <option value="">Select a forum…</option>
                    {activeForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Risk level</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {RISK_LEVELS.map(r => (
                  <button
                    key={r.value} type="button"
                    onClick={() => setDraft(d => ({ ...d, risk_level: r.value }))}
                    className={`text-xs px-2.5 py-1 rounded-md border ${draft.risk_level === r.value ? r.tone : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Why are you concerned?</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {REASON_PRESETS.map(r => {
                  const on = draft.reasons.includes(r.value)
                  return (
                    <button
                      key={r.value} type="button"
                      onClick={() => setDraft(d => ({ ...d, reasons: toggleReason(d.reasons, r.value) }))}
                      className={`text-xs px-2.5 py-1 rounded-md border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Context for the Forum Health Chair</label>
              <textarea
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="What you've seen or heard. Will only be visible to the Health and Placement chairs."
                value={draft.notes}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              />
            </div>

            {flagError && (
              <p className="text-xs text-destructive">{flagError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => handleFlagSubmit(effectiveForumId)}
                disabled={!effectiveForumId || !draft.chapter_member_id}
              >
                Submit flag
              </Button>
            </div>
          </div>
          )
        })()}
      </div>
    )
  }

  if (!canView && !canFlag) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold">You don't have access to At-Risk Members</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This ledger is managed by the Forum Health and Forum Placement chairs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="At-Risk Members"
        subtitle="Members the Health and Placement chairs are watching — co-owned ledger that survives chair handoffs."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile label="Open" value={totalOpen} tone={totalOpen > 0 ? 'text-rose-700' : 'text-muted-foreground'} icon={AlertTriangle} />
        <Tile label="High risk" value={totalHigh} tone={totalHigh > 0 ? 'text-rose-700' : 'text-muted-foreground'} icon={AlertTriangle} />
        <Tile label="Resolved (history)" value={atRiskEntries.length - totalOpen} tone="text-muted-foreground" icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="text-sm rounded-md border bg-background px-3 py-1.5"
          value={filterForum}
          onChange={e => setFilterForum(e.target.value)}
        >
          <option value="all">All forums</option>
          {activeForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          className="text-sm rounded-md border bg-background px-3 py-1.5"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>

        <div className="flex-1" />

        <Button onClick={() => setShowAdd(s => !s)} className="ml-auto">
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? 'Cancel' : 'Flag a member'}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">Flag a member at risk</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Forum</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={draft.forum_id}
                onChange={e => setDraft(d => ({ ...d, forum_id: e.target.value, chapter_member_id: '' }))}
              >
                <option value="">Select a forum…</option>
                {activeForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Member</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                value={draft.chapter_member_id}
                onChange={e => setDraft(d => ({ ...d, chapter_member_id: e.target.value }))}
                disabled={!draft.forum_id}
              >
                <option value="">{draft.forum_id ? 'Select a member…' : 'Pick a forum first'}</option>
                {draft.forum_id && (() => {
                  const flagged = alreadyFlaggedMemberIds(draft.forum_id)
                  return membersInForum(draft.forum_id).map(m => (
                    <option key={m.id} value={m.id} disabled={flagged.has(m.id)}>
                      {m.name}{flagged.has(m.id) ? ' (already flagged)' : ''}
                    </option>
                  ))
                })()}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Risk level</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {RISK_LEVELS.map(r => (
                <button
                  key={r.value} type="button"
                  onClick={() => setDraft(d => ({ ...d, risk_level: r.value }))}
                  className={`text-xs px-2.5 py-1 rounded-md border ${draft.risk_level === r.value ? r.tone : 'bg-background text-foreground border-border hover:bg-muted'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Why are they at risk?</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {REASON_PRESETS.map(r => {
                const on = draft.reasons.includes(r.value)
                return (
                  <button
                    key={r.value} type="button"
                    onClick={() => setDraft(d => ({ ...d, reasons: toggleReason(d.reasons, r.value) }))}
                    className={`text-xs px-2.5 py-1 rounded-md border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Two no-shows at seeding, called afterwards on the fence…"
              value={draft.notes}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Better fit (optional)</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
              placeholder="Forum with more newer members; faster cadence; etc."
              value={draft.better_fit_note}
              onChange={e => setDraft(d => ({ ...d, better_fit_note: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Recommended action</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACTIONS.map(a => (
                <button
                  key={a.value} type="button"
                  onClick={() => setDraft(d => ({ ...d, recommended_action: d.recommended_action === a.value ? null : a.value }))}
                  className={`text-xs px-2.5 py-1 rounded-md border ${draft.recommended_action === a.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDraft(EMPTY_DRAFT); setShowAdd(false) }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!draft.forum_id || !draft.chapter_member_id}>Flag at risk</Button>
          </div>
        </div>
      )}

      {groupedByForum.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          No entries match the current filters. {filterStatus === 'open' && totalOpen === 0 && 'Nothing currently flagged — quiet is good.'}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByForum.map(group => (
            <div key={group.forumId}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.forumName} · {group.list.length} {group.list.length === 1 ? 'entry' : 'entries'}
              </div>
              <div className="space-y-3">
                {group.list.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    member={memberById.get(entry.chapter_member_id)}
                    isEditing={editingId === entry.id}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    onStartEdit={() => startEdit(entry)}
                    onCancelEdit={() => { setEditingId(null); setEditDraft(null) }}
                    onSaveEdit={saveEdit}
                    onTouchReviewed={() => touchAtRiskReviewed(entry.id)}
                    onDelete={() => {
                      if (confirm(`Delete this entry for ${memberById.get(entry.chapter_member_id)?.name || 'member'}? Use Resolve if you want to keep it as history.`)) {
                        deleteAtRiskEntry(entry.id)
                      }
                    }}
                    onReopen={() => reopenAtRiskEntry(entry.id)}
                    onResolveStart={() => { setResolveOpenFor(entry.id); setResolveOutcome('') }}
                    isResolving={resolveOpenFor === entry.id}
                    resolveOutcome={resolveOutcome}
                    setResolveOutcome={setResolveOutcome}
                    onResolveCancel={() => { setResolveOpenFor(null); setResolveOutcome('') }}
                    onResolveConfirm={() => {
                      resolveAtRiskEntry(entry.id, resolveOutcome)
                      setResolveOpenFor(null); setResolveOutcome('')
                    }}
                    toggleReason={toggleReason}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Tile({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className={`text-xl font-semibold leading-none ${tone || ''}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  )
}

function EntryCard({
  entry, member, isEditing, editDraft, setEditDraft,
  onStartEdit, onCancelEdit, onSaveEdit,
  onTouchReviewed, onDelete, onReopen,
  onResolveStart, isResolving, resolveOutcome, setResolveOutcome, onResolveCancel, onResolveConfirm,
  toggleReason,
}) {
  const [expanded, setExpanded] = useState(false)
  const open = entry.status === 'open'

  return (
    <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${open ? '' : 'opacity-75'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${riskTone(entry.risk_level)}`}>
            {entry.risk_level}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold truncate">{member?.name || '(member removed)'}</div>
              {!open && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border bg-muted text-muted-foreground">
                  resolved
                </span>
              )}
            </div>
            {(entry.reasons?.length || 0) > 0 && (
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                {entry.reasons.map(r => (
                  <span key={r} className="px-1.5 py-0.5 rounded bg-muted">{reasonLabel(r)}</span>
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {entry.last_reviewed_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Reviewed {relativeDays(entry.last_reviewed_at)}
                </span>
              )}
              {entry.recommended_action && (
                <span>Action: {actionLabel(entry.recommended_action)}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {expanded && !isEditing && (
          <div className="mt-4 space-y-3 text-sm">
            {entry.notes && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
                <div className="whitespace-pre-wrap text-sm">{entry.notes}</div>
              </div>
            )}
            {entry.better_fit_note && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Better fit</div>
                <div className="whitespace-pre-wrap text-sm">{entry.better_fit_note}</div>
              </div>
            )}
            {!entry.notes && !entry.better_fit_note && (
              <div className="text-xs text-muted-foreground italic">No notes yet.</div>
            )}
            {!open && entry.resolution_outcome && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Resolution</div>
                <div className="whitespace-pre-wrap text-sm">{entry.resolution_outcome}</div>
              </div>
            )}
          </div>
        )}

        {expanded && isEditing && editDraft && (
          <div className="mt-4 space-y-4 text-sm border-t pt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Risk level</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {RISK_LEVELS.map(r => (
                  <button
                    key={r.value} type="button"
                    onClick={() => setEditDraft(d => ({ ...d, risk_level: r.value }))}
                    className={`text-xs px-2.5 py-1 rounded-md border ${editDraft.risk_level === r.value ? r.tone : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reasons</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {REASON_PRESETS.map(r => {
                  const on = editDraft.reasons.includes(r.value)
                  return (
                    <button
                      key={r.value} type="button"
                      onClick={() => setEditDraft(d => ({ ...d, reasons: toggleReason(d.reasons, r.value) }))}
                      className={`text-xs px-2.5 py-1 rounded-md border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                value={editDraft.notes}
                onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Better fit</label>
              <textarea
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                value={editDraft.better_fit_note}
                onChange={e => setEditDraft(d => ({ ...d, better_fit_note: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recommended action</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ACTIONS.map(a => (
                  <button
                    key={a.value} type="button"
                    onClick={() => setEditDraft(d => ({ ...d, recommended_action: d.recommended_action === a.value ? null : a.value }))}
                    className={`text-xs px-2.5 py-1 rounded-md border ${editDraft.recommended_action === a.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button onClick={onSaveEdit}>Save changes</Button>
            </div>
          </div>
        )}

        {expanded && isResolving && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <label className="text-xs font-medium text-muted-foreground">Resolution outcome</label>
            <Input
              value={resolveOutcome}
              onChange={e => setResolveOutcome(e.target.value)}
              placeholder="e.g. Settled in; Re-placed in Forum X; Left chapter"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onResolveCancel}>Cancel</Button>
              <Button onClick={onResolveConfirm}>Resolve</Button>
            </div>
          </div>
        )}

        {expanded && !isEditing && !isResolving && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
            {open && (
              <>
                <Button size="sm" variant="ghost" onClick={onTouchReviewed}>
                  <Clock className="h-3.5 w-3.5" />
                  Mark reviewed
                </Button>
                <Button size="sm" variant="ghost" onClick={onStartEdit}>
                  <ScrollText className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={onResolveStart}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve
                </Button>
              </>
            )}
            {!open && (
              <Button size="sm" variant="ghost" onClick={onReopen}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </Button>
            )}
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-rose-600 hover:text-rose-700">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
