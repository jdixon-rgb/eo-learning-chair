import { useMemo, useState } from 'react'
import {
  Activity, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Megaphone, ScrollText, Users2, Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBoardStore } from '@/lib/boardStore'
import { useForumStore } from '@/lib/forumStore'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { useAuth } from '@/lib/auth'
import PageHeader from '@/lib/pageHeader'

const LIFECYCLE_STAGES = [
  { value: 'forming', label: 'Forming', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'storming', label: 'Storming', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'norming', label: 'Norming', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'performing', label: 'Performing', tone: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'adjourning', label: 'Adjourning', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
]

function lifecycleTone(stage) {
  return LIFECYCLE_STAGES.find(s => s.value === stage)?.tone
    ?? 'bg-muted text-muted-foreground border-border'
}

// Tri-state checklist toggle: null (unset) → true (yes) → false (no) → null
function TriToggle({ value, onChange, label }) {
  const next = value === null || value === undefined ? true : value === true ? false : null
  const tone =
    value === true ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
    : value === false ? 'bg-rose-50 text-rose-700 border-rose-300'
    : 'bg-muted text-muted-foreground border-border'
  const text = value === true ? 'Yes' : value === false ? 'No' : 'Not set'
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={`text-xs px-2 py-1 rounded-md border ${tone} hover:opacity-90`}
      aria-label={`${label}: ${text}`}
    >
      {text}
    </button>
  )
}

function fyShortLabel(fy) {
  // "FY2026" → "'26"
  const m = /(\d{4})/.exec(fy || '')
  return m ? `'${m[1].slice(2)}` : fy || ''
}

