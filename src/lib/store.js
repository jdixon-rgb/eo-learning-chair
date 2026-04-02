import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured } from './supabase'
import { fetchAll, fetchByChapter, insertRow, updateRow, deleteRow, upsertRow, uploadFile, deleteFile } from './db'
import { mockChapter, mockSpeakers, mockVenues, mockEvents, mockBudgetItems, mockContractChecklists, mockSAPs } from './mockData'
import { supabase } from './supabase'
import { useChapter } from './chapter'

// localStorage cache for offline fallback (key is per-chapter)
function storageKey(chapterId) {
  return `eo-learning-chair-store-${chapterId}`
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

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()

  const cached = loadCache(activeChapterId)

  // State - initialized from cache or mock data
  const [chapter, setChapter] = useState(cached?.chapter ?? mockChapter)
  const [speakers, setSpeakers] = useState(cached?.speakers ?? mockSpeakers)
  const [venues, setVenues] = useState(cached?.venues ?? mockVenues)
  const [events, setEvents] = useState(cached?.events ?? mockEvents)
  const [budgetItems, setBudgetItems] = useState(cached?.budgetItems ?? mockBudgetItems)
  const [contractChecklists, setContractChecklists] = useState(cached?.contractChecklists ?? mockContractChecklists)
  const [saps, setSaps] = useState(cached?.saps ?? mockSAPs)
  const [scenarios, setScenarios] = useState(cached?.scenarios ?? [])
  const [eventDocuments, setEventDocuments] = useState(cached?.eventDocuments ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  // Persist to localStorage cache on every state change (per-chapter)
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios, eventDocuments })
  }, [activeChapterId, chapter, speakers, venues, events, budgetItems, contractChecklists, saps, scenarios, eventDocuments])

  // Fetch from Supabase when chapter changes (anon reads allowed via RLS)
  useEffect(() => {
    // Reset hasFetched when activeChapterId changes
    if (prevChapterId.current !== activeChapterId) {
      hasFetched.current = false
      prevChapterId.current = activeChapterId
    }

    if (!isSupabaseConfigured() || hasFetched.current) { setLoading(false); return }
    if (!isChapterReady) return
    if (!activeChapterId) { setLoading(false); return }
    hasFetched.current = true

    // Load from chapter-specific cache while fetching
    const chapterCache = loadCache(activeChapterId)
    if (chapterCache) {
      if (chapterCache.chapter) setChapter(chapterCache.chapter)
      if (chapterCache.speakers) setSpeakers(chapterCache.speakers)
      if (chapterCache.venues) setVenues(chapterCache.venues)
      if (chapterCache.events) setEvents(chapterCache.events)
      if (chapterCache.budgetItems) setBudgetItems(chapterCache.budgetItems)
      if (chapterCache.contractChecklists) setContractChecklists(chapterCache.contractChecklists)
      if (chapterCache.saps) setSaps(chapterCache.saps)
      if (chapterCache.scenarios) setScenarios(chapterCache.scenarios)
      if (chapterCache.eventDocuments) setEventDocuments(chapterCache.eventDocuments)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      const failedTables = []

      // Helper: fetch a table, return data or null on failure
      async function safeFetch(name, fetchFn) {
        try {
          const res = await fetchFn()
          if (res.error) {
            console.warn(`Failed to fetch ${name}:`, res.error)
            failedTables.push(name)
            return null
          }
          return res.data
        } catch (err) {
          console.warn(`Failed to fetch ${name}:`, err)
          failedTables.push(name)
          return null
        }
      }

      try {
        const [chaptersData, speakersData, venuesData, eventsData, budgetData, checklistsData, sapsData, scenariosData, docsData] =
          await Promise.all([
            safeFetch('chapters', () => fetchAll('chapters')),
            safeFetch('speakers', () => fetchByChapter('speakers', activeChapterId)),
            safeFetch('venues', () => fetchByChapter('venues', activeChapterId)),
            safeFetch('events', () => fetchByChapter('events', activeChapterId)),
            safeFetch('budget_items', () => fetchAll('budget_items')),
            safeFetch('contract_checklists', () => fetchAll('contract_checklists')),
            safeFetch('saps', () => fetchByChapter('saps', activeChapterId)),
            safeFetch('scenarios', () => fetchByChapter('scenarios', activeChapterId)),
            safeFetch('event_documents', () => fetchByChapter('event_documents', activeChapterId)),
          ])

        // Hydrate whichever tables succeeded
        if (chaptersData) {
          const activeChapter = chaptersData.find(c => c.id === activeChapterId)
          if (activeChapter) setChapter(activeChapter)
          else if (chaptersData.length > 0) setChapter(chaptersData[0])
        }
        if (speakersData) setSpeakers(speakersData)
        if (venuesData) setVenues(venuesData)
        if (eventsData) setEvents(eventsData)
        if (budgetData) setBudgetItems(budgetData)
        if (checklistsData) setContractChecklists(checklistsData)
        if (sapsData) setSaps(sapsData)
        if (scenariosData) setScenarios(scenariosData)
        if (docsData) setEventDocuments(docsData)

        if (failedTables.length > 0) {
          console.error('Tables that failed to load:', failedTables)
          setDbError(`Failed to load: ${failedTables.join(', ')}. Other data loaded OK.`)
        } else {
          setDbError(null)
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err)
        setDbError('Could not connect to database. Using cached data.')
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

  // Helper: fire Supabase write in background, log errors
  const dbWrite = useCallback(async (fn, label = 'unknown') => {
    if (!isSupabaseConfigured()) return
    try {
      const result = await fn()
      if (result?.error) {
        const msg = result.error?.message || result.error?.details || JSON.stringify(result.error)
        console.error(`[dbWrite:${label}] Supabase error:`, msg, result.error)
        setDbError(`Save failed (${label}): ${msg}`)
      }
      return result
    } catch (err) {
      console.error(`[dbWrite:${label}] Exception:`, err)
      setDbError(`Save failed (${label}): ${err.message}`)
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
    if (activeChapterId) localStorage.removeItem(storageKey(activeChapterId))
  }, [activeChapterId])

  // ── Speaker operations ──

  const addSpeaker = useCallback((speaker) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSpeaker = { ...speaker, id, chapter_id: activeChapterId, created_at: now, updated_at: now }
    setSpeakers(prev => [...prev, newSpeaker])
    dbWrite(() => insertRow('speakers', newSpeaker), 'insert:speakers')
    return newSpeaker
  }, [activeChapterId, dbWrite])

  const updateSpeaker = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updates, updated_at: now } : s))
    dbWrite(() => updateRow('speakers', id, updates), 'update:speakers')
  }, [dbWrite])

  const deleteSpeaker = useCallback((id) => {
    setSpeakers(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('speakers', id), 'delete:speakers')
  }, [dbWrite])

  // ── Venue operations ──

  const addVenue = useCallback((venue) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newVenue = { ...venue, id, chapter_id: activeChapterId, created_at: now }
    setVenues(prev => [...prev, newVenue])
    dbWrite(() => insertRow('venues', newVenue), 'insert:venues')
    return newVenue
  }, [activeChapterId, dbWrite])

  const updateVenue = useCallback((id, updates) => {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('venues', id, updates), 'update:venues')
  }, [dbWrite])

  const deleteVenue = useCallback((id) => {
    setVenues(prev => prev.filter(v => v.id !== id))
    dbWrite(() => deleteRow('venues', id), 'delete:venues')
  }, [dbWrite])

  const archiveVenue = useCallback((id, reason, programYear) => {
    const now = new Date().toISOString()
    const updates = {
      pipeline_stage: 'archived',
      archive_reason: reason || '',
      program_year: programYear || '',
      archived_at: now,
      updated_at: now,
    }
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('venues', id, updates), 'archive:venues')
  }, [dbWrite])

  const restoreVenue = useCallback((id) => {
    const updates = {
      pipeline_stage: 'researching',
      archived_at: null,
      archive_reason: '',
      updated_at: new Date().toISOString(),
    }
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('venues', id, updates), 'restore:venues')
  }, [dbWrite])

  // ── Event operations ──

  const addEvent = useCallback((event) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newEvent = { ...event, id, chapter_id: activeChapterId, status: 'planning', created_at: now, updated_at: now }
    setEvents(prev => [...prev, newEvent])
    dbWrite(() => insertRow('events', newEvent), 'insert:events')
    return newEvent
  }, [activeChapterId, dbWrite])

  const updateEvent = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updated_at: now } : e))
    dbWrite(() => updateRow('events', id, updates), 'update:events')
  }, [dbWrite])

  const deleteEvent = useCallback((id) => {
    // Clean up storage files for documents belonging to this event
    const docsToDelete = eventDocuments.filter(d => d.event_id === id)
    if (docsToDelete.length > 0) {
      const paths = docsToDelete.map(d => d.storage_path)
      deleteFile('event-documents', paths).catch(() => {})
    }
    setEvents(prev => prev.filter(e => e.id !== id))
    // Budget items, checklists, and documents cascade in DB; clean up local state too
    setBudgetItems(prev => prev.filter(b => b.event_id !== id))
    setContractChecklists(prev => prev.filter(c => c.event_id !== id))
    setEventDocuments(prev => prev.filter(d => d.event_id !== id))
    dbWrite(() => deleteRow('events', id), 'delete:events')
  }, [dbWrite, eventDocuments])

  // ── Budget operations ──

  const addBudgetItem = useCallback((item) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newItem = { ...item, id, created_at: now }
    setBudgetItems(prev => [...prev, newItem])
    dbWrite(() => insertRow('budget_items', newItem), 'insert:budget_items')
    return newItem
  }, [dbWrite])

  const updateBudgetItem = useCallback((id, updates) => {
    setBudgetItems(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    dbWrite(() => updateRow('budget_items', id, updates), 'update:budget_items')
  }, [dbWrite])

  const deleteBudgetItem = useCallback((id) => {
    setBudgetItems(prev => prev.filter(b => b.id !== id))
    dbWrite(() => deleteRow('budget_items', id), 'delete:budget_items')
  }, [dbWrite])

  const upsertBudgetItem = useCallback((eventId, category, field, value) => {
    const existing = budgetItems.find(b => b.event_id === eventId && b.category === category)
    if (existing) {
      updateBudgetItem(existing.id, { [field]: value })
    } else {
      addBudgetItem({ event_id: eventId, category, description: '', budget_amount: 0, contracted_amount: 0, actual_amount: null, [field]: value })
    }
  }, [budgetItems, updateBudgetItem, addBudgetItem])

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
    dbWrite(() => insertRow('contract_checklists', newChecklist), 'insert:contract_checklists')
    return newChecklist
  }, [activeChapterId, contractChecklists, dbWrite])

  const updateChecklist = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setContractChecklists(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: now } : c))
    dbWrite(() => updateRow('contract_checklists', id, updates), 'update:contract_checklists')
  }, [dbWrite])

  // ── SAP operations ──

  const addSAP = useCallback((sap) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSAP = { ...sap, id, chapter_id: activeChapterId, created_at: now }
    setSaps(prev => [...prev, newSAP])
    dbWrite(() => insertRow('saps', newSAP), 'insert:saps')
    return newSAP
  }, [activeChapterId, dbWrite])

  const updateSAP = useCallback((id, updates) => {
    setSaps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    dbWrite(() => updateRow('saps', id, updates), 'update:saps')
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
    }, 'delete:saps')
  }, [dbWrite])

  // ── Event Document operations ──

  const addEventDocument = useCallback(async (doc, file) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const storagePath = `${activeChapterId}/${doc.event_id}/${id}_${file.name}`
    const row = {
      ...doc,
      id,
      chapter_id: activeChapterId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      created_at: now,
      updated_at: now,
    }

    // Optimistic add with uploading flag
    setEventDocuments(prev => [...prev, { ...row, _uploading: true }])

    try {
      const uploadRes = await uploadFile('event-documents', storagePath, file)
      if (uploadRes?.error) {
        console.error('File upload error:', uploadRes.error)
        setEventDocuments(prev => prev.filter(d => d.id !== id))
        setDbError('Failed to upload file.')
        return null
      }

      const insertRes = await insertRow('event_documents', row)
      if (insertRes?.error) {
        console.error('Document insert error:', insertRes.error)
        setDbError('Failed to save document record.')
      }

      // Remove uploading flag
      setEventDocuments(prev => prev.map(d => d.id === id ? { ...row } : d))
      return row
    } catch (err) {
      console.error('Document upload failed:', err)
      setEventDocuments(prev => prev.filter(d => d.id !== id))
      setDbError('Failed to upload document.')
      return null
    }
  }, [activeChapterId])

  const updateEventDocument = useCallback((id, updates) => {
    const now = new Date().toISOString()
    setEventDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates, updated_at: now } : d))
    dbWrite(() => updateRow('event_documents', id, updates), 'update:event_documents')
  }, [dbWrite])

  const deleteEventDocument = useCallback((id) => {
    const doc = eventDocuments.find(d => d.id === id)
    setEventDocuments(prev => prev.filter(d => d.id !== id))
    if (doc?.storage_path) {
      deleteFile('event-documents', doc.storage_path).catch(() => {})
    }
    dbWrite(() => deleteRow('event_documents', id), 'delete:event_documents')
  }, [dbWrite, eventDocuments])

  // ── Scenario operations ──

  const addScenario = useCallback((scenario) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newScenario = { ...scenario, id, chapter_id: activeChapterId, created_at: now }
    setScenarios(prev => [...prev, newScenario])
    dbWrite(() => insertRow('scenarios', newScenario), 'insert:scenarios')
    return newScenario
  }, [activeChapterId, dbWrite])

  const updateScenario = useCallback((id, updates) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    dbWrite(() => updateRow('scenarios', id, updates), 'update:scenarios')
  }, [dbWrite])

  const deleteScenario = useCallback((id) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
    dbWrite(() => deleteRow('scenarios', id), 'delete:scenarios')
  }, [dbWrite])

  // ── Chapter operations ──

  const updateChapter = useCallback((updates) => {
    setChapter(prev => ({ ...prev, ...updates }))
    dbWrite(() => {
      if (activeChapterId) return updateRow('chapters', activeChapterId, updates)
    }, 'update:chapters')
  }, [activeChapterId, dbWrite])

  // ── Computed values ──
  const totalBudgeted = budgetItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0)
  const totalContracted = budgetItems.reduce((sum, item) => sum + (item.contracted_amount || 0), 0)
  const totalActualSpent = budgetItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
  const budgetRemaining = chapter.total_budget - totalBudgeted

  const value = {
    // Data
    chapter,
    speakers,
    venues,
    events,
    budgetItems,
    contractChecklists,
    eventDocuments,
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
    archiveVenue,
    restoreVenue,

    // Event ops
    addEvent,
    updateEvent,
    deleteEvent,

    // Budget ops
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    upsertBudgetItem,

    // Contract ops
    getOrCreateChecklist,
    updateChecklist,

    // Document ops
    addEventDocument,
    updateEventDocument,
    deleteEventDocument,

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
    totalBudgeted,
    totalContracted,
    totalActualSpent,
    budgetRemaining,
  }

  return createElement(StoreContext.Provider, { value }, children)
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
