import { useState, useCallback, useEffect, createContext, useContext, createElement } from 'react'
import { mockChapter, mockSpeakers, mockVenues, mockEvents, mockBudgetItems, mockContractChecklists, mockSAPs } from './mockData'

// Persisted store — saves to localStorage on every change, hydrates on load.
// Will be replaced with real Supabase calls when connected.

const STORAGE_KEY = 'eo-learning-chair-store'

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted — fall through to defaults */ }
  return null
}

function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage full — silently skip */ }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const saved = loadPersistedState()

  const [chapter, setChapter] = useState(saved?.chapter ?? mockChapter)
  const [speakers, setSpeakers] = useState(saved?.speakers ?? mockSpeakers)
  const [venues, setVenues] = useState(saved?.venues ?? mockVenues)
  const [events, setEvents] = useState(saved?.events ?? mockEvents)
  const [budgetItems, setBudgetItems] = useState(saved?.budgetItems ?? mockBudgetItems)
  const [contractChecklists, setContractChecklists] = useState(saved?.contractChecklists ?? mockContractChecklists)
  const [saps, setSaps] = useState(saved?.saps ?? mockSAPs)
  const [scenarios, setScenarios] = useState(saved?.scenarios ?? [])

  // Persist every state change to localStorage
  useEffect(() => {
    persistState({ chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios })
  }, [chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios])

  // Reset all data back to mock defaults (available via Settings)
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

  // Speaker operations
  const addSpeaker = useCallback((speaker) => {
    const newSpeaker = { ...speaker, id: crypto.randomUUID(), chapter_id: chapter.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setSpeakers(prev => [...prev, newSpeaker])
    return newSpeaker
  }, [chapter.id])

  const updateSpeaker = useCallback((id, updates) => {
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s))
  }, [])

  const deleteSpeaker = useCallback((id) => {
    setSpeakers(prev => prev.filter(s => s.id !== id))
  }, [])

  // Venue operations
  const addVenue = useCallback((venue) => {
    const newVenue = { ...venue, id: crypto.randomUUID(), chapter_id: chapter.id, created_at: new Date().toISOString() }
    setVenues(prev => [...prev, newVenue])
    return newVenue
  }, [chapter.id])

  const updateVenue = useCallback((id, updates) => {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
  }, [])

  const deleteVenue = useCallback((id) => {
    setVenues(prev => prev.filter(v => v.id !== id))
  }, [])

  // Event operations
  const addEvent = useCallback((event) => {
    const newEvent = { ...event, id: crypto.randomUUID(), chapter_id: chapter.id, status: 'planning', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [chapter.id])

  const updateEvent = useCallback((id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e))
  }, [])

  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    setBudgetItems(prev => prev.filter(b => b.event_id !== id))
    setContractChecklists(prev => prev.filter(c => c.event_id !== id))
  }, [])

  // Budget operations
  const addBudgetItem = useCallback((item) => {
    const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    setBudgetItems(prev => [...prev, newItem])
    return newItem
  }, [])

  const updateBudgetItem = useCallback((id, updates) => {
    setBudgetItems(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }, [])

  const deleteBudgetItem = useCallback((id) => {
    setBudgetItems(prev => prev.filter(b => b.id !== id))
  }, [])

  // Contract checklist operations
  const getOrCreateChecklist = useCallback((eventId) => {
    const existing = contractChecklists.find(c => c.event_id === eventId)
    if (existing) return existing
    const newChecklist = {
      id: crypto.randomUUID(),
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
    }
    setContractChecklists(prev => [...prev, newChecklist])
    return newChecklist
  }, [contractChecklists])

  const updateChecklist = useCallback((id, updates) => {
    setContractChecklists(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
  }, [])

  // SAP operations
  const addSAP = useCallback((sap) => {
    const newSAP = { ...sap, id: crypto.randomUUID(), chapter_id: chapter.id, created_at: new Date().toISOString() }
    setSaps(prev => [...prev, newSAP])
    return newSAP
  }, [chapter.id])

  const updateSAP = useCallback((id, updates) => {
    setSaps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const deleteSAP = useCallback((id) => {
    setSaps(prev => prev.filter(s => s.id !== id))
    // Also remove this SAP from any events that reference it
    setEvents(prev => prev.map(e => ({
      ...e,
      sap_ids: (e.sap_ids || []).filter(sid => sid !== id),
    })))
  }, [])

  // Scenario operations
  const addScenario = useCallback((scenario) => {
    const newScenario = { ...scenario, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    setScenarios(prev => [...prev, newScenario])
    return newScenario
  }, [])

  const updateScenario = useCallback((id, updates) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const deleteScenario = useCallback((id) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  // Chapter operations
  const updateChapter = useCallback((updates) => {
    setChapter(prev => ({ ...prev, ...updates }))
  }, [])

  // Computed values
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