export default function ForumHealthDashboard() {
  const { activeFiscalYear } = useFiscalYear()
  const { forums, chapterMembers } = useBoardStore()
  const {
    healthAssessments, upsertHealthAssessment,
    forumRoles, forumHistory, constitutions, constitutionVersions,
  } = useForumStore()
  const { user, profile } = useAuth()
  const [expanded, setExpanded] = useState(() => new Set())

  const myMemberId = useMemo(() => {
    const email = user?.email || profile?.email
    if (!email) return null
    const m = chapterMembers.find(
      x => (x.email || '').toLowerCase() === email.toLowerCase()
    )
    return m?.id ?? null
  }, [chapterMembers, user, profile])

  const activeForums = useMemo(
    () => forums.filter(f => f.is_active).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [forums]
  )

  // Index assessments by forum_id for the active FY (or "" if no FY yet)
  const assessmentByForum = useMemo(() => {
    const m = new Map()
    for (const a of healthAssessments) {
      if (a.fiscal_year === activeFiscalYear) m.set(a.forum_id, a)
    }
    return m
  }, [healthAssessments, activeFiscalYear])

  function rowsForForum(forum) {
    const a = assessmentByForum.get(forum.id) ?? null
    // Membership: members currently assigned to this forum (name-keyed in
    // chapter_members), minus history of departures recorded against this forum.
    const currentMembers = chapterMembers.filter(
      m => (m.forum || '').toLowerCase() === forum.name.toLowerCase() && m.status === 'active'
    ).length
    const departures = forumHistory.filter(h => h.forum_id === forum.id).length

    // Constitution: any adopted version on this forum's constitution
    const constitution = constitutions.find(c => c.forum_id === forum.id)
    const adoptedVersion = constitution
      ? constitutionVersions.find(
          v => v.constitution_id === constitution.id && v.status === 'adopted'
        )
      : null

    // Role coverage this FY
    const rolesThisFy = forumRoles.filter(
      r => r.forum_id === forum.id && r.fiscal_year === activeFiscalYear
    ).length

    return { a, currentMembers, departures, adoptedVersion, rolesThisFy }
  }

  function toggleExpanded(forumId) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(forumId)) next.delete(forumId)
      else next.add(forumId)
      return next
    })
  }

  function patch(forumId, fields) {
    upsertHealthAssessment(forumId, activeFiscalYear, fields, myMemberId)
  }

  const summary = useMemo(() => {
    let assessed = 0, attention = 0
    for (const f of activeForums) {
      const a = assessmentByForum.get(f.id)
      if (a) assessed++
      const stage = a?.lifecycle_stage
      const concerns = [
        stage === 'storming' || stage === 'adjourning',
        a?.constitution_reviewed === false,
        a?.one_pager_complete === false,
        a?.roles_assigned === false,
      ].filter(Boolean).length
      if (concerns >= 2) attention++
    }
    return { total: activeForums.length, assessed, attention }
  }, [activeForums, assessmentByForum])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forum Health"
        subtitle={`Per-forum health for ${activeFiscalYear || 'this year'} — checklist + handoff narrative.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          icon={Users2} label="Active forums" value={summary.total}
          tone="text-foreground"
        />
        <SummaryTile
          icon={ClipboardList} label={`Assessed ${fyShortLabel(activeFiscalYear)}`} value={summary.assessed}
          tone="text-emerald-700"
        />
        <SummaryTile
          icon={AlertCircle} label="Need attention" value={summary.attention}
          tone={summary.attention > 0 ? 'text-rose-700' : 'text-muted-foreground'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/forum-health/comms"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Megaphone className="h-4 w-4" />
          Moderator Comms
        </Link>
        <Link
          to="/board/forums"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Activity className="h-4 w-4" />
          Forums Admin
        </Link>
      </div>

      {activeForums.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          No active forums yet. Add forums in <Link to="/board/forums" className="text-primary hover:underline">Forums Admin</Link> to start tracking health.
        </div>
      ) : (
        <div className="space-y-3">
          {activeForums.map(forum => {
            const { a, currentMembers, departures, adoptedVersion, rolesThisFy } = rowsForForum(forum)
            const isOpen = expanded.has(forum.id)
            const stage = a?.lifecycle_stage ?? null

            return (
              <div key={forum.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpanded(forum.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{forum.name}</div>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${lifecycleTone(stage)}`}>
                        {stage ? LIFECYCLE_STAGES.find(s => s.value === stage)?.label : 'No stage set'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Mod: {forum.moderator_name || '—'}</span>
                      <span>{currentMembers} member{currentMembers === 1 ? '' : 's'}</span>
                      {departures > 0 && (
                        <span className="text-rose-600">−{departures} historic departure{departures === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <DerivedChip
                      ok={!!adoptedVersion}
                      label={adoptedVersion ? `Constitution v${adoptedVersion.version_number}` : 'No constitution'}
                    />
                    <DerivedChip
                      ok={rolesThisFy > 0}
                      label={`${rolesThisFy} role${rolesThisFy === 1 ? '' : 's'} ${fyShortLabel(activeFiscalYear)}`}
                    />
                  </div>

                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t px-5 py-5 space-y-5 bg-muted/10">
                    <section>
                      <SectionLabel>Lifecycle stage (Tuckman)</SectionLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {LIFECYCLE_STAGES.map(s => {
                          const selected = stage === s.value
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => patch(forum.id, { lifecycle_stage: selected ? null : s.value })}
                              className={`text-xs px-2.5 py-1 rounded-md border ${selected ? s.tone : 'bg-background text-foreground border-border hover:bg-muted'}`}
                            >
                              {s.label}
                            </button>
                          )
                        })}
                      </div>
                      <textarea
                        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[44px]"
                        placeholder="Why this stage? (optional)"
                        value={a?.lifecycle_note ?? ''}
                        onChange={e => patch(forum.id, { lifecycle_note: e.target.value })}
                      />
                    </section>

                    <section className="space-y-3">
                      <SectionLabel>Year checklist</SectionLabel>
                      <ChecklistRow
                        title="Constitution reviewed this year"
                        hint={adoptedVersion ? `Latest adopted: v${adoptedVersion.version_number}` : 'No adopted constitution yet'}
                        value={a?.constitution_reviewed ?? null}
                        note={a?.constitution_review_note ?? ''}
                        onValueChange={v => patch(forum.id, { constitution_reviewed: v })}
                        onNoteChange={n => patch(forum.id, { constitution_review_note: n })}
                      />
                      <ChecklistRow
                        title="One-pager complete"
                        hint="Forum's purpose / norms one-pager is on file"
                        value={a?.one_pager_complete ?? null}
                        note={a?.one_pager_note ?? ''}
                        onValueChange={v => patch(forum.id, { one_pager_complete: v })}
                        onNoteChange={n => patch(forum.id, { one_pager_note: n })}
                      />
                      <ChecklistRow
                        title="Roles assigned"
                        hint={`${rolesThisFy} role${rolesThisFy === 1 ? '' : 's'} on file for ${activeFiscalYear}`}
                        value={a?.roles_assigned ?? null}
                        note={a?.roles_note ?? ''}
                        onValueChange={v => patch(forum.id, { roles_assigned: v })}
                        onNoteChange={n => patch(forum.id, { roles_note: n })}
                      />
                    </section>

                    <section>
                      <SectionLabel>
                        <ScrollText className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                        Chair notes ({fyShortLabel(activeFiscalYear)})
                      </SectionLabel>
                      <textarea
                        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Working notes — what you're tracking, who's wavering, what to bring up at moderator meeting…"
                        value={a?.chair_notes ?? ''}
                        onChange={e => patch(forum.id, { chair_notes: e.target.value })}
                      />
                    </section>

                    <section>
                      <SectionLabel>
                        <Sparkles className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
                        Handoff narrative for next chair
                      </SectionLabel>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        The gut-feel writeup the next Forum Health Chair will read first.
                        Lifecycle stage, what's working, who's at risk, what you'd watch.
                      </p>
                      <textarea
                        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]"
                        placeholder="If I were handing this forum to someone tomorrow, I'd tell them…"
                        value={a?.handoff_narrative ?? ''}
                        onChange={e => patch(forum.id, { handoff_narrative: e.target.value })}
                      />
                    </section>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, tone }) {
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

function DerivedChip({ ok, label }) {
  const tone = ok
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${tone}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  )
}

function SectionLabel({ children }) {
  return <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>
}

function ChecklistRow({ title, hint, value, note, onValueChange, onNoteChange }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <TriToggle value={value} onChange={onValueChange} label={title} />
      </div>
      <textarea
        className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 text-xs min-h-[36px]"
        placeholder="Note (optional)"
        value={note}
        onChange={e => onNoteChange(e.target.value)}
      />
    </div>
  )
}
