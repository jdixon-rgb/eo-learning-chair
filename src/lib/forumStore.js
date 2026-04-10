import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef, useMemo } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'

const ForumStoreContext = createContext(null)

function storageKey(chapterId) { return `eo-forum-store-${chapterId}` }
function loadCache(chapterId) {
  try { const raw = localStorage.getItem(storageKey(chapterId)); if (raw) return JSON.parse(raw) } catch {} return null
}
function saveCache(chapterId, state) {
  try { localStorage.setItem(storageKey(chapterId), JSON.stringify(state)) } catch {}
}

export function ForumStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const cached = loadCache(activeChapterId)

  const [forumRoles, setForumRoles] = useState(cached?.forumRoles ?? [])
  const [forumDocs, setForumDocs] = useState(cached?.forumDocs ?? [])
  const [forumCalendar, setForumCalendar] = useState(cached?.forumCalendar ?? [])
  const [sapInterest, setSapInterest] = useState(cached?.sapInterest ?? [])
  const [sapRatings, setSapRatings] = useState(cached?.sapRatings ?? [])
  const [forumHistory, setForumHistory] = useState(cached?.forumHistory ?? [])
  const [agendas, setAgendas] = useState(cached?.agendas ?? [])
  const [agendaItems, setAgendaItems] = useState(cached?.agendaItems ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory, agendas, agendaItems })
  }, [activeChapterId, forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory, agendas, agendaItems])

  useEffect(() => {
    if (prevChapterId.current !== activeChapterId) { hasFetched.current = false; prevChapterId.current = activeChapterId }
    if (!isSupabaseConfigured() || hasFetched.current) { setLoading(false); return }
    if (!isChapterReady || !activeChapterId) { setLoading(false); return }
    hasFetched.current = true

    const c = loadCache(activeChapterId)
    if (c) {
      if (c.forumRoles) setForumRoles(c.forumRoles)
      if (c.forumDocs) setForumDocs(c.forumDocs)
      if (c.forumCalendar) setForumCalendar(c.forumCalendar)
      if (c.sapInterest) setSapInterest(c.sapInterest)
      if (c.sapRatings) setSapRatings(c.sapRatings)
      if (c.forumHistory) setForumHistory(c.forumHistory)
      if (c.agendas) setAgendas(c.agendas)
      if (c.agendaItems) setAgendaItems(c.agendaItems)
    }
    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [rolesRes, docsRes, calRes, intRes, ratRes, histRes, agendaRes, itemsRes] = await Promise.all([
          fetchByChapter('forum_role_assignments', activeChapterId),
          fetchByChapter('forum_documents', activeChapterId),
          fetchByChapter('forum_calendar_events', activeChapterId),
          fetchByChapter('sap_forum_interest', activeChapterId),
          fetchByChapter('sap_forum_ratings', activeChapterId),
          fetchByChapter('forum_history_members', activeChapterId),
          fetchByChapter('forum_agendas', activeChapterId),
          supabase.from('forum_agenda_items').select('*'),
        ])
        if (rolesRes.data) setForumRoles(rolesRes.data)
        if (docsRes.data) setForumDocs(docsRes.data)
        if (calRes.data) setForumCalendar(calRes.data)
        if (intRes.data) setSapInterest(intRes.data)
        if (ratRes.data) setSapRatings(ratRes.data)
        if (histRes.data) setForumHistory(histRes.data)
        if (agendaRes.data) setAgendas(agendaRes.data)
        if (itemsRes.data) setAgendaItems(itemsRes.data)
      } catch (err) {
        setDbError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

  const dbWrite = useCallback(async (fn, label) => {
    if (!isSupabaseConfigured()) return
    try { const res = await fn(); if (res?.error) throw res.error }
    catch (err) { setDbError(`${label}: ${err.message || String(err)}`) }
  }, [])

  // ── Forum Role Assignments CRUD ─────────────────────────────
  const addForumRole = useCallback((r) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, chapter_id: activeChapterId, ...r, created_at: now, updated_at: now }
    setForumRoles(prev => [...prev, row])
    dbWrite(() => insertRow('forum_role_assignments', row), 'insert:forum_role_assignments')
    return row
  }, [activeChapterId, dbWrite])

  const updateForumRole = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setForumRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    dbWrite(() => updateRow('forum_role_assignments', id, updates), 'update:forum_role_assignments')
  }, [dbWrite])

  const deleteForumRole = useCallback((id) => {
    setForumRoles(prev => prev.filter(r => r.id !== id))
    dbWrite(() => deleteRow('forum_role_assignments', id), 'delete:forum_role_assignments')
  }, [dbWrite])

  // ── Forum Calendar CRUD ─────────────────────────────────────
  const addForumCalEvent = useCallback((e) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, chapter_id: activeChapterId, ...e, created_at: now, updated_at: now }
    setForumCalendar(prev => [...prev, row])
    dbWrite(() => insertRow('forum_calendar_events', row), 'insert:forum_calendar_events')
    return row
  }, [activeChapterId, dbWrite])

  const updateForumCalEvent = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setForumCalendar(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    dbWrite(() => updateRow('forum_calendar_events', id, updates), 'update:forum_calendar_events')
  }, [dbWrite])

  const deleteForumCalEvent = useCallback((id) => {
    setForumCalendar(prev => prev.filter(e => e.id !== id))
    dbWrite(() => deleteRow('forum_calendar_events', id), 'delete:forum_calendar_events')
  }, [dbWrite])

  // ── Forum Documents CRUD ────────────────────────────────────
  const addForumDoc = useCallback((d) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, chapter_id: activeChapterId, ...d, created_at: now, updated_at: now }
    setForumDocs(prev => [...prev, row])
    dbWrite(() => insertRow('forum_documents', row), 'insert:forum_documents')
    return row
  }, [activeChapterId, dbWrite])

  const deleteForumDoc = useCallback((id) => {
    setForumDocs(prev => prev.filter(d => d.id !== id))
    dbWrite(() => deleteRow('forum_documents', id), 'delete:forum_documents')
  }, [dbWrite])

  // ── SAP Interest ────────────────────────────────────────────
  const toggleSapInterest = useCallback(async (sapId, memberId, forumId, currentlyInterested) => {
    if (currentlyInterested) {
      // Find and remove
      const existing = sapInterest.find(i => i.sap_id === sapId && i.chapter_member_id === memberId)
      if (existing) {
        setSapInterest(prev => prev.filter(i => i.id !== existing.id))
        dbWrite(() => deleteRow('sap_forum_interest', existing.id), 'delete:sap_forum_interest')
      }
    } else {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const row = { id, chapter_id: activeChapterId, sap_id: sapId, chapter_member_id: memberId, forum_id: forumId, interested: true, created_at: now, updated_at: now }
      setSapInterest(prev => [...prev, row])
      dbWrite(() => insertRow('sap_forum_interest', row), 'insert:sap_forum_interest')
    }
  }, [activeChapterId, sapInterest, dbWrite])

  // ── SAP Ratings ─────────────────────────────────────────────
  const upsertSapRating = useCallback(async (sapId, memberId, forumId, rating, note) => {
    const existing = sapRatings.find(r => r.sap_id === sapId && r.chapter_member_id === memberId)
    if (existing) {
      const updates = { rating, note, updated_at: new Date().toISOString() }
      setSapRatings(prev => prev.map(r => r.id === existing.id ? { ...r, ...updates } : r))
      dbWrite(() => updateRow('sap_forum_ratings', existing.id, updates), 'update:sap_forum_ratings')
    } else {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const row = { id, chapter_id: activeChapterId, sap_id: sapId, chapter_member_id: memberId, forum_id: forumId, rating, note: note || '', created_at: now, updated_at: now }
      setSapRatings(prev => [...prev, row])
      dbWrite(() => insertRow('sap_forum_ratings', row), 'insert:sap_forum_ratings')
    }
  }, [activeChapterId, sapRatings, dbWrite])

  // ── Forum History CRUD ──────────────────────────────────────
  const addHistoryMember = useCallback((h) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, chapter_id: activeChapterId, ...h, created_at: now }
    setForumHistory(prev => [...prev, row])
    dbWrite(() => insertRow('forum_history_members', row), 'insert:forum_history_members')
    return row
  }, [activeChapterId, dbWrite])

  const deleteHistoryMember = useCallback((id) => {
    setForumHistory(prev => prev.filter(h => h.id !== id))
    dbWrite(() => deleteRow('forum_history_members', id), 'delete:forum_history_members')
  }, [dbWrite])

  // ── Agendas CRUD ────────────────────────────────────────────
  const addAgenda = useCallback((a) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, chapter_id: activeChapterId, ...a, created_at: now, updated_at: now }
    setAgendas(prev => [...prev, row])
    dbWrite(() => insertRow('forum_agendas', row), 'insert:forum_agendas')
    return row
  }, [activeChapterId, dbWrite])

  const updateAgenda = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setAgendas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    dbWrite(() => updateRow('forum_agendas', id, updates), 'update:forum_agendas')
  }, [dbWrite])

  const deleteAgenda = useCallback((id) => {
    setAgendas(prev => prev.filter(a => a.id !== id))
    setAgendaItems(prev => prev.filter(i => i.agenda_id !== id))
    dbWrite(() => deleteRow('forum_agendas', id), 'delete:forum_agendas')
  }, [dbWrite])

  const addAgendaItem = useCallback((item) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = { id, ...item, created_at: now, updated_at: now }
    setAgendaItems(prev => [...prev, row])
    dbWrite(() => insertRow('forum_agenda_items', row), 'insert:forum_agenda_items')
    return row
  }, [dbWrite])

  const updateAgendaItem = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setAgendaItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    dbWrite(() => updateRow('forum_agenda_items', id, updates), 'update:forum_agenda_items')
  }, [dbWrite])

  const deleteAgendaItem = useCallback((id) => {
    setAgendaItems(prev => prev.filter(i => i.id !== id))
    dbWrite(() => deleteRow('forum_agenda_items', id), 'delete:forum_agenda_items')
  }, [dbWrite])

  const value = {
    forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory,
    agendas, agendaItems,
    loading, dbError, clearDbError: () => setDbError(null),
    addForumRole, updateForumRole, deleteForumRole,
    addForumCalEvent, updateForumCalEvent, deleteForumCalEvent,
    addForumDoc, deleteForumDoc,
    toggleSapInterest, upsertSapRating,
    addHistoryMember, deleteHistoryMember,
    addAgenda, updateAgenda, deleteAgenda,
    addAgendaItem, updateAgendaItem, deleteAgendaItem,
  }

  return createElement(ForumStoreContext.Provider, { value }, children)
}

export function useForumStore() {
  const ctx = useContext(ForumStoreContext)
  if (!ctx) throw new Error('useForumStore must be used within ForumStoreProvider')
  return ctx
}
