import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'

const BoardStoreContext = createContext(null)

function storageKey(chapterId) {
  return `eo-board-store-${chapterId}`
}

function loadCache(chapterId) {
  try {
    const raw = localStorage.getItem(storageKey(chapterId))
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }
  return null
}

function saveCache(chapterId, state) {
  try {
    localStorage.setItem(storageKey(chapterId), JSON.stringify(state))
  } catch { /* storage full */ }
}

export function BoardStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const cached = loadCache(activeChapterId)

  const [chairReports, setChairReports] = useState(cached?.chairReports ?? [])
  const [communications, setCommunications] = useState(cached?.communications ?? [])
  const [forums, setForums] = useState(cached?.forums ?? [])
  const [memberScorecards, setMemberScorecards] = useState(cached?.memberScorecards ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  // Persist to localStorage
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { chairReports, communications, forums, memberScorecards })
  }, [activeChapterId, chairReports, communications, forums, memberScorecards])

  // Fetch from Supabase
  useEffect(() => {
    if (prevChapterId.current !== activeChapterId) {
      hasFetched.current = false
      prevChapterId.current = activeChapterId
    }
    if (!isSupabaseConfigured() || hasFetched.current) { setLoading(false); return }
    if (!isChapterReady) return
    if (!activeChapterId) { setLoading(false); return }
    hasFetched.current = true

    const chapterCache = loadCache(activeChapterId)
    if (chapterCache) {
      if (chapterCache.chairReports) setChairReports(chapterCache.chairReports)
      if (chapterCache.communications) setCommunications(chapterCache.communications)
      if (chapterCache.forums) setForums(chapterCache.forums)
      if (chapterCache.memberScorecards) setMemberScorecards(chapterCache.memberScorecards)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [reportsRes, commsRes, forumsRes, scorecardsRes] = await Promise.all([
          fetchByChapter('chair_reports', activeChapterId),
          fetchByChapter('chapter_communications', activeChapterId),
          fetchByChapter('forums', activeChapterId),
          fetchByChapter('member_scorecards', activeChapterId),
        ])

        const errors = [reportsRes, commsRes, forumsRes, scorecardsRes]
          .filter(r => r.error)
          .map(r => r.error)

        if (errors.length > 0) {
          console.error('Board store fetch errors:', errors)
          setDbError('Some board data failed to load.')
          setLoading(false)
          return
        }

        if (reportsRes.data) setChairReports(reportsRes.data)
        if (commsRes.data) setCommunications(commsRes.data)
        if (forumsRes.data) setForums(forumsRes.data)
        if (scorecardsRes.data) setMemberScorecards(scorecardsRes.data)
        setDbError(null)
      } catch (err) {
        console.error('Board store hydrate failed:', err)
        setDbError('Could not load board data.')
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

  const dbWrite = useCallback(async (fn) => {
    if (!isSupabaseConfigured()) return
    try {
      const result = await fn()
      if (result?.error) console.error('Board write error:', result.error)
      return result
    } catch (err) {
      console.error('Board write failed:', err)
    }
  }, [])

  // ── Chair Report CRUD ──
  const addChairReport = useCallback((report) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...report, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setChairReports(prev => [...prev, row])
    dbWrite(() => insertRow('chair_reports', row))
    return row
  }, [activeChapterId, dbWrite])

  const updateChairReport = useCallback((id, updates) => {
    setChairReports(prev => prev.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
    dbWrite(() => updateRow('chair_reports', id, updates))
  }, [dbWrite])

  const deleteChairReport = useCallback((id) => {
    setChairReports(prev => prev.filter(r => r.id !== id))
    dbWrite(() => deleteRow('chair_reports', id))
  }, [dbWrite])

  // ── Communications CRUD ──
  const addCommunication = useCallback((comm) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...comm, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setCommunications(prev => [...prev, row])
    dbWrite(() => insertRow('chapter_communications', row))
    return row
  }, [activeChapterId, dbWrite])

  const updateCommunication = useCallback((id, updates) => {
    setCommunications(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
    dbWrite(() => updateRow('chapter_communications', id, updates))
  }, [dbWrite])

  const deleteCommunication = useCallback((id) => {
    setCommunications(prev => prev.filter(c => c.id !== id))
    dbWrite(() => deleteRow('chapter_communications', id))
  }, [dbWrite])

  // ── Forum CRUD ──
  const addForum = useCallback((forum) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...forum, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setForums(prev => [...prev, row])
    dbWrite(() => insertRow('forums', row))
    return row
  }, [activeChapterId, dbWrite])

  const updateForum = useCallback((id, updates) => {
    setForums(prev => prev.map(f => f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f))
    dbWrite(() => updateRow('forums', id, updates))
  }, [dbWrite])

  const deleteForum = useCallback((id) => {
    setForums(prev => prev.filter(f => f.id !== id))
    dbWrite(() => deleteRow('forums', id))
  }, [dbWrite])

  // ── Member Scorecard CRUD ──
  const addScorecard = useCallback((scorecard) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { ...scorecard, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setMemberScorecards(prev => [...prev, row])
    dbWrite(() => insertRow('member_scorecards', row))
    return row
  }, [activeChapterId, dbWrite])

  const updateScorecard = useCallback((id, updates) => {
    setMemberScorecards(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s))
    dbWrite(() => updateRow('member_scorecards', id, updates))
  }, [dbWrite])

  const deleteScorecard = useCallback((id) => {
    setMemberScorecards(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('member_scorecards', id))
  }, [dbWrite])

  const value = {
    chairReports, communications, forums, memberScorecards,
    loading, dbError, clearDbError: () => setDbError(null),
    addChairReport, updateChairReport, deleteChairReport,
    addCommunication, updateCommunication, deleteCommunication,
    addForum, updateForum, deleteForum,
    addScorecard, updateScorecard, deleteScorecard,
  }

  return createElement(BoardStoreContext.Provider, { value }, children)
}

export function useBoardStore() {
  const ctx = useContext(BoardStoreContext)
  if (!ctx) throw new Error('useBoardStore must be used within BoardStoreProvider')
  return ctx
}
