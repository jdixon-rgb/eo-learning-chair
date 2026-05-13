import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'
import { useFiscalYear } from './fiscalYearContext'

const EngagementStoreContext = createContext(null)

function storageKey(chapterId, fiscalYear) {
  return fiscalYear
    ? `eo-engagement-store-${chapterId}-${fiscalYear}`
    : `eo-engagement-store-${chapterId}`
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
  } catch { /* full */ }
}

export function EngagementStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const { activeFiscalYear, isFiscalYearReady } = useFiscalYear()
  const cached = loadCache(activeChapterId, activeFiscalYear)

  const [navigators, setNavigators] = useState(cached?.navigators ?? [])
  const [pairings, setPairings] = useState(cached?.pairings ?? [])
  const [resources, setResources] = useState(cached?.resources ?? [])
  const [mentors, setMentors] = useState(cached?.mentors ?? [])
  const [mentorPairings, setMentorPairings] = useState(cached?.mentorPairings ?? [])
  const [broadcasts, setBroadcasts] = useState(cached?.broadcasts ?? [])
  const [broadcastResponses, setBroadcastResponses] = useState(cached?.broadcastResponses ?? [])
  const [sessions, setSessions] = useState(cached?.sessions ?? [])
  const [feedback, setFeedback] = useState(cached?.feedback ?? [])
  const [newMemberProfiles, setNewMemberProfiles] = useState(cached?.newMemberProfiles ?? [])
  const [bbDinners, setBbDinners] = useState(cached?.bbDinners ?? [])
  const [bbAttendees, setBbAttendees] = useState(cached?.bbAttendees ?? [])
  const [bbBudgetItems, setBbBudgetItems] = useState(cached?.bbBudgetItems ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevFetchKey = useRef(`${activeChapterId}:${activeFiscalYear}`)

  // Persist
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, activeFiscalYear, {
      navigators, pairings, resources, mentors, mentorPairings, broadcasts, broadcastResponses,
      sessions, feedback, newMemberProfiles, bbDinners, bbAttendees, bbBudgetItems,
    })
  }, [activeChapterId, activeFiscalYear, navigators, pairings, resources, mentors, mentorPairings, broadcasts, broadcastResponses, sessions, feedback, newMemberProfiles, bbDinners, bbAttendees, bbBudgetItems])

  // Hydrate from Supabase when chapter or fiscal year changes
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
      if (chapterCache.navigators) setNavigators(chapterCache.navigators)
      if (chapterCache.pairings) setPairings(chapterCache.pairings)
      if (chapterCache.resources) setResources(chapterCache.resources)
      if (chapterCache.mentors) setMentors(chapterCache.mentors)
      if (chapterCache.mentorPairings) setMentorPairings(chapterCache.mentorPairings)
      if (chapterCache.broadcasts) setBroadcasts(chapterCache.broadcasts)
      if (chapterCache.broadcastResponses) setBroadcastResponses(chapterCache.broadcastResponses)
      if (chapterCache.sessions) setSessions(chapterCache.sessions)
      if (chapterCache.feedback) setFeedback(chapterCache.feedback)
      if (chapterCache.newMemberProfiles) setNewMemberProfiles(chapterCache.newMemberProfiles)
      if (chapterCache.bbDinners) setBbDinners(chapterCache.bbDinners)
      if (chapterCache.bbAttendees) setBbAttendees(chapterCache.bbAttendees)
      if (chapterCache.bbBudgetItems) setBbBudgetItems(chapterCache.bbBudgetItems)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [
          navsRes, pairingsRes, resourcesRes, mentorsRes, mentorPairingsRes,
          broadcastsRes, broadcastResponsesRes,
          sessionsRes, feedbackRes, profilesRes,
          dinnersRes, attendeesRes, bbBudgetRes,
        ] = await Promise.all([
          fetchByChapter('navigators', activeChapterId),
          supabase.from('navigator_pairings').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear),
          fetchByChapter('navigator_resources', activeChapterId),
          fetchByChapter('mentors', activeChapterId),
          fetchByChapter('mentor_pairings', activeChapterId),
          supabase.from('navigator_broadcasts').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear).order('sent_at', { ascending: false }),
          supabase.from('navigator_broadcast_responses').select('*, broadcast:navigator_broadcasts!inner(chapter_id, fiscal_year)').eq('broadcast.chapter_id', activeChapterId).eq('broadcast.fiscal_year', activeFiscalYear),
          supabase.from('navigator_sessions').select('*, pairing:navigator_pairings!inner(chapter_id, fiscal_year)').eq('pairing.chapter_id', activeChapterId).eq('pairing.fiscal_year', activeFiscalYear),
          supabase.from('navigator_feedback').select('*, pairing:navigator_pairings!inner(chapter_id, fiscal_year)').eq('pairing.chapter_id', activeChapterId).eq('pairing.fiscal_year', activeFiscalYear),
          fetchByChapter('new_member_profiles', activeChapterId),
          supabase.from('breaking_barriers_dinners').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear).order('dinner_date', { ascending: true }),
          supabase.from('breaking_barriers_attendees').select('*, dinner:breaking_barriers_dinners!inner(chapter_id, fiscal_year)').eq('dinner.chapter_id', activeChapterId).eq('dinner.fiscal_year', activeFiscalYear),
          supabase.from('budget_items').select('*, dinner:breaking_barriers_dinners!inner(chapter_id, fiscal_year)').eq('dinner.chapter_id', activeChapterId).eq('dinner.fiscal_year', activeFiscalYear),
        ])
        if (navsRes.data) setNavigators(navsRes.data)
        if (pairingsRes.data) setPairings(pairingsRes.data)
        if (resourcesRes.data) setResources(resourcesRes.data)
        if (mentorsRes.data) setMentors(mentorsRes.data)
        if (mentorPairingsRes.data) setMentorPairings(mentorPairingsRes.data)
        if (broadcastsRes.data) setBroadcasts(broadcastsRes.data)
        if (broadcastResponsesRes.data) {
          setBroadcastResponses(broadcastResponsesRes.data.map(({ broadcast, ...rest }) => rest))
        }
        if (sessionsRes.data) {
          setSessions(sessionsRes.data.map(({ pairing, ...rest }) => rest))
        }
        if (feedbackRes.data) {
          setFeedback(feedbackRes.data.map(({ pairing, ...rest }) => rest))
        }
        if (profilesRes.data) setNewMemberProfiles(profilesRes.data)
        if (dinnersRes.data) setBbDinners(dinnersRes.data)
        if (attendeesRes.data) {
          setBbAttendees(attendeesRes.data.map(({ dinner, ...rest }) => rest))
        }
        if (bbBudgetRes.data) {
          setBbBudgetItems(bbBudgetRes.data.map(({ dinner, ...rest }) => rest))
        }
      } catch (err) {
        setDbError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady, activeFiscalYear, isFiscalYearReady])

  // Optimistic write helper
  const dbWrite = useCallback(async (fn, label) => {
    if (!isSupabaseConfigured()) return
    try {
      const res = await fn()
      if (res?.error) throw res.error
    } catch (err) {
      setDbError(`${label}: ${err.message || String(err)}`)
    }
  }, [])

  // ── Navigators CRUD ───────────────────────────────────────────
  const addNavigator = useCallback((nav) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      chapter_member_id: nav.chapter_member_id,
      appointed_by: nav.appointed_by ?? null,
      appointed_at: now,
      status: 'active',
      retired_at: null,
      bio: nav.bio ?? '',
      max_concurrent_pairings: nav.max_concurrent_pairings ?? null,
      created_at: now,
      updated_at: now,
    }
    setNavigators(prev => [...prev, row])
    dbWrite(() => insertRow('navigators', row), 'insert:navigators')
    return row
  }, [activeChapterId, dbWrite])

  const updateNavigator = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setNavigators(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)))
    dbWrite(() => updateRow('navigators', id, updates), 'update:navigators')
  }, [dbWrite])

  const retireNavigator = useCallback((id) => {
    updateNavigator(id, { status: 'retired', retired_at: new Date().toISOString() })
  }, [updateNavigator])

  const restoreNavigator = useCallback((id) => {
    updateNavigator(id, { status: 'active', retired_at: null })
  }, [updateNavigator])

  const deleteNavigator = useCallback((id) => {
    setNavigators(prev => prev.filter(n => n.id !== id))
    dbWrite(() => deleteRow('navigators', id), 'delete:navigators')
  }, [dbWrite])

  // ── Mentors CRUD ───────────────────────────────────────────────
  const addMentor = useCallback((mentor) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      chapter_member_id: mentor.chapter_member_id,
      appointed_by: mentor.appointed_by ?? null,
      appointed_at: now,
      status: 'active',
      retired_at: null,
      bio: mentor.bio ?? '',
      max_concurrent_pairings: mentor.max_concurrent_pairings ?? null,
      created_at: now,
      updated_at: now,
    }
    setMentors(prev => [...prev, row])
    dbWrite(() => insertRow('mentors', row), 'insert:mentors')
    return row
  }, [activeChapterId, dbWrite])

  const updateMentor = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setMentors(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)))
    dbWrite(() => updateRow('mentors', id, updates), 'update:mentors')
  }, [dbWrite])

  const retireMentor = useCallback((id) => {
    updateMentor(id, { status: 'retired', retired_at: new Date().toISOString() })
  }, [updateMentor])

  const restoreMentor = useCallback((id) => {
    updateMentor(id, { status: 'active', retired_at: null })
  }, [updateMentor])

  const deleteMentor = useCallback((id) => {
    setMentors(prev => prev.filter(n => n.id !== id))
    dbWrite(() => deleteRow('mentors', id), 'delete:mentors')
  }, [dbWrite])

  // ── Navigator Broadcasts CRUD ─────────────────────────────────
  const createBroadcast = useCallback(({ prompt, options, senderMemberId }) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      fiscal_year: activeFiscalYear,
      sender_member_id: senderMemberId ?? null,
      prompt,
      options: options && options.length > 0
        ? options
        : [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
      status: 'open',
      sent_at: now,
      closed_at: null,
      created_at: now,
      updated_at: now,
    }
    setBroadcasts(prev => [row, ...prev])
    dbWrite(() => insertRow('navigator_broadcasts', row), 'insert:navigator_broadcasts')
    return row
  }, [activeChapterId, activeFiscalYear, dbWrite])

  const closeBroadcast = useCallback((id) => {
    const now = new Date().toISOString()
    setBroadcasts(prev => prev.map(b => (b.id === id ? { ...b, status: 'closed', closed_at: now, updated_at: now } : b)))
    dbWrite(() => updateRow('navigator_broadcasts', id, { status: 'closed', closed_at: now, updated_at: now }), 'update:navigator_broadcasts')
  }, [dbWrite])

  const reopenBroadcast = useCallback((id) => {
    const now = new Date().toISOString()
    setBroadcasts(prev => prev.map(b => (b.id === id ? { ...b, status: 'open', closed_at: null, updated_at: now } : b)))
    dbWrite(() => updateRow('navigator_broadcasts', id, { status: 'open', closed_at: null, updated_at: now }), 'update:navigator_broadcasts')
  }, [dbWrite])

  const deleteBroadcast = useCallback((id) => {
    setBroadcasts(prev => prev.filter(b => b.id !== id))
    setBroadcastResponses(prev => prev.filter(r => r.broadcast_id !== id))
    dbWrite(() => deleteRow('navigator_broadcasts', id), 'delete:navigator_broadcasts')
  }, [dbWrite])

  const submitBroadcastResponse = useCallback(async ({ broadcastId, navigatorId, chapterMemberId, responseValue, note }) => {
    const now = new Date().toISOString()
    // Upsert by (broadcast_id, navigator_id) — change-your-mind semantics
    const existing = broadcastResponses.find(r => r.broadcast_id === broadcastId && r.navigator_id === navigatorId)
    if (existing) {
      const updates = { response_value: responseValue, note: note ?? '', responded_at: now }
      setBroadcastResponses(prev => prev.map(r => (r.id === existing.id ? { ...r, ...updates } : r)))
      await dbWrite(() => updateRow('navigator_broadcast_responses', existing.id, updates), 'update:navigator_broadcast_responses')
      return existing.id
    }
    const id = crypto.randomUUID()
    const row = {
      id,
      broadcast_id: broadcastId,
      navigator_id: navigatorId,
      chapter_member_id: chapterMemberId,
      response_value: responseValue,
      note: note ?? '',
      responded_at: now,
    }
    setBroadcastResponses(prev => [...prev, row])
    await dbWrite(() => insertRow('navigator_broadcast_responses', row), 'insert:navigator_broadcast_responses')
    return id
  }, [broadcastResponses, dbWrite])

  // ── Navigator Pairings CRUD ───────────────────────────────────
  const addPairing = useCallback(({ navigator_id, member_id, cadence }) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      fiscal_year: activeFiscalYear,
      navigator_id,
      member_id,
      started_at: now,
      ended_at: null,
      cadence: cadence || 'biweekly',
      status: 'active',
      created_at: now,
      updated_at: now,
    }
    setPairings(prev => [...prev, row])
    dbWrite(() => insertRow('navigator_pairings', row), 'insert:navigator_pairings')
    return row
  }, [activeChapterId, activeFiscalYear, dbWrite])

  const updatePairing = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setPairings(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
    dbWrite(() => updateRow('navigator_pairings', id, updates), 'update:navigator_pairings')
  }, [dbWrite])

  const endPairing = useCallback((id, status = 'completed') => {
    updatePairing(id, { status, ended_at: new Date().toISOString() })
  }, [updatePairing])

  // Reassign by ending the existing pairing and starting a fresh one with the new navigator.
  // Preserves history; the new pairing has its own session/feedback timeline.
  const reassignPairing = useCallback((id, newNavigatorId) => {
    const existing = pairings.find(p => p.id === id)
    if (!existing) return null
    updatePairing(id, { status: 'reassigned', ended_at: new Date().toISOString() })
    return addPairing({
      navigator_id: newNavigatorId,
      member_id: existing.member_id,
      cadence: existing.cadence,
    })
  }, [pairings, updatePairing, addPairing])

  const deletePairing = useCallback((id) => {
    setPairings(prev => prev.filter(p => p.id !== id))
    dbWrite(() => deleteRow('navigator_pairings', id), 'delete:navigator_pairings')
  }, [dbWrite])

  // ── Navigator Sessions (touch log) ────────────────────────────
  const logSession = useCallback(({ pairing_id, session_date, notes }) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      pairing_id,
      session_date: session_date || new Date().toISOString().slice(0, 10),
      notes: notes || '',
      created_at: now,
    }
    setSessions(prev => [...prev, row])
    dbWrite(() => insertRow('navigator_sessions', row), 'insert:navigator_sessions')
    return row
  }, [dbWrite])

  const deleteSession = useCallback((id) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('navigator_sessions', id), 'delete:navigator_sessions')
  }, [dbWrite])

  // ── Navigator Feedback (member's reaction) ────────────────────
  const submitFeedback = useCallback(({ pairing_id, chapter_member_id, reaction, note }) => {
    const id = crypto.randomUUID()
    const row = {
      id,
      pairing_id,
      chapter_member_id,
      reaction,
      note: note || '',
      created_at: new Date().toISOString(),
    }
    setFeedback(prev => [...prev, row])
    dbWrite(() => insertRow('navigator_feedback', row), 'insert:navigator_feedback')
    return row
  }, [dbWrite])

  const deleteFeedback = useCallback((id) => {
    setFeedback(prev => prev.filter(f => f.id !== id))
    dbWrite(() => deleteRow('navigator_feedback', id), 'delete:navigator_feedback')
  }, [dbWrite])

  // ── New Member Profiles ───────────────────────────────────────
  const upsertNewMemberProfile = useCallback((chapter_member_id, patch) => {
    const existing = newMemberProfiles.find(p => p.chapter_member_id === chapter_member_id)
    const now = new Date().toISOString()
    if (existing) {
      const updates = { ...patch, updated_at: now }
      setNewMemberProfiles(prev => prev.map(p => (p.id === existing.id ? { ...p, ...updates } : p)))
      dbWrite(() => updateRow('new_member_profiles', existing.id, updates), 'update:new_member_profiles')
      return existing.id
    }
    const id = crypto.randomUUID()
    const row = {
      id,
      chapter_id: activeChapterId,
      chapter_member_id,
      joined_on: patch.joined_on ?? null,
      placement_notes: patch.placement_notes ?? '',
      expectations_set_at: patch.expectations_set_at ?? null,
      expectations_notes: patch.expectations_notes ?? '',
      first_year_renewal_status: patch.first_year_renewal_status ?? 'unknown',
      first_year_renewal_notes: patch.first_year_renewal_notes ?? '',
      created_at: now,
      updated_at: now,
    }
    setNewMemberProfiles(prev => [...prev, row])
    dbWrite(() => insertRow('new_member_profiles', row), 'insert:new_member_profiles')
    return id
  }, [activeChapterId, newMemberProfiles, dbWrite])

  // ── Breaking Barriers Dinners ─────────────────────────────────
  const addDinner = useCallback((data) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      fiscal_year: activeFiscalYear,
      title: data.title || 'Breaking Barriers Dinner',
      dinner_date: data.dinner_date || null,
      dinner_time: data.dinner_time || '',
      host_member_id: data.host_member_id || null,
      facilitator_member_id: data.facilitator_member_id || null,
      venue_id: data.venue_id || null,
      status: data.status || 'planning',
      notes: data.notes || '',
      host_rating: data.host_rating ?? null,
      facilitator_rating: data.facilitator_rating ?? null,
      host_rating_notes: data.host_rating_notes || '',
      facilitator_rating_notes: data.facilitator_rating_notes || '',
      reminders_sent_at: null,
      created_at: now,
      updated_at: now,
    }
    setBbDinners(prev => [...prev, row])
    dbWrite(() => insertRow('breaking_barriers_dinners', row), 'insert:breaking_barriers_dinners')
    return row
  }, [activeChapterId, activeFiscalYear, dbWrite])

  const updateDinner = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setBbDinners(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)))
    dbWrite(() => updateRow('breaking_barriers_dinners', id, updates), 'update:breaking_barriers_dinners')
  }, [dbWrite])

  const deleteDinner = useCallback((id) => {
    setBbDinners(prev => prev.filter(d => d.id !== id))
    setBbAttendees(prev => prev.filter(a => a.dinner_id !== id))
    setBbBudgetItems(prev => prev.filter(b => b.dinner_id !== id))
    dbWrite(() => deleteRow('breaking_barriers_dinners', id), 'delete:breaking_barriers_dinners')
  }, [dbWrite])

  const addAttendee = useCallback((dinner_id, chapter_member_id) => {
    if (bbAttendees.some(a => a.dinner_id === dinner_id && a.chapter_member_id === chapter_member_id)) return null
    const id = crypto.randomUUID()
    const row = {
      id,
      dinner_id,
      chapter_member_id,
      rsvp_status: 'invited',
      reminder_sent_at: null,
      created_at: new Date().toISOString(),
    }
    setBbAttendees(prev => [...prev, row])
    dbWrite(() => insertRow('breaking_barriers_attendees', row), 'insert:breaking_barriers_attendees')
    return row
  }, [bbAttendees, dbWrite])

  const updateAttendee = useCallback((id, patch) => {
    setBbAttendees(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)))
    dbWrite(() => updateRow('breaking_barriers_attendees', id, patch), 'update:breaking_barriers_attendees')
  }, [dbWrite])

  const removeAttendee = useCallback((id) => {
    setBbAttendees(prev => prev.filter(a => a.id !== id))
    dbWrite(() => deleteRow('breaking_barriers_attendees', id), 'delete:breaking_barriers_attendees')
  }, [dbWrite])

  // Mark every attendee on the dinner with a reminder_sent_at timestamp.
  // Actual SMS/email delivery is wired through the chapter's outbound stack
  // (e.g. Resend / Twilio) — this just records the chair's "send" action.
  const sendDinnerReminders = useCallback((dinner_id) => {
    const now = new Date().toISOString()
    setBbAttendees(prev => prev.map(a =>
      a.dinner_id === dinner_id ? { ...a, reminder_sent_at: now } : a
    ))
    const attendees = bbAttendees.filter(a => a.dinner_id === dinner_id)
    attendees.forEach(a => {
      dbWrite(() => updateRow('breaking_barriers_attendees', a.id, { reminder_sent_at: now }), 'update:breaking_barriers_attendees')
    })
    updateDinner(dinner_id, { reminders_sent_at: now })
    return attendees.length
  }, [bbAttendees, dbWrite, updateDinner])

  // ── Dinner Budget Items (reuses budget_items table via dinner_id) ──
  const upsertDinnerBudgetItem = useCallback((dinner_id, category, field, value) => {
    const existing = bbBudgetItems.find(b => b.dinner_id === dinner_id && b.category === category)
    const numeric = Math.round(Number(value) || 0)
    if (existing) {
      const updates = { [field]: numeric }
      setBbBudgetItems(prev => prev.map(b => (b.id === existing.id ? { ...b, ...updates } : b)))
      dbWrite(() => updateRow('budget_items', existing.id, updates), 'update:budget_items')
      return existing.id
    }
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      event_id: null,
      dinner_id,
      category,
      description: '',
      estimated_amount: 0,
      actual_amount: 0,
      budget_amount: 0,
      contracted_amount: 0,
      [field]: numeric,
      created_at: now,
      updated_at: now,
    }
    setBbBudgetItems(prev => [...prev, row])
    dbWrite(() => insertRow('budget_items', row), 'insert:budget_items')
    return id
  }, [bbBudgetItems, dbWrite])

  // ── Helpers ───────────────────────────────────────────────────
  const activePairingsForNavigator = useCallback((navigatorId) => {
    return pairings.filter(p => p.navigator_id === navigatorId && p.status === 'active').length
  }, [pairings])

  const sessionsForPairing = useCallback((pairingId) => {
    return sessions
      .filter(s => s.pairing_id === pairingId)
      .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))
  }, [sessions])

  const feedbackForPairing = useCallback((pairingId) => {
    return feedback
      .filter(f => f.pairing_id === pairingId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  }, [feedback])

  const profileForMember = useCallback((memberId) => {
    return newMemberProfiles.find(p => p.chapter_member_id === memberId) || null
  }, [newMemberProfiles])

  const attendeesForDinner = useCallback((dinnerId) => {
    return bbAttendees.filter(a => a.dinner_id === dinnerId)
  }, [bbAttendees])

  const budgetItemsForDinner = useCallback((dinnerId) => {
    return bbBudgetItems.filter(b => b.dinner_id === dinnerId)
  }, [bbBudgetItems])

  const dinnerBudgetTotal = useCallback((dinnerId, field = 'budget_amount') => {
    return bbBudgetItems
      .filter(b => b.dinner_id === dinnerId)
      .reduce((sum, b) => sum + (b[field] || 0), 0)
  }, [bbBudgetItems])

  const activePairingsForMentor = useCallback((mentorId) => {
    return mentorPairings.filter(p => p.mentor_id === mentorId && p.status === 'active').length
  }, [mentorPairings])

  const responsesForBroadcast = useCallback((broadcastId) => {
    return broadcastResponses.filter(r => r.broadcast_id === broadcastId)
  }, [broadcastResponses])

  const navigatorForMember = useCallback((chapterMemberId) => {
    if (!chapterMemberId) return null
    return navigators.find(n => n.chapter_member_id === chapterMemberId && n.status === 'active') || null
  }, [navigators])

  const value = {
    navigators, pairings, resources, mentors, mentorPairings, broadcasts, broadcastResponses,
    sessions, feedback, newMemberProfiles,
    bbDinners, bbAttendees, bbBudgetItems,
    loading, dbError, clearDbError: () => setDbError(null),
    addNavigator, updateNavigator, retireNavigator, restoreNavigator, deleteNavigator,
    activePairingsForNavigator,
    addMentor, updateMentor, retireMentor, restoreMentor, deleteMentor,
    activePairingsForMentor,
    createBroadcast, closeBroadcast, reopenBroadcast, deleteBroadcast,
    submitBroadcastResponse, responsesForBroadcast, navigatorForMember,
    addPairing, updatePairing, endPairing, reassignPairing, deletePairing,
    logSession, deleteSession, sessionsForPairing,
    submitFeedback, deleteFeedback, feedbackForPairing,
    upsertNewMemberProfile, profileForMember,
    addDinner, updateDinner, deleteDinner,
    addAttendee, updateAttendee, removeAttendee, sendDinnerReminders,
    attendeesForDinner, upsertDinnerBudgetItem, budgetItemsForDinner, dinnerBudgetTotal,
  }

  return createElement(EngagementStoreContext.Provider, { value }, children)
}

export function useEngagementStore() {
  const ctx = useContext(EngagementStoreContext)
  if (!ctx) throw new Error('useEngagementStore must be used within EngagementStoreProvider')
  return ctx
}
