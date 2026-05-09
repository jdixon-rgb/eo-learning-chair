import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useBoardStore } from '@/lib/boardStore'
import { useForumStore } from '@/lib/forumStore'
import { useStore } from '@/lib/store'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { isStaging } from '@/lib/env'
import { loadCurrentMember, loadParkingLot, createParkingLotEntry, updateParkingLotEntry, deleteParkingLotEntry } from '@/lib/reflectionsStore'
import { lazy, Suspense } from 'react'
import {
  Pin, Calendar, Users, FileText, BookOpen, History, Handshake,
  Plus, Trash2, Save, X, Star, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Upload, ClipboardList,
} from 'lucide-react'

const ReflectionsPage = lazy(() => import('./ReflectionsPage'))

const FORUM_ROLE_LABELS = {
  moderator: 'Moderator',
  moderator_elect: 'Moderator Elect',
  moderator_elect_elect: 'Moderator Elect-Elect',
  timer: 'Timer',
  technology: 'Technology',
  retreat_planner: 'Retreat Planner',
  social: 'Social',
}

const FORUM_ROLE_ORDER = ['moderator', 'moderator_elect', 'moderator_elect_elect', 'timer', 'technology', 'retreat_planner', 'social']

const EVENT_TYPE_LABELS = {
  meeting: 'Meeting',
  retreat: 'Retreat',
  sap_visit: 'SAP Visit',
  social: 'Social',
  other: 'Other',
}

