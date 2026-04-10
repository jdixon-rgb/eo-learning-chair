import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useBoardStore } from '@/lib/boardStore'
import { useForumStore } from '@/lib/forumStore'
import { useStore } from '@/lib/store'
import { loadCurrentMember, loadParkingLot, createParkingLotEntry, updateParkingLotEntry, deleteParkingLotEntry } from '@/lib/reflectionsStore'
import {
  Pin, Calendar, Users, FileText, BookOpen, History, Handshake,
  Plus, Trash2, Save, X, Star, ChevronDown, ChevronRight, Upload, ClipboardList,
} from 'lucide-react'

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
  const { user, profile, isAdmin, isSuperAdmin } = useAuth()
  const { chapterMembers, forums, loading: boardLoading } = useBoardStore()
  const { forumRoles, forumCalendar, forumDocs, sapInterest, sapRatings, forumHistory,
    addForumRole, updateForumRole, deleteForumRole,
    addForumCalEvent, updateForumCalEvent, deleteForumCalEvent,
    addForumDoc, deleteForumDoc,
    toggleSapInterest, upsertSapRating,
    addHistoryMember, deleteHistoryMember,
  } = useForumStore()
  const { events: chapterEvents, saps } = useStore()

  const email = user?.email || profile?.email
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('parking')
  const [parkingLot, setParkingLot] = useState([])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const { data: m } = await loadCurrentMember(email)
      if (!cancelled) {
        setMember(m)
        if (m?.forum && m?.chapter_id) {
          const { data } = await loadParkingLot(m.chapter_id, m.forum)
          if (!cancelled) setParkingLot(data)
        }
        setLoading(false)
      }
    }
    if (email) init()
    return () => { cancelled = true }
  }, [email])

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

  if (loading || boardLoading) return <div className="text-white/60 text-center py-12">Loading…</div>

  if (!member) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Member profile not found</h2>
        <p className="text-white/50 text-sm mt-2">Reach out to your chapter admin to get set up.</p>
      </div>
    )
  }

  if (!member.forum) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">You're not in a forum yet</h2>
        <p className="text-white/50 text-sm mt-2">Talk to your Forum Placement Chair — an incredible journey is waiting for you.</p>
      </div>
    )
  }

  const tabs = [
    { key: 'parking', label: 'Parking Lot', icon: Pin },
    { key: 'tools', label: 'Tools', icon: BookOpen },
    { key: 'agenda', label: 'Agenda', icon: ClipboardList },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'constitution', label: 'Constitution', icon: FileText },
    { key: 'partners', label: 'Partners', icon: Handshake },
    { key: 'roles', label: 'Roles', icon: Users },
    { key: 'history', label: 'History', icon: History },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl font-bold">{member.forum}</h1>
        <p className="text-white/50 text-sm mt-1">
          {forumMembers.length} members{effectiveForum.founded_year ? ` · Founded ${effectiveForum.founded_year}` : ''}
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap justify-center gap-1 border-b border-white/10">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === t.key ? 'border-eo-blue text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'roles' && (
        <RolesTab
          forum={effectiveForum}
          roles={myForumRoles}
          forumMembers={forumMembers}
          memberById={memberById}
          isModerator={isModerator}
          onAdd={addForumRole}
          onUpdate={updateForumRole}
          onDelete={deleteForumRole}
        />
      )}

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
        <div className="text-center text-white/50 text-sm py-8">
          Parking lot is being promoted to a standalone feature here. Coming soon.
        </div>
      )}

      {tab === 'agenda' && (
        <div className="text-center text-white/50 text-sm py-8">
          Build your forum meeting agenda here. Coming soon.
        </div>
      )}

      {tab === 'tools' && (
        <div className="text-center text-white/50 text-sm py-8">
          Forum tools (Lifeline, Reflections templates, coaching worksheets) coming soon.
        </div>
      )}

      {tab === 'constitution' && (
        <ConstitutionTab
          docs={myForumDocs}
          forum={effectiveForum}
          isModerator={isModerator}
          onAdd={addForumDoc}
          onDelete={deleteForumDoc}
        />
      )}

      {tab === 'partners' && (
        <PartnersTab
          forum={effectiveForum}
          saps={saps}
          interest={myForumInterest}
          ratings={myForumRatings}
          memberId={member.id}
          onToggleInterest={(sapId, current) => toggleSapInterest(sapId, member.id, effectiveForum.id, current)}
          onRate={(sapId, rating, note) => upsertSapRating(sapId, member.id, effectiveForum.id, rating, note)}
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
// Roles Tab
// ────────────────────────────────────────────────────────────
function RolesTab({ forum, roles, forumMembers, memberById, isModerator, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false)
  const [addRole, setAddRole] = useState('timer')
  const [addMember, setAddMember] = useState('')
  const [addFY, setAddFY] = useState('')

  // Group by fiscal year, then by role order
  const byYear = useMemo(() => {
    const map = {}
    roles.forEach(r => {
      if (!map[r.fiscal_year]) map[r.fiscal_year] = []
      map[r.fiscal_year].push(r)
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([fy, rs]) => ({
        fy,
        roles: rs.sort((a, b) => FORUM_ROLE_ORDER.indexOf(a.role) - FORUM_ROLE_ORDER.indexOf(b.role)),
      }))
  }, [roles])

  const handleAdd = () => {
    if (!addMember || !addFY || !addRole) return
    onAdd({ forum_id: forum.id, chapter_member_id: addMember, role: addRole, fiscal_year: addFY })
    setShowAdd(false)
    setAddMember('')
  }

  return (
    <div className="space-y-4">
      {isModerator && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/80">
            <Plus className="h-3.5 w-3.5" /> Assign role
          </button>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={addRole} onChange={e => setAddRole(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {FORUM_ROLE_ORDER.map(r => <option key={r} value={r} className="bg-eo-navy">{FORUM_ROLE_LABELS[r]}</option>)}
            </select>
            <select value={addMember} onChange={e => setAddMember(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              <option value="" className="bg-eo-navy">Select member…</option>
              {forumMembers.map(m => <option key={m.id} value={m.id} className="bg-eo-navy">{m.name}</option>)}
            </select>
            <input
              type="text"
              value={addFY}
              onChange={e => setAddFY(e.target.value)}
              placeholder="FY2028"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
            <button onClick={handleAdd} disabled={!addMember || !addFY} className="px-3 py-1.5 rounded-lg text-xs bg-eo-blue text-white disabled:opacity-40">Assign</button>
          </div>
        </div>
      )}

      {byYear.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">No roles assigned yet.</div>
      ) : (
        byYear.map(({ fy, roles: yearRoles }) => (
          <div key={fy} className="rounded-xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">{fy}</div>
            <div className="divide-y divide-white/5">
              {yearRoles.map(r => {
                const m = memberById.get(r.chapter_member_id)
                return (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white/90 font-medium">{m?.name || 'Unknown'}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{FORUM_ROLE_LABELS[r.role]}</span>
                    </div>
                    {isModerator && (
                      <button onClick={() => onDelete(r.id)} className="text-white/30 hover:text-red-400" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Calendar Tab
// ────────────────────────────────────────────────────────────
function CalendarTab({ forum, events, isModerator, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', event_date: '', event_type: 'meeting', location: '', notes: '', fiscal_year: '' })

  const handleAdd = () => {
    if (!form.title || !form.event_date) return
    onAdd({ forum_id: forum.id, ...form })
    setShowAdd(false)
    setForm({ title: '', event_date: '', event_type: 'meeting', location: '', notes: '', fiscal_year: '' })
  }

  // Forum events only
  const allEvents = useMemo(() => {
    return events.map(e => ({ ...e, source: 'forum' }))
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
  }, [events])

  return (
    <div className="space-y-4">
      {isModerator && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/80">
            <Plus className="h-3.5 w-3.5" /> Add event
          </button>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-eo-navy">{v}</option>)}
            </select>
          </div>
          <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
          <input type="text" value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))} placeholder="FY2028" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title || !form.event_date} className="px-3 py-1.5 rounded-lg text-xs bg-eo-blue text-white disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {allEvents.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">No events scheduled.</div>
      ) : (
        <div className="space-y-2">
          {allEvents.map(e => (
            <div key={e.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/90">{e.title}</span>
                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">
                    {EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{e.event_date}{e.location ? ` · ${e.location}` : ''}</p>
              </div>
              {isModerator && (
                <button onClick={() => onDelete(e.id)} className="text-white/30 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Constitution Tab
// ────────────────────────────────────────────────────────────
function ConstitutionTab({ docs, forum, isModerator, onAdd, onDelete }) {
  const constitutions = docs.filter(d => d.doc_type === 'constitution')

  return (
    <div className="space-y-4">
      {constitutions.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">
          No constitution uploaded yet.{isModerator && ' Upload one to get started.'}
        </div>
      ) : (
        constitutions.map(doc => (
          <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/90">{doc.title || 'Forum Constitution'}</p>
              <p className="text-xs text-white/40 mt-0.5">{doc.file_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-eo-blue hover:underline">Open</a>
              )}
              {isModerator && (
                <button onClick={() => onDelete(doc.id)} className="text-white/30 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
      {isModerator && (
        <p className="text-xs text-white/30 text-center">
          Constitution upload via file picker coming soon. For now, add via the board Forums page.
        </p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Partners Tab
// ────────────────────────────────────────────────────────────
function PartnersTab({ forum, saps, interest, ratings, memberId, onToggleInterest, onRate }) {
  const [ratingFor, setRatingFor] = useState(null)
  const [ratingVal, setRatingVal] = useState(3)
  const [ratingNote, setRatingNote] = useState('')

  const sapList = (saps || []).filter(s => s.status !== 'inactive').sort((a, b) => (a.company_name || a.name || '').localeCompare(b.company_name || b.name || ''))

  const isInterested = (sapId) => interest.some(i => i.sap_id === sapId && i.chapter_member_id === memberId)
  const myRating = (sapId) => ratings.find(r => r.sap_id === sapId && r.chapter_member_id === memberId)
  const avgRating = (sapId) => {
    const rs = ratings.filter(r => r.sap_id === sapId)
    if (rs.length === 0) return null
    return (rs.reduce((sum, r) => sum + r.rating, 0) / rs.length).toFixed(1)
  }
  const interestedCount = (sapId) => interest.filter(i => i.sap_id === sapId).length

  const handleSaveRating = () => {
    if (!ratingFor) return
    onRate(ratingFor, ratingVal, ratingNote)
    setRatingFor(null)
    setRatingNote('')
  }

  if (sapList.length === 0) {
    return <div className="text-center py-12 text-white/40 text-sm">No SAP partners found. Partners are managed by the SAP Chair.</div>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">Express interest to let the SAP know your forum wants to connect. Ratings are anonymous and internal.</p>
      {sapList.map(sap => {
        const name = sap.company_name || sap.name || 'Unknown'
        const interested = isInterested(sap.id)
        const myR = myRating(sap.id)
        const avg = avgRating(sap.id)
        const intCount = interestedCount(sap.id)
        return (
          <div key={sap.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white/90">{name}</h3>
                  {sap.tier && (
                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{sap.tier}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                  {avg && <span>Avg rating: {avg}/5</span>}
                  {intCount > 0 && <span>{intCount} interested</span>}
                  {myR && <span>Your rating: {myR.rating}/5</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleInterest(sap.id, interested)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    interested
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {interested ? 'Interested ✓' : 'Interested?'}
                </button>
                <button
                  onClick={() => { setRatingFor(sap.id); setRatingVal(myR?.rating || 3); setRatingNote(myR?.note || '') }}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {ratingFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setRatingFor(null)}>
          <div className="bg-eo-navy border border-white/10 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Rate this partner</h3>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Rating: {ratingVal}/5</label>
              <input type="range" min="1" max="5" value={ratingVal} onChange={e => setRatingVal(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Anonymous note (optional)</label>
              <textarea
                value={ratingNote}
                onChange={e => setRatingNote(e.target.value)}
                rows={3}
                placeholder="What should the SAP Chair know?"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRatingFor(null)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Cancel</button>
              <button onClick={handleSaveRating} className="px-3 py-1.5 rounded-lg text-xs bg-eo-blue text-white">Save rating</button>
            </div>
          </div>
        </div>
      )}
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
        <h3 className="text-sm font-semibold text-white/80 mb-3">Moderator Lineage</h3>
        {moderatorLineage.length === 0 ? (
          <p className="text-xs text-white/40">No moderators assigned yet. Add them in the Roles tab.</p>
        ) : (
          <div className="space-y-1">
            {moderatorLineage.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-white/30 w-8">#{i + 1}</span>
                <span className="text-sm text-white/90 font-medium">{r.name}</span>
                <span className="text-xs text-white/40">{r.fiscal_year}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/80">Past Members</h3>
          {isModerator && (
            <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/60">
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        {showAdd && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3 space-y-3">
            <input type="text" value={form.member_name} onChange={e => setForm(f => ({ ...f, member_name: e.target.value }))} placeholder="Member name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.joined_year} onChange={e => setForm(f => ({ ...f, joined_year: e.target.value }))} placeholder="Joined year" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
              <input type="text" value={form.left_year} onChange={e => setForm(f => ({ ...f, left_year: e.target.value }))} placeholder="Left year" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30" />
            </div>
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" checked={form.is_founding_member} onChange={e => setForm(f => ({ ...f, is_founding_member: e.target.checked }))} />
              Founding member
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-white/50">Cancel</button>
              <button onClick={handleAdd} disabled={!form.member_name} className="px-3 py-1.5 rounded-lg text-xs bg-eo-blue text-white disabled:opacity-40">Add</button>
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-xs text-white/40">No past members recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {history.sort((a, b) => (a.joined_year || '').localeCompare(b.joined_year || '')).map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/[0.03]">
                <div>
                  <span className="text-sm text-white/90">{h.member_name}</span>
                  {h.is_founding_member && <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Founder</span>}
                  <span className="ml-2 text-xs text-white/40">
                    {h.joined_year && h.left_year ? `${h.joined_year}–${h.left_year}` : h.joined_year || h.left_year || ''}
                  </span>
                </div>
                {isModerator && (
                  <button onClick={() => onDeleteHistory(h.id)} className="text-white/30 hover:text-red-400">
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
