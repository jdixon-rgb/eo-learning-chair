import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured } from './supabase'
import { fetchAll, insertRow, updateRow, deleteRow, upsertRow } from './db'
import { mockChapter, mockSpeakers, mockVenues, mockEvents, mockBudgetItems, mockContractChecklists, mockSAPs } from './mockData'
import { supabase } from './supabase'

// localStorage cache for offline fallback
const STORAGE_KEY = 'eo-learning-chair-store'

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }
  return null
}

function saveCache(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage full */ }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const cached = loadCache()

  // State - initialized from cache or mock data
  const [chapter, setChapter] = useState(cached?.chapter ?? mockChapter)
  const [speakers, setSpeakers] = useState(cached?.speakers ?? mockSpeakers)
  const [venues, setVenues] = useState(cached?.venues ?? mockVenues)
  const [events, setEvents] = useState(cached?.events ?? mockEvents)
  const [budgetItems, setBudgetItems] = useState(cached?.budgetItems ?? mockBudgetItems)
  const [contractChecklists, setContractChecklists] = useState(cached?.contractChecklists ?? mockContractChecklists)
  const [saps, setSaps] = useState(cached?.saps ?? mockSAPs)
  const [scenarios, setScenarios] = useState(cached?.scenarios ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)

  // Persist to localStorage cache on every state change
  useEffect(() => {
    saveCache({ chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios })
  }, [chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios])

  // Fetch from Supabase on mount (anon reads allowed via RLS)
  useEffect(() => {
    if (!isSupabaseConfigured() || hasFetched.current) return
    hasFetched.current = true
    hydrate()

    async function hydrate() {
      try {
        const [
          chaptersRes,
          speakersRes,
          venuesRes,
          eventsRes,
          budgetRes,
          checklistsRes,
          sapsRes,
          scenariosRes,
        ] = await Promise.all([
          fetchAll('chapters'),
          fetchAll('speakers'),
          fetchAll('venues'),
          fetchAll('events'),
          fetchAll('budget_items'),
          fetchAll('contract_checklists'),
          fetchAll('saps'),
          fetchAll('scenarios'),
        ])

        // Check for errors
        const errors = [chaptersRes, speakersRes, venuesRes, eventsRes, budgetRes, checklistsRes, sapsRes, scenariosRes]
          .filter(r => r.error)
          .map(r => r.error)

        if (errors.length > 0) {
          console.error('Supabase fetch errors:', errors)
          setDbError('Some data failed to load from the database. Using cached data.')
          setLoading(false)
          return
        }

        // Hydrate state from Supabase
        if (chaptersRes.data?.length > 0) setChapter(chaptersRes.data[0])
        if (speakersRes.data) setSpeakers(speakersRes.data)
        if (venuesRes.data) setVenues(venuesRes.data)
        if (eventsRes.data) setEvents(eventsRes.data)
        if (budgetRes.data) setBudgetItems(budgetRes.data)
        if (checklistsRes.data) setContractChecklists(checklistsRes.data)
        if (sapsRes.data) setSaps(sapsRes.data)
        if (scenariosRes.data) setScenarios(scenariosRes.data)

        setDbError(null)
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err)
        setDbError('Could not connect to database. Using cached data.')
      } finally {
        setLoading(false)
      }
    }

    hydrate()
  }, [])

  // Helper: fire Supabase write in background, log errors
  const dbWrite = useCallback(async (fn) => {
    if (!isSupabaseConfigured()) return
    try {
      const result = await fn()
      if (result?.error) {
        console.error('Supabase write error:', result.error)
        setDbError('Failed to save changes. Data is cached locally.')
      }
      return result
    } catch (err) {
      console.error('Supabase write failed:', err)
      setDbError('Failed to save changes. Data is cached locally.')
    }
  }, [])

  // Reset to defaults (dev only - clears cache, refetches from DB)
  const resetToDefaults = useCallback(() => {
    setChapter(mockChapter)
    setSpeakers(mockSpeakers)
    setVenues(mockVenues)
    setEvents(mockEvents)
    setBudgetItems(mockBudgetItems)
    setContractChecklists(mockContractChecklists)
    setSaps(mockSAPs)
    setScenarios([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // ── Speaker operations ──

  const addSpeaker = useCallback((speaker) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSpeaker = { ...speaker, id, chapter_id: chapter.id, created_at: now, updated_at: now }
    setSpeakers(prev => [...prev, newSpeaker])
    dbWrite(() => insertRow('speakers', newSpeaker))
    return newSpeaker
  }, [chapter.id, dbWrite])

  const updateSpeaker = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: now } : s))
    dbWrite(() => updateRow('speakers', id, updates))
  }, [dbWrite])

  const deleteSpeaker = useCallback((id) => {
    setSpeakers(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('speakers', id))
  }, [dbWrite])

  // ── Venue operations ──

  const addVenue = useCallback((venue) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newVenue = { ...venue, id, chapter_id: chapter.id, created_at: now }
    setVenues(prev => [...prev, newVenue])
    dbWrite(() => insertRow('venues', newVenue))
    return newVenue
  }, [chapter.id, dbWrite])

  const updateVenue = useCallback((id, updates) => {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('venues', id, updates))
  }, [dbWrite])

  const deleteVenue = useCallback((id) => {
    setVenues(prev => prev.filter(v => v.id !== id))
    dbWrite(() => deleteRow('venues', id))
  }, [dbWrite])

  // ── Event operations ──

  const addEvent = useCallback((event) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newEvent = { ...event, id, chapter_id: chapter.id, status: 'planning', created_at: now, updated_at: now }
    setEvents(prev => [...prev, newEvent])
    dbWrite(() => insertRow('events', newEvent))
    return newEvent
  }, [chapter.id, dbWrite])

  const updateEvent = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updated_at: now } : e))
    dbWrite(() => updateRow('events', id, updates))
  }, [dbWrite])

  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    // Budget items and checklists cascade in DB; clean up local state too
    setBudgetItems(prev => prev.filter(b => b.event_id !== id))
    setContractChecklists(prev => prev.filter(c => c.event_id !== id))
    dbWrite(() => deleteRow('events', id))
  }, [dbWrite])

  // ── Budget operations ──

  const addBudgetItem = useCallback((item) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newItem = { ...item, id, created_at: now }
    setBudgetItems(prev => [...prev, newItem])
    dbWrite(() => insertRow('budget_items', newItem))
    return newItem
  }, [dbWrite])

  const updateBudgetItem = useCallback((id, updates) => {
    setBudgetItems(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    dbWrite(() => updateRow('budget_items', id, updates))
  }, [dbWrite])

  const deleteBudgetItem = useCallback((id) => {
    setBudgetItems(prev => prev.filter(b => b.id !== id))
    dbWrite(() => deleteRow('budget_items', id))
  }, [dbWrite])

  // ── Contract checklist operations ──

  const getOrCreateChecklist = useCallback((eventId) => {
    const existing = contractChecklists.find(c => c.event_id === eventId)
    if (existing) return existing
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newChecklist = {
      id,
      event_id: eventId,
      jurisdiction_local: false,
      indemnification_clause: false,
      mfn_clause: false,
      run_of_show_included: false,
      av_requirements_specified: false,
      cancellation_terms: false,
      recording_rights: false,
      contract_signed: false,
      contract_notes: '',
      created_at: now,
      updated_at: now,
    }
    setContractChecklists(prev => [...prev, newChecklist])
    dbWrite(() => insertRow('contract_checklists', newChecklist))
    return newChecklist
  }, [contractChecklists, dbWrite])

  const updateChecklist = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setContractChecklists(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: now } : c))
    dbWrite(() => updateRow('contract_checklists', id, updates))
  }, [dbWrite])

  // ── SAP operations ──

  const addSAP = useCallback((sap) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSAP = { ...sap, id, chapter_id: chapter.id, created_at: now }
    setSaps(prev => [...prev, newSAP])
    dbWrite(() => insertRow('saps', newSAP))
    return newSAP
  }, [chapter.id, dbWrite])

  const updateSAP = useCallback((id, updates) => {
    setSaps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    dbWrite(() => updateRow('saps', id, updates))
  }, [dbWrite])

  const deleteSAP = useCallback((id) => {
    setSaps(prev => prev.filter(s => s.id !== id))
    // Remove SAP from any events that reference it
    setEvents(prev => prev.map(e => ({
      ...e,
      sap_ids: (e.sap_ids || []).filter(sid => sid !== id),
    })))
    dbWrite(async () => {
      // Delete the SAP
      await deleteRow('saps', id)
      // Remove from event arrays - use raw supabase for array_remove
      if (isSupabaseConfigured()) {
        await supabase.rpc('remove_sap_from_events', { sap_id: id }).catch(() => {
          // Fallback: update each event individually
          // This is handled by the optimistic local state update above
        })
      }
    })
  }, [dbWrite])

  // ── Scenario operations ──

  const addScenario = useCallback((scenario) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newScenario = { ...scenario, id, chapter_id: chapter.id, created_at: now }
    setScenarios(prev => [...prev, newScenario])
    dbWrite(() => insertRow('scenarios', newScenario))
    return newScenario
  }, [chapter.id, dbWrite])

  const updateScenario = useCallback((id, updates) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    dbWrite(() => updateRow('scenarios', id, updates))
  }, [dbWrite])

  const deleteScenario = useCallback((id) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('scenarios', id))
  }, [dbWrite])

  // ── Chapter operations ──

  const updateChapter = useCallback((updates) => {
    setChapter(prev => ({ ...prev, ...updates }))
    dbWrite(() => {
      if (chapter.id) return updateRow('chapters', chapter.id, updates)
    })
  }, [chapter.id, dbWrite])

  // ── Computed values ──
  const totalBudgetUsed = budgetItems.reduce((sum, item) => sum + (item.actual_amount || item.estimated_amount || 0), 0)
  const totalEstimated = budgetItems.reduce((sum, item) => sum + (item.estimated_amount || 0), 0)
  const budgetRemaining = chapter.total_budget - totalEstimated

  const value = {
    // Data
    chapter,
    speakers,
    venues,
    events,
    budgetItems,
    contractChecklists,
    saps,
    scenarios,

    // Status
    loading,
    dbError,
    clearDbError: () => setDbError(null),

    // Speaker ops
    addSpeaker,
    updateSpeaker,
    deleteSpeaker,

    // Venue ops
    addVenue,
    updateVenue,
    deleteVenue,

    // Event ops
    addEvent,
    updateEvent,
    deleteEvent,

    // Budget ops
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,

    // Contract ops
    getOrCreateChecklist,
    updateChecklist,

    // SAP ops
    addSAP,
    updateSAP,
    deleteSAP,

    // Scenario ops
    addScenario,
    updateScenario,
    deleteScenario,

    // Chapter ops
    updateChapter,

    // Utility
    resetToDefaults,

    // Computed
    totalBudgetUsed,
    totalEstimated,
    budgetRemaining,
  }

  return createElement(StoreContext.Provider, { value }, children)
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
