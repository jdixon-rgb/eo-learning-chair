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
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevFetchKey = useRef(`${activeChapterId}:${activeFiscalYear}`)

  // Persist
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, activeFiscalYear, { navigators, pairings, resources, mentors, mentorPairings })
  }, [activeChapterId, activeFiscalYear, navigators, pairings, resources, mentors, mentorPairings])

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
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [navsRes, pairingsRes, resourcesRes, mentorsRes, mentorPairingsRes] = await Promise.all([
          fetchByChapter('navigators', activeChapterId),
          supabase.from('navigator_pairings').select('*').eq('chapter_id', activeChapterId).eq('fiscal_year', activeFiscalYear),
          fetchByChapter('navigator_resources', activeChapterId),
          fetchByChapter('mentors', activeChapterId),
          fetchByChapter('mentor_pairings', activeChapterId),
        ])
        if (navsRes.data) setNavigators(navsRes.data)
        if (pairingsRes.data) setPairings(pairingsRes.data)
        if (resourcesRes.data) setResources(resourcesRes.data)
        if (mentorsRes.data) setMentors(mentorsRes.data)
        if (mentorPairingsRes.data) setMentorPairings(mentorPairingsRes.data)
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

  // ── Helpers ───────────────────────────────────────────────────
  const activePairingsForNavigator = useCallback((navigatorId) => {
    return pairings.filter(p => p.navigator_id === navigatorId && p.status === 'active').length
  }, [pairings])

  const activePairingsForMentor = useCallback((mentorId) => {
    return mentorPairings.filter(p => p.mentor_id === mentorId && p.status === 'active').length
  }, [mentorPairings])

  const value = {
    navigators, pairings, resources, mentors, mentorPairings,
    loading, dbError, clearDbError: () => setDbError(null),
    addNavigator, updateNavigator, retireNavigator, restoreNavigator, deleteNavigator,
    activePairingsForNavigator,
    addMentor, updateMentor, retireMentor, restoreMentor, deleteMentor,
    activePairingsForMentor,
  }

  return createElement(EngagementStoreContext.Provider, { value }, children)
}

export function useEngagementStore() {
  const ctx = useContext(EngagementStoreContext)
  if (!ctx) throw new Error('useEngagementStore must be used within EngagementStoreProvider')
  return ctx
}
