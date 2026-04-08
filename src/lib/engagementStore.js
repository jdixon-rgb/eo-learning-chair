import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'

const EngagementStoreContext = createContext(null)

function storageKey(chapterId) {
  return `eo-engagement-store-${chapterId}`
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
  } catch { /* full */ }
}

export function EngagementStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const cached = loadCache(activeChapterId)

  const [navigators, setNavigators] = useState(cached?.navigators ?? [])
  const [pairings, setPairings] = useState(cached?.pairings ?? [])
  const [resources, setResources] = useState(cached?.resources ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  // Persist
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { navigators, pairings, resources })
  }, [activeChapterId, navigators, pairings, resources])

  // Hydrate from Supabase when chapter changes
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
      if (chapterCache.navigators) setNavigators(chapterCache.navigators)
      if (chapterCache.pairings) setPairings(chapterCache.pairings)
      if (chapterCache.resources) setResources(chapterCache.resources)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [navsRes, pairingsRes, resourcesRes] = await Promise.all([
          fetchByChapter('navigators', activeChapterId),
          fetchByChapter('navigator_pairings', activeChapterId),
          fetchByChapter('navigator_resources', activeChapterId),
        ])
        if (navsRes.data) setNavigators(navsRes.data)
        if (pairingsRes.data) setPairings(pairingsRes.data)
        if (resourcesRes.data) setResources(resourcesRes.data)
      } catch (err) {
        setDbError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

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

  // ── Helpers ───────────────────────────────────────────────────
  const activePairingsForNavigator = useCallback((navigatorId) => {
    return pairings.filter(p => p.navigator_id === navigatorId && p.status === 'active').length
  }, [pairings])

  const value = {
    navigators, pairings, resources,
    loading, dbError, clearDbError: () => setDbError(null),
    addNavigator, updateNavigator, retireNavigator, restoreNavigator, deleteNavigator,
    activePairingsForNavigator,
  }

  return createElement(EngagementStoreContext.Provider, { value }, children)
}

export function useEngagementStore() {
  const ctx = useContext(EngagementStoreContext)
  if (!ctx) throw new Error('useEngagementStore must be used within EngagementStoreProvider')
  return ctx
}