export default function ForumHomePage() {
  const { user, profile, isAdmin, isSuperAdmin, viewAsRole } = useAuth()
  const { activeChapter } = useChapter()
  const { chapterMembers, forums, loading: boardLoading } = useBoardStore()
  const { forumRoles, forumCalendar, forumDocs, sapInterest, sapRatings, forumHistory,
    agendas, agendaItems,
    addForumRole, updateForumRole, deleteForumRole,
    addForumCalEvent, updateForumCalEvent, deleteForumCalEvent,
    addForumDoc, deleteForumDoc,
    toggleSapInterest, upsertSapRating,
    addHistoryMember, deleteHistoryMember,
    addAgenda, updateAgenda, deleteAgenda,
    addAgendaItem, updateAgendaItem, deleteAgendaItem,
    constitutions, constitutionVersions, constitutionRatifications,
    createConstitutionDraft, proposeAmendment, updateConstitutionVersion,
    proposeConstitutionVersion, adoptConstitutionVersion, deleteConstitutionVersion,
    ratifyConstitutionVersion,
  } = useForumStore()
  const { events: chapterEvents, saps } = useStore()
  const { activeFiscalYear } = useFiscalYear()

  const email = user?.email || profile?.email
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  // Tab can be deep-linked from the sidebar Moderator section
  // (e.g. /portal/forum?tab=agenda jumps straight to the agenda tab).
  // Falls back to 'parking' for any unknown / missing value.
  const validTabs = ['parking', 'tools', 'agenda', 'calendar', 'constitution', 'partners', 'members', 'history']
  const initialTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'parking'
  const [tab, setTabState] = useState(initialTab)
  // Keep ?tab= in sync when the user clicks a tab so refresh / share
  // preserves the intended view.
  const setTab = (next) => {
    setTabState(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'parking') params.delete('tab'); else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }
  const [parkingLot, setParkingLot] = useState([])
  const [showAddParkingLot, setShowAddParkingLot] = useState(false)
  const [activeTool, setActiveTool] = useState(null) // null = tools list, 'reflections' = inline reflections
  const [pageError, setPageError] = useState(null)
  const [isSynthetic, setIsSynthetic] = useState(false)

  // STAGING-ONLY synthetic-member fallback. Hard-gated on `isStaging`
  // — production code paths are NEVER reached. The synthetic identity
  // lets a super-admin / role-switcher preview member-side surfaces
  // (Forum, Reflections, Lifeline) without owning a real
  // chapter_members row. Reads work because RLS lets super-admins
  // through; writes that depend on a real member.id will still fail
  // (intentional — preview ≠ acting on someone's behalf).
  //
  // Why not on prod: the privacy rule is sacred — previewing a role
  // must NEVER expose anyone else's private content. A synthetic
  // identity in prod would be either confusing (real-looking but
  // fake) or risky (collides with someone's real data). Staging has
  // no real members worth protecting, so synthetic is safe there.
  function buildStagingSynthetic() {
    if (!isStaging) return null
    if (!activeChapter?.id) return null
    if (!(isSuperAdmin || viewAsRole === 'moderator' || viewAsRole === 'member')) return null
    // Prefer a real active forum so the preview surfaces real test
    // data (roles, calendar entries, agendas) when it exists. If the
    // chapter has no forums, fall back to a fictitious name —
    // ForumHomePage's `effectiveForum` already handles unknown
    // forum names gracefully (renders the shell, just with empty
    // data sections). Either way we always produce a non-empty
    // forum string so the "You're not in a forum yet" gate doesn't
    // trigger.
    const firstForum = forums.find(f => f.is_active)
    const forumName = firstForum?.name || 'Preview Forum'
    return {
      id: null, // intentionally null — flags writes that need a real row
      chapter_id: activeChapter.id,
      first_name: profile?.full_name?.split(' ')[0] || 'Preview',
      last_name: '(staging)',
      name: `${profile?.full_name || 'Preview'} (staging preview)`,
      email: email,
      forum: forumName,
      __synthetic: true,
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const { data: m } = await loadCurrentMember(email)
      if (cancelled) return
      let resolved = m
      if (!resolved) {
        const synthetic = buildStagingSynthetic()
        if (synthetic) {
          resolved = synthetic
          setIsSynthetic(true)
        }
      } else {
        setIsSynthetic(false)
      }
      setMember(resolved)
      if (resolved?.forum && resolved?.chapter_id && resolved.id) {
        // Skip parking-lot load for synthetic members (no member.id =
        // RLS would reject anyway, and there's nothing for them to load).
        const { data } = await loadParkingLot(resolved.chapter_id, resolved.forum)
        if (!cancelled) setParkingLot(data)
      }
      setLoading(false)
    }
    if (email) init()
    return () => { cancelled = true }
    // activeChapter, forums, viewAsRole, isSuperAdmin all feed the
    // synthetic builder — re-run when they change so the fallback
    // can attach as soon as the chapter+forum data lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, activeChapter?.id, forums.length, viewAsRole, isSuperAdmin])

  async function refreshParkingLot() {
    if (!member?.chapter_id || !member?.forum) return
    const { data } = await loadParkingLot(member.chapter_id, member.forum)
    setParkingLot(data)
  }

  async function handleAddParkingLot({ name, importance, urgency }) {
    if (!member?.id) return
    const { error } = await createParkingLotEntry({
      chapter_id: member.chapter_id,
      forum: member.forum,
      author_member_id: member.id,
      name, importance, urgency,
    })
    if (error) {
      const msg = error.message || error.details || JSON.stringify(error)
      console.error('[parking_lot:insert]', error)
      setPageError(`Could not add parking lot item: ${msg}`)
      return
    }
    setPageError(null)
    refreshParkingLot()
    setShowAddParkingLot(false)
  }

  // Find the forum record
  const forum = useMemo(() => {
    if (!member?.forum) return null
    return forums.find(f => f.name === member.forum && f.is_active) || null
  }, [forums, member])

  // Forum members
  const forumMembers = useMemo(() => {
    if (!member?.forum) return []
    return chapterMembers.filter(cm => cm.forum === member.forum && cm.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [chapterMembers, member])

  const memberById = useMemo(() => {
    const m = new Map()
    chapterMembers.forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  // Use the forums table record if it exists, otherwise create a minimal fallback from the member's forum name
  const effectiveForum = forum || (member?.forum ? { id: null, name: member.forum, is_active: true, founded_year: '' } : null)

  // Is current user the moderator?
  const isModerator = useMemo(() => {
    if (isAdmin || isSuperAdmin) return true
    if (!member || !effectiveForum?.id) return false
    return forumRoles.some(r => r.forum_id === effectiveForum.id && r.chapter_member_id === member.id && r.role === 'moderator')
  }, [member, effectiveForum, forumRoles, isAdmin, isSuperAdmin])

  // Forum-scoped data
  const fid = effectiveForum?.id
  const myForumRoles = useMemo(() => fid ? forumRoles.filter(r => r.forum_id === fid) : [], [forumRoles, fid])
  const myForumCal = useMemo(() => fid ? forumCalendar.filter(e => e.forum_id === fid).sort((a, b) => a.event_date?.localeCompare(b.event_date)) : [], [forumCalendar, fid])
  const myForumDocs = useMemo(() => fid ? forumDocs.filter(d => d.forum_id === fid) : [], [forumDocs, fid])
  const myForumHistory = useMemo(() => fid ? forumHistory.filter(h => h.forum_id === fid) : [], [forumHistory, fid])
  const myForumInterest = useMemo(() => fid ? sapInterest.filter(i => i.forum_id === fid) : [], [sapInterest, fid])
  const myForumRatings = useMemo(() => fid ? sapRatings.filter(r => r.forum_id === fid) : [], [sapRatings, fid])

  if (loading || boardLoading) return <div className="text-muted-foreground text-center py-12">Loading…</div>

  if (!member) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Member profile not found</h2>
        <p className="text-muted-foreground text-sm mt-2">Reach out to your chapter admin to get set up.</p>
      </div>
    )
  }

  if (!member.forum) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">You're not in a forum yet</h2>
        <p className="text-muted-foreground text-sm mt-2">Talk to your Forum Placement Chair — an incredible journey is waiting for you.</p>
      </div>
    )
  }

  const tabs = [
    { key: 'parking', label: 'Parking Lot', icon: Pin },
    { key: 'tools', label: 'Tools', icon: BookOpen },
    { key: 'agenda', label: 'Agenda', icon: ClipboardList },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'constitution', label: 'Constitution', icon: FileText },
    { key: 'partners', label: 'SAPs', icon: Handshake },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'history', label: 'History', icon: History },
  ]

  return (
    <div className="space-y-6">
      {isSynthetic && (
        <div className="rounded-lg border border-staging/40 bg-staging/10 px-4 py-2.5 text-xs text-staging">
          <strong className="font-semibold">Staging preview.</strong>{' '}
          You don't have a real chapter-member record, so this view is using a
          synthetic identity tied to <strong>{member.forum || 'no forum'}</strong>{' '}
          in <strong>{activeChapter?.name}</strong>. Reads work; writes that need
          a real member row will fail. This banner only appears on staging.
        </div>
      )}
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl font-bold">{member.forum}</h1>
        <button
          type="button"
          onClick={() => setTab('members')}
          className="text-muted-foreground text-sm mt-1 hover:text-foreground/90 transition-colors cursor-pointer"
        >
          {forumMembers.length} members{effectiveForum.founded_year ? ` · Founded ${effectiveForum.founded_year}` : ''}
        </button>
      </div>

      {pageError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-red-200/70 hover:text-red-100 font-medium text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex flex-wrap justify-center gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'calendar' && (
        <CalendarTab
          forum={effectiveForum}
          events={myForumCal}
          isModerator={isModerator}
          onAdd={addForumCalEvent}
          onUpdate={updateForumCalEvent}
          onDelete={deleteForumCalEvent}
        />
      )}

      {tab === 'parking' && (
        <ParkingLotTab
          entries={parkingLot}
          currentMemberId={member.id}
          chapterMembers={chapterMembers}
          currentForum={member.forum}
          onAddNew={() => setShowAddParkingLot(true)}
          onUpdate={async (id, patch) => {
            const { error } = await updateParkingLotEntry(id, patch)
            if (error) {
              const msg = error.message || error.details || JSON.stringify(error)
              console.error('[parking_lot:update]', error)
              setPageError(`Could not update parking lot item: ${msg}`)
              return
            }
            setPageError(null)
            refreshParkingLot()
          }}
          onDelete={async (id) => {
            const { error } = await deleteParkingLotEntry(id)
            if (error) {
              const msg = error.message || error.details || JSON.stringify(error)
              console.error('[parking_lot:delete]', error)
              setPageError(`Could not delete parking lot item: ${msg}`)
              return
            }
            setPageError(null)
            refreshParkingLot()
          }}
        />
      )}

      {showAddParkingLot && (
        <ParkingLotAddModal
          onClose={() => setShowAddParkingLot(false)}
          onConfirm={handleAddParkingLot}
        />
      )}

      {tab === 'agenda' && (
        <AgendaTab
          forum={effectiveForum}
          agendas={agendas.filter(a => a.forum_id === effectiveForum?.id)}
          agendaItems={agendaItems}
          isModerator={isModerator}
          memberId={member.id}
          onAddAgenda={addAgenda}
          onUpdateAgenda={updateAgenda}
          onDeleteAgenda={deleteAgenda}
          onAddItem={addAgendaItem}
          onUpdateItem={updateAgendaItem}
          onDeleteItem={deleteAgendaItem}
        />
      )}

      {tab === 'tools' && (
        activeTool === 'reflections' ? (
          <div className="space-y-3">
            <button
              onClick={() => setActiveTool(null)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Tools
            </button>
            <Suspense fallback={<div className="text-muted-foreground text-center py-8">Loading Reflections…</div>}>
              <ReflectionsPage />
            </Suspense>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground/70">Tools your forum uses in meetings. More coming soon.</p>
            <button
              onClick={() => setActiveTool('reflections')}
              className="w-full text-left rounded-xl border border-border bg-muted/30 p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Reflections</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Private journaling with three templates — Modern, Hesse Classic, and EO Standard.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-auto" />
              </div>
            </button>
            <Link
              to="/portal/lifeline"
              className="block rounded-xl border border-border bg-muted/30 p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Lifeline</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Chart your journey — plot the highs and lows that shaped who you are.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-auto" />
              </div>
            </Link>
          </div>
        )
      )}

      {tab === 'constitution' && (
        <ConstitutionTab
          forum={effectiveForum}
          memberId={member.id}
          forumMembers={forumMembers}
          isModerator={isModerator}
          constitutions={constitutions}
          versions={constitutionVersions}
          ratifications={constitutionRatifications}
          onCreateDraft={() => createConstitutionDraft(effectiveForum?.id, member.id)}
          onProposeAmendment={() => proposeAmendment(effectiveForum?.id, member.id)}
          onUpdateVersion={updateConstitutionVersion}
          onProposeVersion={proposeConstitutionVersion}
          onAdoptVersion={adoptConstitutionVersion}
          onDeleteVersion={deleteConstitutionVersion}
          onRatify={(versionId) => ratifyConstitutionVersion(versionId, member.id)}
        />
      )}

      {tab === 'partners' && (
        <PartnersTab
          forum={effectiveForum}
          saps={saps}
          interest={myForumInterest}
          memberId={member.id}
          forumMemberCount={forumMembers.length}
          onToggleInterest={(sapId, current) => toggleSapInterest(sapId, member.id, effectiveForum.id, current)}
        />
      )}

      {tab === 'members' && (
        <MembersTab
          forumMembers={forumMembers}
          currentMemberId={member.id}
          forumId={effectiveForum.id}
          roles={myForumRoles}
          isModerator={isModerator}
          onAddRole={addForumRole}
          onDeleteRole={deleteForumRole}
          activeFiscalYear={activeFiscalYear}
        />
      )}

      {tab === 'history' && (
        <HistoryTab
          forum={effectiveForum}
          history={myForumHistory}
          roles={myForumRoles}
          memberById={memberById}
          isModerator={isModerator}
          onAddHistory={addHistoryMember}
          onDeleteHistory={deleteHistoryMember}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Members Tab — visible to every forum mate; moderators can assign
// and remove forum roles inline per member.
// ────────────────────────────────────────────────────────────
function MembersTab({ forumMembers, currentMemberId, forumId, roles, isModerator, onAddRole, onDeleteRole, activeFiscalYear }) {
  const [addingFor, setAddingFor] = useState(null)
  const [addRole, setAddRole] = useState('timer')
  const [addFY, setAddFY] = useState(activeFiscalYear || '')

  const rolesByMember = useMemo(() => {
    const map = new Map()
    ;(roles || []).forEach(r => {
      const arr = map.get(r.chapter_member_id) || []
      arr.push(r)
      map.set(r.chapter_member_id, arr)
    })
    map.forEach(arr => {
      arr.sort((a, b) => {
        const fy = (b.fiscal_year || '').localeCompare(a.fiscal_year || '')
        if (fy !== 0) return fy
        return FORUM_ROLE_ORDER.indexOf(a.role) - FORUM_ROLE_ORDER.indexOf(b.role)
      })
    })
    return map
  }, [roles])

  const startAdd = (memberId) => {
    setAddingFor(memberId)
    setAddRole('timer')
    setAddFY(activeFiscalYear || '')
  }

  const handleAdd = () => {
    if (!addingFor || !addRole || !addFY) return
    onAddRole({ forum_id: forumId, chapter_member_id: addingFor, role: addRole, fiscal_year: addFY })
    setAddingFor(null)
  }

  if (!forumMembers || forumMembers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground/70 text-sm">
        No other members in this forum yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground/70 px-1">
        Your forum mates{isModerator ? ' — tap + Role to assign, × to remove' : ''}.
      </p>
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-white/5">
        {forumMembers.map(m => {
          const isMe = m.id === currentMemberId
          const memberRoles = rolesByMember.get(m.id) || []
          return (
            <div key={m.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{m.name || 'Unknown'}</span>
                    {isMe && (
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">You</span>
                    )}
                  </div>
                  {m.company && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{m.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/70 shrink-0">
                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      className="hover:text-foreground/90 transition-colors hidden sm:inline"
                      title={m.email}
                    >
                      Email
                    </a>
                  )}
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      className="hover:text-foreground/90 transition-colors"
                      title={m.phone}
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>

              {(memberRoles.length > 0 || isModerator) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {memberRoles.map(r => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground/80 bg-muted/30 px-2 py-0.5 rounded-full"
                    >
                      {FORUM_ROLE_LABELS[r.role] || r.role}
                      {r.fiscal_year && <span className="text-muted-foreground/50">· {r.fiscal_year}</span>}
                      {isModerator && (
                        <button
                          onClick={() => onDeleteRole(r.id)}
                          className="text-muted-foreground/60 hover:text-red-400"
                          title="Remove role"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {isModerator && addingFor !== m.id && (
                    <button
                      onClick={() => startAdd(m.id)}
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 hover:text-foreground bg-muted/20 hover:bg-muted/30 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Role
                    </button>
                  )}
                </div>
              )}

              {isModerator && addingFor === m.id && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select
                    value={addRole}
                    onChange={e => setAddRole(e.target.value)}
                    className="bg-muted/30 border border-border rounded px-2 py-1 text-xs text-foreground"
                  >
                    {FORUM_ROLE_ORDER.map(r => <option key={r} value={r}>{FORUM_ROLE_LABELS[r]}</option>)}
                  </select>
                  <input
                    type="text"
                    value={addFY}
                    onChange={e => setAddFY(e.target.value)}
                    placeholder="2025-2026"
                    className="bg-muted/30 border border-border rounded px-2 py-1 text-xs text-foreground placeholder-white/30 w-28"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!addRole || !addFY}
                    className="px-2 py-1 rounded text-xs bg-primary text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingFor(null)}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Calendar Tab
// ────────────────────────────────────────────────────────────
// Derive EO fiscal year ("FY2027") from a JS Date.
// FY runs Aug 1–Jul 31; the FY label uses the year that contains the
// July end-date. (e.g. Aug 2026 → FY2027; Jul 2027 → FY2027.)
function deriveFiscalYear(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const month = d.getMonth() // 0-indexed; Jan=0, Aug=7
  const year = d.getFullYear()
  return `FY${month >= 7 ? year + 1 : year}`
}

// Convert a Date to the local-time string a <input type="datetime-local"> wants.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtEventTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function CalendarTab({ forum, events, isModerator, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false)
  // Empty form: title + type + start/end datetime + location.
  // Fiscal year is auto-derived from starts_at; we don't ask the user
  // to type it.
  const emptyForm = { title: '', event_type: 'meeting', starts_at: '', ends_at: '', location: '' }
  const [form, setForm] = useState(emptyForm)

  const handleAdd = () => {
    if (!form.title || !form.starts_at) return
    const startsIso = new Date(form.starts_at).toISOString()
    const endsIso = form.ends_at ? new Date(form.ends_at).toISOString() : null
    onAdd({
      forum_id: forum.id,
      title: form.title,
      event_type: form.event_type,
      // Keep event_date populated for backward compatibility with code
      // that reads it directly. Same source of truth as starts_at.
      event_date: form.starts_at.slice(0, 10),
      starts_at: startsIso,
      ends_at: endsIso,
      location: form.location,
      fiscal_year: deriveFiscalYear(form.starts_at),
    })
    setShowAdd(false)
    setForm(emptyForm)
  }

  // Forum events only — sort by starts_at when present, else event_date.
  const allEvents = useMemo(() => {
    return events.map(e => ({ ...e, source: 'forum' }))
      .sort((a, b) => {
        const ka = a.starts_at || a.event_date || ''
        const kb = b.starts_at || b.event_date || ''
        return ka.localeCompare(kb)
      })
  }, [events])

  return (
    <div className="space-y-4">
      {isModerator && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/90">
            <Plus className="h-3.5 w-3.5" /> Add event
          </button>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Q3 retreat" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Type</label>
            <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-card">{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Starts</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value, ends_at: f.ends_at || e.target.value }))} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Ends</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} min={form.starts_at} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Location <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></label>
            <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue, address, or virtual link" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title || !form.starts_at} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {allEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 text-sm">No events scheduled.</div>
      ) : (
        <div className="space-y-2">
          {allEvents.map(e => {
            // Prefer starts_at/ends_at; fall back to event_date for legacy rows.
            const startLabel = e.starts_at ? fmtEventTime(e.starts_at) : e.event_date
            const endLabel = e.ends_at ? fmtEventTime(e.ends_at) : ''
            const range = endLabel && endLabel !== startLabel ? `${startLabel} – ${endLabel}` : startLabel
            return (
              <div key={e.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{e.title}</span>
                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground/70">
                      {EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{range}{e.location ? ` · ${e.location}` : ''}</p>
                </div>
                {isModerator && (
                  <button onClick={() => onDelete(e.id)} className="text-muted-foreground/60 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Constitution Tab — digital, versioned, ratifiable
// ────────────────────────────────────────────────────────────
function ConstitutionTab({
  forum, memberId, forumMembers, isModerator,
  constitutions, versions, ratifications,
  onCreateDraft, onProposeAmendment, onUpdateVersion,
  onProposeVersion, onAdoptVersion, onDeleteVersion, onRatify,
}) {
  const constitution = useMemo(
    () => constitutions.find(c => c.forum_id === forum?.id),
    [constitutions, forum]
  )
  const forumVersions = useMemo(
    () => (constitution ? versions.filter(v => v.constitution_id === constitution.id) : []),
    [versions, constitution]
  )
  const draft = useMemo(() => forumVersions.find(v => v.status === 'draft'), [forumVersions])
  const proposed = useMemo(() => forumVersions.find(v => v.status === 'proposed'), [forumVersions])
  const adopted = useMemo(() => forumVersions.find(v => v.status === 'adopted'), [forumVersions])

  // Prefer showing the proposed version (needs attention), else draft (moderator editing), else adopted
  const [viewing, setViewing] = useState('current') // 'current' | 'draft' | 'proposed'
  const targetVersion = viewing === 'draft' ? draft : viewing === 'proposed' ? proposed : (adopted || proposed || draft)

  // Empty state: no constitution yet
  if (!constitution || forumVersions.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No constitution yet for this forum.</p>
        {isModerator ? (
          <button onClick={onCreateDraft} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" /> Create draft
          </button>
        ) : (
          <p className="text-xs text-muted-foreground/60">Your moderator hasn't started one yet.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Version tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {adopted && (
          <VersionPill
            label={`Adopted · v${adopted.version_number}`}
            active={viewing === 'current' && targetVersion?.id === adopted.id}
            color="emerald"
            onClick={() => setViewing('current')}
          />
        )}
        {proposed && (
          <VersionPill
            label={`Proposed · v${proposed.version_number}`}
            active={viewing === 'proposed' || (!adopted && targetVersion?.id === proposed.id)}
            color="amber"
            onClick={() => setViewing('proposed')}
          />
        )}
        {draft && (
          <VersionPill
            label={`Draft · v${draft.version_number}`}
            active={viewing === 'draft' || (!adopted && !proposed && targetVersion?.id === draft.id)}
            color="sky"
            onClick={() => setViewing('draft')}
          />
        )}
        <div className="flex-1" />
        {isModerator && adopted && !draft && !proposed && (
          <button
            onClick={onProposeAmendment}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/90"
          >
            <Plus className="h-3.5 w-3.5" /> Propose amendment
          </button>
        )}
      </div>

      {targetVersion && (
        <ConstitutionVersionView
          version={targetVersion}
          isModerator={isModerator}
          memberId={memberId}
          forumMembers={forumMembers}
          ratifications={ratifications.filter(r => r.version_id === targetVersion.id)}
          onUpdate={onUpdateVersion}
          onPropose={onProposeVersion}
          onAdopt={onAdoptVersion}
          onDelete={onDeleteVersion}
          onRatify={onRatify}
        />
      )}
    </div>
  )
}

function VersionPill({ label, active, color, onClick }) {
  const colors = {
    emerald: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
    sky: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  }
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${colors[color]} ${active ? 'ring-2 ring-white/20' : 'opacity-60 hover:opacity-100'}`}
    >
      {label}
    </button>
  )
}

function ConstitutionVersionView({
  version, isModerator, memberId, forumMembers, ratifications,
  onUpdate, onPropose, onAdopt, onDelete, onRatify,
}) {
  const canEdit = isModerator && version.status === 'draft'
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(version.title || '')
  const [preamble, setPreamble] = useState(version.preamble || '')
  const [sections, setSections] = useState(Array.isArray(version.sections) ? version.sections : [])

  // Keep local state in sync when the version prop changes (e.g. switching tabs)
  useEffect(() => {
    setTitle(version.title || '')
    setPreamble(version.preamble || '')
    setSections(Array.isArray(version.sections) ? version.sections : [])
    setEditing(false)
  }, [version.id])

  const handleSave = () => {
    onUpdate(version.id, { title, preamble, sections })
    setEditing(false)
  }

  const handleAddSection = () => {
    setSections(prev => [...prev, { id: crypto.randomUUID(), heading: '', body: '' }])
  }

  const handleUpdateSection = (id, patch) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  const handleDeleteSection = (id) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const handleMoveSection = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    setSections(prev => {
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  // Ratification status
  const hasRatified = ratifications.some(r => r.member_id === memberId)
  const ratifiedIds = new Set(ratifications.map(r => r.member_id))
  const ratifiedCount = forumMembers.filter(m => ratifiedIds.has(m.id)).length
  const total = forumMembers.length
  const allRatified = total > 0 && ratifiedCount >= total

  return (
    <div className="space-y-4">
      {/* Proposed-version ratification banner */}
      {version.status === 'proposed' && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-warm">Ratification required</p>
              <p className="text-xs text-warm/80 mt-1">
                {ratifiedCount} of {total} members have ratified. Unanimous ratification adopts this version.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasRatified ? (
                <button
                  onClick={() => onRatify(version.id)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-amber-950"
                >
                  I ratify this version
                </button>
              ) : (
                <span className="text-xs text-emerald-300 font-semibold">✓ You ratified</span>
              )}
              {isModerator && allRatified && (
                <button
                  onClick={() => onAdopt(version.id)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                >
                  Adopt version
                </button>
              )}
            </div>
          </div>
          {/* Ratification roster */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {forumMembers.map(m => {
              const signed = ratifiedIds.has(m.id)
              return (
                <span
                  key={m.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${signed ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-border bg-muted/30 text-muted-foreground/70'}`}
                  title={signed ? 'Ratified' : 'Not yet ratified'}
                >
                  {signed && '✓ '}{m.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Moderator controls for drafts */}
      {isModerator && version.status === 'draft' && (
        <div className="flex items-center gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/90">
              <FileText className="h-3.5 w-3.5" /> Edit
            </button>
          ) : (
            <>
              <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary hover:bg-primary/90 text-white">
                <Save className="h-3.5 w-3.5" /> Save draft
              </button>
              <button onClick={() => { setTitle(version.title || ''); setPreamble(version.preamble || ''); setSections(Array.isArray(version.sections) ? version.sections : []); setEditing(false) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/80">
                Cancel
              </button>
            </>
          )}
          {!editing && (
            <button
              onClick={() => {
                if (confirm('Propose this draft to the forum for ratification? You will not be able to edit it after this point without starting a new amendment.')) {
                  onPropose(version.id)
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-warm"
            >
              Propose to forum
            </button>
          )}
          {!editing && (
            <button
              onClick={() => {
                if (confirm('Delete this draft? This cannot be undone.')) onDelete(version.id)
              }}
              className="ml-auto text-muted-foreground/60 hover:text-red-400"
              title="Delete draft"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-5">
        {canEdit && editing ? (
          <>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Constitution title"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-base font-semibold text-foreground placeholder:text-muted-foreground"
            />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1 block">Preamble</label>
              <textarea
                value={preamble}
                onChange={e => setPreamble(e.target.value)}
                rows={3}
                placeholder="Opening statement (optional)"
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Sections</label>
                <button onClick={handleAddSection} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Add section
                </button>
              </div>
              {sections.length === 0 && (
                <p className="text-xs text-muted-foreground/60 italic">No sections yet.</p>
              )}
              {sections.map((section, idx) => (
                <div key={section.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/70 font-mono w-6 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={section.heading}
                      onChange={e => handleUpdateSection(section.id, { heading: e.target.value })}
                      placeholder="Section heading"
                      className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground"
                    />
                    <button onClick={() => handleMoveSection(idx, -1)} disabled={idx === 0} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed" title="Move up">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleMoveSection(idx, 1)} disabled={idx === sections.length - 1} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed" title="Move down">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteSection(section.id)} className="text-muted-foreground/40 hover:text-red-400" title="Delete section">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={section.body}
                    onChange={e => handleUpdateSection(section.id, { body: e.target.value })}
                    rows={4}
                    placeholder="Section text..."
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30"
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-foreground">{version.title || 'Forum Constitution'}</h2>
            {version.preamble && (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap italic">{version.preamble}</p>
            )}
            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">No content yet.</p>
            ) : (
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div key={section.id}>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {idx + 1}. {section.heading || <span className="text-muted-foreground/60 italic">Untitled section</span>}
                    </h3>
                    {section.body && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{section.body}</p>}
                  </div>
                ))}
              </div>
            )}
            {version.status === 'adopted' && version.adopted_at && (
              <p className="text-[11px] text-muted-foreground/60 mt-4">Adopted {new Date(version.adopted_at).toLocaleDateString()}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Partners Tab — interest checklist sorted by popularity
// ────────────────────────────────────────────────────────────
function PartnersTab({ forum, saps, interest, memberId, forumMemberCount, onToggleInterest }) {
  const isInterested = (sapId) => interest.some(i => i.sap_id === sapId && i.chapter_member_id === memberId)
  const interestedCount = (sapId) => interest.filter(i => i.sap_id === sapId).length

  // Sort by interest count (most popular first), then alphabetically
  const sapList = useMemo(() => {
    return (saps || [])
      .filter(s => s.status !== 'inactive')
      .map(s => ({ ...s, intCount: interest.filter(i => i.sap_id === s.id).length }))
      .sort((a, b) => b.intCount - a.intCount || (a.company_name || a.name || '').localeCompare(b.company_name || b.name || ''))
  }, [saps, interest])

  const total = forumMemberCount || 10

  if (sapList.length === 0) {
    return <div className="text-center py-12 text-muted-foreground/70 text-sm">No SAP partners found. Partners are managed by the SAP Chair.</div>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/70">
        Check the partners you're interested in hearing from. Your moderator uses this to decide who to invite — the more interest, the better the fit.
      </p>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <tr>
              <th className="text-left px-4 py-3 w-10"></th>
              <th className="text-left px-3 py-3">Partner</th>
              <th className="text-left px-3 py-3 w-24">Tier</th>
              <th className="text-center px-3 py-3 w-32">Interest</th>
            </tr>
          </thead>
          <tbody>
            {sapList.map(sap => {
              const name = sap.company_name || sap.name || 'Unknown'
              const interested = isInterested(sap.id)
              const count = sap.intCount
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <tr key={sap.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleInterest(sap.id, interested)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        interested
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {interested && <span className="text-xs font-bold">✓</span>}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-foreground font-medium">{name}</span>
                  </td>
                  <td className="px-3 py-3">
                    {sap.tier && (
                      <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                        sap.tier === 'Platinum' ? 'bg-amber-500/20 text-amber-400' :
                        sap.tier === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-muted/30 text-muted-foreground/70'
                      }`}>{sap.tier}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{count}/{total}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// History Tab
// ────────────────────────────────────────────────────────────
function HistoryTab({ forum, history, roles, memberById, isModerator, onAddHistory, onDeleteHistory }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ member_name: '', is_founding_member: false, joined_year: '', left_year: '' })

  // Moderator lineage from roles (all fiscal years)
  const moderatorLineage = useMemo(() => {
    return roles
      .filter(r => r.role === 'moderator')
      .sort((a, b) => (a.fiscal_year || '').localeCompare(b.fiscal_year || ''))
      .map(r => ({ ...r, name: memberById.get(r.chapter_member_id)?.name || 'Unknown' }))
  }, [roles, memberById])

  const handleAdd = () => {
    if (!form.member_name) return
    onAddHistory({ forum_id: forum.id, ...form })
    setShowAdd(false)
    setForm({ member_name: '', is_founding_member: false, joined_year: '', left_year: '' })
  }

  return (
    <div className="space-y-6">
      {/* Moderator lineage */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/90 mb-3">Moderator Lineage</h3>
        {moderatorLineage.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">No moderators assigned yet. Add them in the Roles tab.</p>
        ) : (
          <div className="space-y-1">
            {moderatorLineage.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground/60 w-8">#{i + 1}</span>
                <span className="text-sm text-foreground font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground/70">{r.fiscal_year}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground/90">Past Members</h3>
          {isModerator && (
            <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground">
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        {showAdd && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-3 space-y-3">
            <input type="text" value={form.member_name} onChange={e => setForm(f => ({ ...f, member_name: e.target.value }))} placeholder="Member name" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.joined_year} onChange={e => setForm(f => ({ ...f, joined_year: e.target.value }))} placeholder="Joined year" className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30" />
              <input type="text" value={form.left_year} onChange={e => setForm(f => ({ ...f, left_year: e.target.value }))} placeholder="Left year" className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_founding_member} onChange={e => setForm(f => ({ ...f, is_founding_member: e.target.checked }))} />
              Founding member
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-muted-foreground">Cancel</button>
              <button onClick={handleAdd} disabled={!form.member_name} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40">Add</button>
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">No past members recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {history.sort((a, b) => (a.joined_year || '').localeCompare(b.joined_year || '')).map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30">
                <div>
                  <span className="text-sm text-foreground">{h.member_name}</span>
                  {h.is_founding_member && <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Founder</span>}
                  <span className="ml-2 text-xs text-muted-foreground/70">
                    {h.joined_year && h.left_year ? `${h.joined_year}–${h.left_year}` : h.joined_year || h.left_year || ''}
                  </span>
                </div>
                {isModerator && (
                  <button onClick={() => onDeleteHistory(h.id)} className="text-muted-foreground/60 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Agenda Tab
// ────────────────────────────────────────────────────────────
function AgendaTab({ forum, agendas, agendaItems, isModerator, memberId, onAddAgenda, onUpdateAgenda, onDeleteAgenda, onAddItem, onUpdateItem, onDeleteItem }) {
  const [viewingId, setViewingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)

  // Sort by date, newest first
  const sorted = useMemo(() =>
    [...agendas].sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || '')),
  [agendas])

  const viewing = viewingId ? agendas.find(a => a.id === viewingId) : null
  const editing = editingId ? agendas.find(a => a.id === editingId) : null

  // ── Agenda viewer ──
  if (viewing) {
    const items = agendaItems.filter(i => i.agenda_id === viewing.id).sort((a, b) => a.sort_order - b.sort_order)
    const totalMin = items.reduce((s, i) => s + (i.minutes || 0), 0)
    return (
      <div className="space-y-4">
        <button onClick={() => setViewingId(null)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> All agendas
        </button>
        <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-4">
          {viewing.mission && <p className="text-xs text-muted-foreground italic"><strong>Mission:</strong> {viewing.mission}</p>}
          {viewing.forum_values && <p className="text-xs text-muted-foreground"><strong>Values:</strong> {viewing.forum_values}</p>}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Date:</strong> {viewing.meeting_date}</p>
            <p><strong>Time:</strong> {viewing.start_time} – {viewing.end_time}</p>
            {viewing.host && <p><strong>Host / Location:</strong> {viewing.host}{viewing.location ? `, ${viewing.location}` : ''}</p>}
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                <tr>
                  <th className="text-left px-4 py-2">Item</th>
                  <th className="text-center px-3 py-2 w-20">Minutes</th>
                  <th className="text-center px-3 py-2 w-24">Start</th>
                  <th className="text-center px-3 py-2 w-24">End</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2">
                      <span className="text-foreground">{item.title}</span>
                      {item.description && <p className="text-[11px] text-muted-foreground/70 mt-0.5 whitespace-pre-line">{item.description}</p>}
                    </td>
                    <td className="text-center px-3 py-2 text-muted-foreground">{item.minutes}</td>
                    <td className="text-center px-3 py-2 text-muted-foreground">{item.start_time}</td>
                    <td className="text-center px-3 py-2 text-muted-foreground">{item.end_time}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td className="px-4 py-2 text-xs text-muted-foreground font-semibold">Total (Target: {viewing.target_minutes || 270} min)</td>
                  <td className="text-center px-3 py-2 text-foreground font-bold text-xs">{totalMin}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center italic">© {new Date(viewing.meeting_date).getFullYear()} {forum.name} Forum Proprietary and Confidential</p>
        </div>
      </div>
    )
  }

  // ── Agenda editor ──
  if (editing || creating) {
    return (
      <AgendaEditor
        agenda={editing}
        forum={forum}
        items={editing ? agendaItems.filter(i => i.agenda_id === editing.id).sort((a, b) => a.sort_order - b.sort_order) : []}
        memberId={memberId}
        onSaveAgenda={(data) => {
          if (editing) {
            onUpdateAgenda(editing.id, data)
            setEditingId(null)
          } else {
            const row = onAddAgenda({ forum_id: forum.id, ...data })
            setCreating(false)
            setEditingId(row.id)
          }
        }}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        onBack={() => { setEditingId(null); setCreating(false) }}
      />
    )
  }

  // ── Agenda list ──
  return (
    <div className="space-y-4">
      {isModerator && (
        <div className="flex justify-end">
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/90">
            <Plus className="h-3.5 w-3.5" /> New agenda
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 text-sm">No agendas yet.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(a => {
            const statusColors = { draft: 'text-amber-400 bg-amber-500/20', published: 'text-emerald-400 bg-emerald-500/20', archived: 'text-muted-foreground/70 bg-muted/30' }
            return (
              <div key={a.id} className={`rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between ${a.status === 'archived' ? 'opacity-60' : ''}`}>
                <button onClick={() => setViewingId(a.id)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{a.title || a.meeting_date}</span>
                    <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${statusColors[a.status] || ''}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{a.meeting_date} · {a.start_time} – {a.end_time}</p>
                </button>
                {isModerator && (
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button onClick={() => setEditingId(a.id)} className="text-muted-foreground/60 hover:text-foreground p-1" title="Edit"><Save className="h-3.5 w-3.5" /></button>
                    {a.status === 'draft' && (
                      <button onClick={() => onUpdateAgenda(a.id, { status: 'published' })} className="text-muted-foreground/60 hover:text-emerald-400 p-1" title="Publish">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {a.status === 'published' && (
                      <button onClick={() => onUpdateAgenda(a.id, { status: 'archived' })} className="text-muted-foreground/60 hover:text-amber-400 p-1" title="Archive">
                        <History className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {a.status === 'archived' && (
                      <button onClick={() => onUpdateAgenda(a.id, { status: 'published' })} className="text-muted-foreground/60 hover:text-emerald-400 p-1" title="Restore">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => onDeleteAgenda(a.id)} className="text-muted-foreground/60 hover:text-red-400 p-1" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

// ── Time helpers ───────────────────────────────────────────
function parseTime(str) {
  // Parse "12:00 PM" → minutes since midnight
  if (!str) return 0
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ampm = (m[3] || '').toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function formatTime(totalMinutes) {
  // Minutes since midnight → "12:00 PM"
  let h = Math.floor(totalMinutes / 60) % 24
  const min = totalMinutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${String(min).padStart(2, '0')} ${ampm}`
}

function computeItemTimes(items, meetingStartTime) {
  const baseMin = parseTime(meetingStartTime)
  let cursor = baseMin
  return items.map(item => {
    const start = formatTime(cursor)
    cursor += (item.minutes || 0)
    const end = formatTime(cursor)
    return { ...item, start_time: start, end_time: end }
  })
}

// ── Agenda Editor ──────────────────────────────────────────
function AgendaEditor({ agenda, forum, items: initialItems, memberId, onSaveAgenda, onAddItem, onUpdateItem, onDeleteItem, onBack }) {
  const [title, setTitle] = useState(agenda?.title || `${forum.name} Forum Meeting`)
  const [meetingDate, setMeetingDate] = useState(agenda?.meeting_date || '')
  const [startTime, setStartTime] = useState(agenda?.start_time || '12:00 PM')
  const [location, setLocation] = useState(agenda?.location || '')
  const [host, setHost] = useState(agenda?.host || '')
  const [mission, setMission] = useState(agenda?.mission || 'To act as a personal board of directors through a collective commitment to one another. To share, learn, challenge, hold each other accountable, and grow personally and professionally as individuals and as a forum.')
  const [forumValues, setForumValues] = useState(agenda?.forum_values || 'Respectful, Present, Accountable, and Challengeable')
  const [targetMinutes, setTargetMinutes] = useState(agenda?.target_minutes || 270)
  const [status, setStatus] = useState(agenda?.status || 'draft')

  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemMin, setNewItemMin] = useState(10)

  const items = initialItems || []
  const itemsWithTimes = useMemo(() => computeItemTimes(items, startTime), [items, startTime])
  const totalMin = items.reduce((s, i) => s + (i.minutes || 0), 0)
  const endTime = formatTime(parseTime(startTime) + totalMin)

  const handleSave = () => {
    onSaveAgenda({
      title, meeting_date: meetingDate, start_time: startTime, end_time: endTime,
      location, host, mission, forum_values: forumValues,
      target_minutes: targetMinutes, status, created_by: memberId,
    })
  }

  const handleAddItem = () => {
    if (!newItemTitle || !agenda?.id) return
    // Compute this item's times
    const nextStart = parseTime(startTime) + totalMin
    onAddItem({
      agenda_id: agenda.id,
      title: newItemTitle,
      description: newItemDesc,
      minutes: newItemMin,
      start_time: formatTime(nextStart),
      end_time: formatTime(nextStart + newItemMin),
      sort_order: items.length,
    })
    setNewItemTitle('')
    setNewItemDesc('')
    setNewItemMin(10)
  }

  const handleMoveItem = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    // Swap sort_order values
    onUpdateItem(a.id, { sort_order: b.sort_order })
    onUpdateItem(b.id, { sort_order: a.sort_order })
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> All agendas
      </button>
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
        <h3 className="text-base font-semibold">{agenda ? 'Edit Agenda' : 'New Agenda'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Meeting start time</label>
            <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="12:00 PM" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Host</label>
            <input type="text" value={host} onChange={e => setHost(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Mission</label>
            <textarea value={mission} onChange={e => setMission(e.target.value)} rows={2} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Values</label>
            <input type="text" value={forumValues} onChange={e => setForumValues(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target minutes</label>
            <input type="number" value={targetMinutes} onChange={e => setTargetMinutes(Number(e.target.value))} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => setStatus(e.target.value)} className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="draft" className="bg-card">Draft</option>
            <option value="published" className="bg-card">Published</option>
            <option value="archived" className="bg-card">Archived</option>
          </select>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:bg-primary/90">
            {agenda ? 'Save changes' : 'Create agenda'}
          </button>
        </div>
      </div>

      {/* Items editor */}
      {agenda?.id && (
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Agenda Items</h4>
            <span className={`text-xs font-mono ${totalMin > targetMinutes ? 'text-red-400' : 'text-muted-foreground/70'}`}>
              {totalMin} / {targetMinutes} min — ends {endTime}
            </span>
          </div>
          {itemsWithTimes.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <tr>
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-center px-3 py-2 w-16">Min</th>
                    <th className="text-center px-3 py-2 w-24">Start</th>
                    <th className="text-center px-3 py-2 w-24">End</th>
                    <th className="w-20 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsWithTimes.map((item, idx) => (
                    <tr key={item.id} className="border-t border-border/50">
                      <td className="px-4 py-2">
                        <span className="text-foreground">{item.title}</span>
                        {item.description && <p className="text-[11px] text-muted-foreground/70 mt-0.5 whitespace-pre-line">{item.description}</p>}
                      </td>
                      <td className="text-center px-3 py-2 text-muted-foreground">{item.minutes}</td>
                      <td className="text-center px-3 py-2 text-muted-foreground text-xs">{item.start_time}</td>
                      <td className="text-center px-3 py-2 text-muted-foreground text-xs">{item.end_time}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveItem(idx, -1)}
                            disabled={idx === 0}
                            className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground/40 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(idx, 1)}
                            disabled={idx === itemsWithTimes.length - 1}
                            className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground/40 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onDeleteItem(item.id)} className="text-muted-foreground/40 hover:text-red-400 ml-1" title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add item — just title + minutes + optional description */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground/70">Add item (times auto-calculate from meeting start):</p>
            <div className="flex gap-2">
              <input type="text" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Item title"
                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground" />
              <input type="number" value={newItemMin} onChange={e => setNewItemMin(Number(e.target.value))} min="1"
                className="w-20 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground text-center" />
              <span className="text-xs text-muted-foreground/60 self-center">min</span>
            </div>
            <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="Description / sub-items (optional)" rows={2}
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">
                Next item starts at {formatTime(parseTime(startTime) + totalMin)}
              </span>
              <button onClick={handleAddItem} disabled={!newItemTitle} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40">Add item</button>
            </div>
          </div>
        </div>
      )}

      {!agenda?.id && (
        <p className="text-xs text-muted-foreground/70 text-center">Click "Create agenda" above first, then add items.</p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Parking Lot Tab
// ────────────────────────────────────────────────────────────
function ParkingLotTab({ entries, currentMemberId, chapterMembers, currentForum, onAddNew, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)
  const [filterMemberId, setFilterMemberId] = useState('all')

  const memberById = useMemo(() => {
    const m = new Map()
    ;(chapterMembers || []).forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  const getAuthorName = (authorId) => {
    if (authorId === currentMemberId) return 'You'
    return memberById.get(authorId)?.name || 'Unknown'
  }

  const authors = useMemo(() => {
    const ids = [...new Set(entries.map(e => e.author_member_id))]
    return ids
      .map(id => ({ id, name: id === currentMemberId ? 'You' : (memberById.get(id)?.name || 'Unknown') }))
      .sort((a, b) => a.name === 'You' ? -1 : b.name === 'You' ? 1 : a.name.localeCompare(b.name))
  }, [entries, memberById, currentMemberId])

  const forumMembers = useMemo(() => {
    return (chapterMembers || [])
      .filter(cm => cm.forum === currentForum && cm.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [chapterMembers, currentForum])

  const filteredEntries = filterMemberId === 'all'
    ? entries
    : entries.filter(e => e.author_member_id === filterMemberId)

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground/70 text-sm mb-4">Nothing on the parking lot yet.</p>
        <button onClick={onAddNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary/90 text-white">
          <Pin className="h-4 w-4" /> Add to parking lot
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Show:</label>
          <select value={filterMemberId} onChange={e => setFilterMemberId(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/90 focus:border-primary focus:outline-none cursor-pointer">
            <option value="all" className="bg-card">Everyone</option>
            {authors.map(a => <option key={a.id} value={a.id} className="bg-card">{a.name}</option>)}
          </select>
        </div>
        <button onClick={onAddNew} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-muted/30 hover:bg-muted/50 border border-border text-foreground/90">
          <Pin className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-3 py-3 w-32">Author</th>
              <th className="text-center px-3 py-3 w-24">Importance</th>
              <th className="text-center px-3 py-3 w-24">Urgency</th>
              <th className="text-center px-3 py-3 w-24">Combined</th>
              <th className="px-3 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(e => (
              <tr key={e.id} className="border-t border-border/50">
                <td className="px-4 py-3 text-foreground">{e.name}</td>
                <td className="px-3 py-3 text-muted-foreground text-xs">{getAuthorName(e.author_member_id)}</td>
                <td className="text-center px-3 py-3 text-foreground/80">
                  <select value={e.importance} onChange={ev => onUpdate(e.id, { importance: Number(ev.target.value) })}
                    className="bg-muted/30 border border-border rounded px-2 py-1 text-sm text-foreground cursor-pointer">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n} className="bg-card">{n}</option>)}
                  </select>
                </td>
                <td className="text-center px-3 py-3 text-foreground/80">
                  <select value={e.urgency} onChange={ev => onUpdate(e.id, { urgency: Number(ev.target.value) })}
                    className="bg-muted/30 border border-border rounded px-2 py-1 text-sm text-foreground cursor-pointer">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n} className="bg-card">{n}</option>)}
                  </select>
                </td>
                <td className="text-center px-3 py-3 text-foreground font-semibold">{e.importance + e.urgency}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(e)} className="text-muted-foreground/60 hover:text-foreground" title="Edit name/author">
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(e.id)} className="text-muted-foreground/60 hover:text-red-400" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={ev => ev.stopPropagation()}>
            <h3 className="text-base font-semibold">Edit parking lot entry</h3>
            <EditParkingLotForm
              entry={editing}
              forumMembers={forumMembers}
              onClose={() => setEditing(null)}
              onSave={async (patch) => { await onUpdate(editing.id, patch); setEditing(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EditParkingLotForm({ entry, forumMembers, onClose, onSave }) {
  const [name, setName] = useState(entry.name || '')
  const [importance, setImportance] = useState(entry.importance ?? 5)
  const [urgency, setUrgency] = useState(entry.urgency ?? 5)
  const [authorId, setAuthorId] = useState(entry.author_member_id || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg bg-muted/30 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Author (forum mate)</label>
        <select value={authorId} onChange={e => setAuthorId(e.target.value)}
          className="w-full rounded-lg bg-muted/30 border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none cursor-pointer">
          <option value="" className="bg-card">Unknown</option>
          {forumMembers.map(m => <option key={m.id} value={m.id} className="bg-card">{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Importance: {importance}</label>
        <input type="range" min="1" max="10" value={importance} onChange={e => setImportance(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Urgency: {urgency}</label>
        <input type="range" min="1" max="10" value={urgency} onChange={e => setUrgency(Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        <button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), importance, urgency, author_member_id: authorId || null })}
          className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40">Save</button>
      </div>
    </div>
  )
}

function ParkingLotAddModal({ onClose, onConfirm }) {
  const [name, setName] = useState('')
  const [importance, setImportance] = useState(5)
  const [urgency, setUrgency] = useState(5)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold">Add to parking lot</h3>
        <p className="text-xs text-muted-foreground">Your forum will see the name and scores. Nothing else.</p>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Short name for this item"
            className="w-full rounded-lg bg-muted/30 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Importance: {importance}</label>
          <input type="range" min="1" max="10" value={importance} onChange={e => setImportance(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Urgency: {urgency}</label>
          <input type="range" min="1" max="10" value={urgency} onChange={e => setUrgency(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button disabled={!name.trim()} onClick={() => onConfirm({ name: name.trim(), importance, urgency })}
            className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40">Add</button>
        </div>
      </div>
    </div>
  )
}
