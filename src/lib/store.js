import { useState, useCallback, createContext, useContext, createElement } from 'react'
import { mockChapter, mockSpeakers, mockVenues, mockEvents, mockBudgetItems, mockContractChecklists } from './mockData'

// Simple in-memory store that mimics Supabase operations
// Will be replaced with real Supabase calls when connected

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [chapter, setChapter] = useState(mockChapter)
  const [speakers, setSpeakers] = useState(mockSpeakers)
  const [venues, setVenues] = useState(mockVenues)
  const [events, setEvents] = useState(mockEvents)
  const [budgetItems, setBudgetItems] = useState(mockBudgetItems)
  const [contractChecklists, setContractChecklists] = useState(mockContractChecklists)
  const [userRole] = useState('learning_chair')

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
    userRole,

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

    // Chapter ops
    updateChapter,

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
