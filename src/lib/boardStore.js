import { useState, useCallback, useEffect, useMemo, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'
import { useFiscalYear } from './fiscalYearContext'
import { CHAIR_ROLES } from './constants'
import { captureSilentError } from './monitoring'

const BoardStoreContext = createContext(null)

function storageKey(chapterId, fiscalYear) {
  return fiscalYear
    ? `eo-board-store-${chapterId}-${fiscalYear}`
    : `eo-board-store-${chapterId}`
}

function loadCache(chapterId, fiscalYear) {
  try {
    const raw = localStorage.getItem(storageKey(chapterId, fiscalYear))
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }
  return null
}

function saveCache(chapterId, fiscalYear, state) {
  try {
    localStorage.setItem(storageKey(chapterId, fiscalYear), JSON.stringify(state))
  } catch { /* storage full */ }
}

export function BoardStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const { activeFiscalYear, isFiscalYearReady } = useFiscalYear()
  const cached = loadCache(activeChapterId, activeFiscalYear)

  const [chairReports, setChairReports] = useState(cached?.chairReports ?? [])
  const [communications, setCommunications] = useState(cached?.communications ?? [])
  const [forums, setForums] = useState(cached?.forums ?? [])
  const [memberScorecards, setMemberScorecards] = useState(cached?.memberScorecards ?? [])
  const [chapterRoles, setChapterRoles] = useState(cached?.chapterRoles ?? [])
  const [roleAssignments, setRoleAssignments] = useState(cached?.roleAssignments ?? [])
  const [chapterMembers, setChapterMembers] = useState(cached?.chapterMembers ?? [])
  const [profileCheckins, setProfileCheckins] = useState(cached?.profileCheckins ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevFetchKey = useRef(`${activeChapterId}:${activeFiscalYear}`)

  // Persist to localStorage
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, activeFiscalYear, { chairReports, communications, forums, memberScorecards, chapterRoles, roleAssignments, chapterMembers, profileCheckins })
  }, [activeChapterId, activeFiscalYear, chairReports, communications, forums, memberScorecards, chapterRoles, roleAssignments, chapterMembers, profileCheckins])

  // Fetch from Supabase
  useEffect(() => {
    const fetchKey = `${activeChapterId}:${activeFiscalYear}`
    if (prevFetchKey.current !== fetchKey) {
      hasFetched.current = false
      prevFetchKey.current = fetchKey
    }
    if (!isSupabaseConfigured() || hasFetched.current) { setLoading(false); return }
    if (!isChapterReady || !isFiscalYearReady) return
    if (!activeChapterId) { setLoading(false); return }
    hasFetched.current = true

    const chapterCache = loadCache(activeChapterId, activeFiscalYear)
    if (chapterCache) {
      if (chapterCache.chairReports) setChairReports(chapterCache.chairReports)
      if (chapterCache.communications) setCommunications(chapterCache.communications)
      if (chapterCache.forums) setForums(chapterCache.forums)
      if (chapterCache.memberScorecards) setMemberScorecards(chapterCache.memberScorecards)
      if (chapterCache.chapterRoles) setChapterRoles(chapterCache.chapterRoles)
      if (chapterCache.roleAssignments) setRoleAssignments(chapterCache.roleAssignments)
      if (chapterCache.chapterMembers) setChapterMembers(chapterCache.chapterMembers)
      if (chapterCache.profileCheckins) setProfileCheckins(chapterCache.profileCheckins)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [reportsRes, commsRes, forumsRes, scorecardsRes, rolesRes, assignmentsRes, membersRes, checkinsRes] = await Promise.all([
          supabase.from('chair_reports').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear),
          fetchByChapter('chapter_communications', activeChapterId),
          fetchByChapter('forums', activeChapterId),
          supabase.from('member_scorecards').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear),
          fetchByChapter('chapter_roles', activeChapterId).catch(() => ({ data: null })),
          fetchByChapter('role_assignments', activeChapterId).catch(() => ({ data: null })),
          fetchByChapter('chapter_members', activeChapterId).catch(() => ({ data: null })),
          fetchByChapter('profile_checkins', activeChapterId).catch(() => ({ data: null })),
        ])

        const coreResults = [reportsRes, commsRes, forumsRes, scorecardsRes]
        const errors = coreResults.filter(r => r.error).map(r => r.error)

        if (errors.length > 0) {
          captureSilentError('boardStore:hydrate-partial', new Error(`${errors.length} fetches failed`), {
            chapter_id: activeChapterId,
            fiscal_year: String(activeFiscalYear || ''),
            errors: errors.map(e => e?.message || JSON.stringify(e)).join(' | '),
          })
          setDbError('Some board data failed to load.')
          setLoading(false)
          return
        }

        if (reportsRes.data) setChairReports(reportsRes.data)
        if (commsRes.data) setCommunications(commsRes.data)
        if (forumsRes.data) setForums(forumsRes.data)
        if (scorecardsRes.data) setMemberScorecards(scorecardsRes.data)
        if (rolesRes?.data) setChapterRoles(rolesRes.data.sort((a, b) => a.sort_order - b.sort_order))
        if (assignmentsRes?.data) setRoleAssignments(assignmentsRes.data)
        if (membersRes?.data) setChapterMembers(membersRes.data.sort((a, b) => a.name.localeCompare(b.name)))
        if (checkinsRes?.data) setProfileCheckins(checkinsRes.data)
        setDbError(null)
      } catch (err) {
        captureSilentError('boardStore:hydrate-fatal', err, {
          chapter_id: activeChapterId,
          fiscal_year: String(activeFiscalYear || ''),
        })
        setDbError('Could not load board data.')
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady, activeFiscalYear, isFiscalYearReady])

  const dbWrite = useCallback(async (fn, label = 'unknown') => {
    if (!isSupabaseConfigured()) return
    const ctx = { label, chapter_id: activeChapterId, fiscal_year: String(activeFiscalYear || '') }
    try {
      const result = await fn()
      if (result?.error) {
        const msg = result.error?.message || result.error?.details || JSON.stringify(result.error)
        captureSilentError(`boardWrite:${label}`, result.error, ctx)
        setDbError(`Save failed (${label}): ${msg}`)
      }
      return result
    } catch (err) {
      captureSilentError(`boardWrite:${label}`, err, ctx)
      setDbError(`Save failed (${label}): ${err.message}`)
    }
  }, [activeChapterId, activeFiscalYear])

  // ── Chair Report CRUD ──
  const addChairReport = useCallback((report) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...report, id, chapter_id: activeChapterId, fiscal_year: activeFiscalYear, created_at: now, updated_at: now }
    setChairReports(prev => [...prev, row])
    dbWrite(() => insertRow('chair_reports', row), 'insert:chair_reports')
    return row
  }, [activeChapterId, activeFiscalYear, dbWrite])

  const updateChairReport = useCallback((id, updates) => {
    setChairReports(prev => prev.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
    dbWrite(() => updateRow('chair_reports', id, updates), 'update:chair_reports')
  }, [dbWrite])

  const deleteChairReport = useCallback((id) => {
    setChairReports(prev => prev.filter(r => r.id !== id))
    dbWrite(() => deleteRow('chair_reports', id), 'delete:chair_reports')
  }, [dbWrite])

  // ── Communications CRUD ──
  const addCommunication = useCallback((comm) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...comm, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setCommunications(prev => [...prev, row])
    dbWrite(() => insertRow('chapter_communications', row), 'insert:chapter_communications')
    return row
  }, [activeChapterId, dbWrite])

  const updateCommunication = useCallback((id, updates) => {
    setCommunications(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
    dbWrite(() => updateRow('chapter_communications', id, updates), 'update:chapter_communications')
  }, [dbWrite])

  const deleteCommunication = useCallback((id) => {
    setCommunications(prev => prev.filter(c => c.id !== id))
    dbWrite(() => deleteRow('chapter_communications', id), 'delete:chapter_communications')
  }, [dbWrite])

  // ── Forum CRUD ──
  const addForum = useCallback((forum) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...forum, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setForums(prev => [...prev, row])
    dbWrite(() => insertRow('forums', row), 'insert:forums')
    return row
  }, [activeChapterId, dbWrite])

  const updateForum = useCallback((id, updates) => {
    setForums(prev => prev.map(f => f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f))
    dbWrite(() => updateRow('forums', id, updates), 'update:forums')
  }, [dbWrite])

  const deleteForum = useCallback((id) => {
    setForums(prev => prev.filter(f => f.id !== id))
    dbWrite(() => deleteRow('forums', id), 'delete:forums')
  }, [dbWrite])

  // ── Member Scorecard CRUD ──
  const addScorecard = useCallback((scorecard) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...scorecard, id, chapter_id: activeChapterId, fiscal_year: activeFiscalYear, created_at: now, updated_at: now }
    setMemberScorecards(prev => [...prev, row])
    dbWrite(() => insertRow('member_scorecards', row), 'insert:member_scorecards')
    return row
  }, [activeChapterId, activeFiscalYear, dbWrite])

  const updateScorecard = useCallback((id, updates) => {
    setMemberScorecards(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s))
    dbWrite(() => updateRow('member_scorecards', id, updates), 'update:member_scorecards')
  }, [dbWrite])

  const deleteScorecard = useCallback((id) => {
    setMemberScorecards(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('member_scorecards', id), 'delete:member_scorecards')
  }, [dbWrite])

  // ── Chapter Role CRUD ──
  const addChapterRole = useCallback((role) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...role, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setChapterRoles(prev => [...prev, row].sort((a, b) => a.sort_order - b.sort_order))
    dbWrite(() => insertRow('chapter_roles', row), 'insert:chapter_roles')
    return row
  }, [activeChapterId, dbWrite])

  const updateChapterRole = useCallback((id, updates) => {
    setChapterRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
    dbWrite(() => updateRow('chapter_roles', id, updates), 'update:chapter_roles')
  }, [dbWrite])

  const deleteChapterRole = useCallback((id) => {
    setChapterRoles(prev => prev.filter(r => r.id !== id))
    dbWrite(() => deleteRow('chapter_roles', id), 'delete:chapter_roles')
  }, [dbWrite])

  // ── Role Assignment CRUD ──
  const addRoleAssignment = useCallback((assignment) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...assignment, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setRoleAssignments(prev => [...prev, row])
    dbWrite(() => insertRow('role_assignments', row), 'insert:role_assignments')
    return row
  }, [activeChapterId, dbWrite])

  const updateRoleAssignment = useCallback((id, updates) => {
    setRoleAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a))
    dbWrite(() => updateRow('role_assignments', id, updates), 'update:role_assignments')
  }, [dbWrite])

  const deleteRoleAssignment = useCallback((id) => {
    setRoleAssignments(prev => prev.filter(a => a.id !== id))
    dbWrite(() => deleteRow('role_assignments', id), 'delete:role_assignments')
  }, [dbWrite])

  // ── Chapter Member CRUD ──
  const addChapterMember = useCallback((member) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...member, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setChapterMembers(prev => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)))
    dbWrite(() => insertRow('chapter_members', row), 'insert:chapter_members')
    return row
  }, [activeChapterId, dbWrite])

  const updateChapterMember = useCallback((id, updates) => {
    setChapterMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m))
    dbWrite(() => updateRow('chapter_members', id, updates), 'update:chapter_members')
  }, [dbWrite])

  const deleteChapterMember = useCallback((id) => {
    setChapterMembers(prev => prev.filter(m => m.id !== id))
    dbWrite(() => deleteRow('chapter_members', id), 'delete:chapter_members')
  }, [dbWrite])

  // ── Upsert a single staff member into member_invites with correct app role ──
  // Uses a security-definer RPC to bypass RLS on member_invites.
  const STAFF_ROLE_MAP = {
    experience_coordinator: 'chapter_experience_coordinator',
    executive_director: 'chapter_executive_director',
  }
  const upsertStaffInvite = useCallback(async ({ name, email, roleKey }) => {
    if (!isSupabaseConfigured() || !activeChapterId || !email?.trim()) return
    const appRole = STAFF_ROLE_MAP[roleKey] ?? 'committee_member'
    const { error } = await supabase.rpc('upsert_staff_invite', {
      p_email: email.trim().toLowerCase(),
      p_full_name: name || '',
      p_role: appRole,
      p_chapter_id: activeChapterId,
    })
    if (error) throw error
  }, [activeChapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync member_invites (auth whitelist) ──
  // Phone is included so members can also use the SMS-OTP sign-in path.
  // Stored digits-only to match chapter_members.phone format.
  const syncMemberInvites = useCallback(async (members) => {
    if (!isSupabaseConfigured() || !activeChapterId) return
    const rows = members
      .filter(m => m.email)
      .map(m => ({
        email: m.email.trim().toLowerCase(),
        full_name: m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        role: 'member',
        chapter_id: activeChapterId,
        phone: m.phone ? String(m.phone).replace(/\D/g, '') || null : null,
      }))
    if (rows.length === 0) return
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase
        .from('member_invites')
        .upsert(batch, { onConflict: 'email', ignoreDuplicates: true })
      if (error) captureSilentError('boardStore:syncMemberInvites-batch', error, { chapter_id: activeChapterId })
    }
  }, [activeChapterId])

  // Resolve member_id to name, falling back to member_name on the assignment
  const getMemberName = useCallback((assignment) => {
    if (assignment.member_id) {
      const member = chapterMembers.find(m => m.id === assignment.member_id)
      if (member) return member.name
    }
    return assignment.member_name || 'Unknown'
  }, [chapterMembers])

  const getMemberEmail = useCallback((assignment) => {
    if (assignment.member_id) {
      const member = chapterMembers.find(m => m.id === assignment.member_id)
      if (member) return member.email || ''
    }
    return assignment.member_email || ''
  }, [chapterMembers])

  // Fallback getter: returns DB roles mapped to { id, label, isStaff } or hardcoded CHAIR_ROLES
  const getChairRoles = useCallback(() => {
    if (chapterRoles.length > 0) {
      return chapterRoles.map(r => ({ id: r.role_key, label: r.label, isStaff: r.is_staff }))
    }
    return CHAIR_ROLES
  }, [chapterRoles])

  // ── Computed: active president theme + active chair budget ──
  const getActiveAssignment = useCallback((roleKey) => {
    const role = chapterRoles.find(r => r.role_key === roleKey)
    if (!role) return null
    return roleAssignments.find(a => a.chapter_role_id === role.id && a.status === 'active') ?? null
  }, [chapterRoles, roleAssignments])

  // Helper: find a role assignment by role_key, filtered by active fiscal year
  const findFYAssignment = useCallback((roleKey, statusFilter) => {
    if (chapterRoles.length === 0) return null
    return roleAssignments.find(ra => {
      const role = chapterRoles.find(r => r.id === ra.chapter_role_id)
      if (!role || role.role_key !== roleKey) return false
      if (ra.fiscal_year !== activeFiscalYear) return false
      return statusFilter ? statusFilter.includes(ra.status) : ra.status === 'active'
    }) ?? null
  }, [chapterRoles, roleAssignments, activeFiscalYear])

  const activePresidentTheme = (() => {
    const a = findFYAssignment('president')
    return a?.theme || null
  })()

  const activePresidentThemeDescription = (() => {
    const a = findFYAssignment('president')
    return a?.theme_description || null
  })()

  const activePresidentName = (() => {
    const a = findFYAssignment('president')
    if (!a) return null
    if (a.member_id) {
      const member = chapterMembers.find(m => m.id === a.member_id)
      if (member) return member.name
    }
    return a.member_name || null
  })()

  // President Elect - the person whose theme drives the upcoming FY plan
  const presidentElectTheme = (() => {
    const a = findFYAssignment('president_elect', ['active', 'elect'])
    return a?.theme || null
  })()

  const presidentElectName = (() => {
    const a = findFYAssignment('president_elect', ['active', 'elect'])
    if (!a) return null
    if (a.member_id) {
      const member = chapterMembers.find(m => m.id === a.member_id)
      if (member) return member.name
    }
    return a.member_name || null
  })()

  const getChairBudget = useCallback((roleKey) => {
    const a = findFYAssignment(roleKey, ['active', 'elect'])
    return a?.budget ?? 0
  }, [findFYAssignment])

  // ── Profile Check-ins (freshness ping) ─────────────────────────
  const PROFILE_FRESHNESS_DAYS = 90

  const submitProfileCheckin = useCallback(async ({ memberId, kind, note }) => {
    if (!memberId) return null
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      member_id: memberId,
      kind, // 'no_change' | 'change_requested'
      note: note || '',
      status: kind === 'no_change' ? 'resolved' : 'open',
      created_at: now,
      resolved_at: kind === 'no_change' ? now : null,
      resolved_by: null,
    }
    setProfileCheckins(prev => [row, ...prev])
    await dbWrite(() => insertRow('profile_checkins', row), 'insert:profile_checkins')
    return row
  }, [activeChapterId, dbWrite])

  const resolveProfileCheckin = useCallback(async (id, resolvedByMemberId) => {
    const now = new Date().toISOString()
    const updates = { status: 'resolved', resolved_at: now, resolved_by: resolvedByMemberId ?? null }
    setProfileCheckins(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
    await dbWrite(() => updateRow('profile_checkins', id, updates), 'update:profile_checkins')
  }, [dbWrite])

  const latestCheckinForMember = useCallback((memberId) => {
    if (!memberId) return null
    const sorted = profileCheckins
      .filter(c => c.member_id === memberId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return sorted[0] || null
  }, [profileCheckins])

  const profileIsStale = useCallback((memberId) => {
    const latest = latestCheckinForMember(memberId)
    if (!latest) return true
    const ageDays = (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > PROFILE_FRESHNESS_DAYS
  }, [latestCheckinForMember])

  const pendingProfileChangeRequests = useMemo(() => {
    return profileCheckins
      .filter(c => c.kind === 'change_requested' && c.status === 'open')
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  }, [profileCheckins])

  // Total budget allocated across ALL chair roles for the active FY
  const totalChairAllocated = useMemo(() => {
    if (!activeFiscalYear || chapterRoles.length === 0) return 0
    return roleAssignments
      .filter(ra => {
        if (ra.fiscal_year !== activeFiscalYear) return false
        if (ra.status !== 'active' && ra.status !== 'elect') return false
        return true
      })
      .reduce((sum, ra) => sum + (ra.budget || 0), 0)
  }, [roleAssignments, chapterRoles, activeFiscalYear])

  const value = {
    chairReports, communications, forums, memberScorecards, chapterRoles, roleAssignments, chapterMembers, profileCheckins,
    loading, dbError, clearDbError: () => setDbError(null),
    addChairReport, updateChairReport, deleteChairReport,
    addCommunication, updateCommunication, deleteCommunication,
    addForum, updateForum, deleteForum,
    addScorecard, updateScorecard, deleteScorecard,
    addChapterRole, updateChapterRole, deleteChapterRole,
    addRoleAssignment, updateRoleAssignment, deleteRoleAssignment,
    addChapterMember, updateChapterMember, deleteChapterMember, syncMemberInvites, upsertStaffInvite,
    getMemberName, getMemberEmail,
    getChairRoles, getActiveAssignment, getChairBudget, totalChairAllocated,
    activePresidentTheme, activePresidentThemeDescription, activePresidentName,
    presidentElectTheme, presidentElectName,
    submitProfileCheckin, resolveProfileCheckin, latestCheckinForMember, profileIsStale, pendingProfileChangeRequests,
  }

  return createElement(BoardStoreContext.Provider, { value }, children)
}

export function useBoardStore() {
  const ctx = useContext(BoardStoreContext)
  if (!ctx) throw new Error('useBoardStore must be used within BoardStoreProvider')
  return ctx
}
