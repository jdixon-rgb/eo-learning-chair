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
  const [constitutions, setConstitutions] = useState(cached?.constitutions ?? [])
  const [constitutionVersions, setConstitutionVersions] = useState(cached?.constitutionVersions ?? [])
  const [constitutionRatifications, setConstitutionRatifications] = useState(cached?.constitutionRatifications ?? [])
  const [healthAssessments, setHealthAssessments] = useState(cached?.healthAssessments ?? [])
  const [atRiskEntries, setAtRiskEntries] = useState(cached?.atRiskEntries ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory, agendas, agendaItems, constitutions, constitutionVersions, constitutionRatifications, healthAssessments, atRiskEntries })
  }, [activeChapterId, forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory, agendas, agendaItems, constitutions, constitutionVersions, constitutionRatifications, healthAssessments, atRiskEntries])

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
      if (c.constitutions) setConstitutions(c.constitutions)
      if (c.constitutionVersions) setConstitutionVersions(c.constitutionVersions)
      if (c.constitutionRatifications) setConstitutionRatifications(c.constitutionRatifications)
      if (c.healthAssessments) setHealthAssessments(c.healthAssessments)
      if (c.atRiskEntries) setAtRiskEntries(c.atRiskEntries)
    }
    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [rolesRes, docsRes, calRes, intRes, ratRes, histRes, agendaRes, itemsRes, constRes, versRes, ratifyRes, fhaRes, farRes] = await Promise.all([
          fetchByChapter('forum_role_assignments', activeChapterId),
          fetchByChapter('forum_documents', activeChapterId),
          fetchByChapter('forum_calendar_events', activeChapterId),
          fetchByChapter('sap_forum_interest', activeChapterId),
          fetchByChapter('sap_forum_ratings', activeChapterId),
          fetchByChapter('forum_history_members', activeChapterId),
          fetchByChapter('forum_agendas', activeChapterId),
          supabase.from('forum_agenda_items').select('*'),
          fetchByChapter('forum_constitutions', activeChapterId),
          fetchByChapter('forum_constitution_versions', activeChapterId),
          fetchByChapter('forum_constitution_ratifications', activeChapterId),
          fetchByChapter('forum_health_assessments', activeChapterId),
          fetchByChapter('forum_at_risk_entries', activeChapterId),
        ])
        if (rolesRes.data) setForumRoles(rolesRes.data)
        if (docsRes.data) setForumDocs(docsRes.data)
        if (calRes.data) setForumCalendar(calRes.data)
        if (intRes.data) setSapInterest(intRes.data)
        if (ratRes.data) setSapRatings(ratRes.data)
        if (histRes.data) setForumHistory(histRes.data)
        if (agendaRes.data) setAgendas(agendaRes.data)
        if (itemsRes.data) setAgendaItems(itemsRes.data)
        if (constRes.data) setConstitutions(constRes.data)
        if (versRes.data) setConstitutionVersions(versRes.data)
        if (ratifyRes.data) setConstitutionRatifications(ratifyRes.data)
        if (fhaRes.data) setHealthAssessments(fhaRes.data)
        if (farRes.data) setAtRiskEntries(farRes.data)
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

  // ── Constitution CRUD ───────────────────────────────────────
  // Create a constitution (if none exists for the forum) and a v1 draft version.
  // Returns the new draft version.
  const createConstitutionDraft = useCallback((forumId, authorMemberId) => {
    const now = new Date().toISOString()
    // Find or create the constitution row for this forum
    let constitution = constitutions.find(c => c.forum_id === forumId)
    if (!constitution) {
      constitution = {
        id: crypto.randomUUID(),
        chapter_id: activeChapterId,
        forum_id: forumId,
        created_at: now,
      }
      setConstitutions(prev => [...prev, constitution])
      dbWrite(() => insertRow('forum_constitutions', constitution), 'insert:forum_constitutions')
    }
    // Figure out next version number
    const existing = constitutionVersions.filter(v => v.constitution_id === constitution.id)
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map(v => v.version_number)) + 1
    const version = {
      id: crypto.randomUUID(),
      constitution_id: constitution.id,
      chapter_id: activeChapterId,
      version_number: nextVersion,
      status: 'draft',
      title: 'Forum Constitution',
      preamble: '',
      sections: [],
      authored_by: authorMemberId ?? null,
      created_at: now,
      proposed_at: null,
      adopted_at: null,
      updated_at: now,
    }
    setConstitutionVersions(prev => [...prev, version])
    dbWrite(() => insertRow('forum_constitution_versions', version), 'insert:forum_constitution_versions')
    return version
  }, [activeChapterId, constitutions, constitutionVersions, dbWrite])

  // Clone the current adopted version into a new draft (for amendments).
  const proposeAmendment = useCallback((forumId, authorMemberId) => {
    const constitution = constitutions.find(c => c.forum_id === forumId)
    if (!constitution) return null
    const adopted = constitutionVersions.find(v => v.constitution_id === constitution.id && v.status === 'adopted')
    const now = new Date().toISOString()
    const existing = constitutionVersions.filter(v => v.constitution_id === constitution.id)
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map(v => v.version_number)) + 1
    const version = {
      id: crypto.randomUUID(),
      constitution_id: constitution.id,
      chapter_id: activeChapterId,
      version_number: nextVersion,
      status: 'draft',
      title: adopted?.title || 'Forum Constitution',
      preamble: adopted?.preamble || '',
      sections: adopted?.sections ? JSON.parse(JSON.stringify(adopted.sections)) : [],
      authored_by: authorMemberId ?? null,
      created_at: now,
      proposed_at: null,
      adopted_at: null,
      updated_at: now,
    }
    setConstitutionVersions(prev => [...prev, version])
    dbWrite(() => insertRow('forum_constitution_versions', version), 'insert:forum_constitution_versions')
    return version
  }, [activeChapterId, constitutions, constitutionVersions, dbWrite])

  const updateConstitutionVersion = useCallback((versionId, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setConstitutionVersions(prev => prev.map(v => v.id === versionId ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('forum_constitution_versions', versionId, updates), 'update:forum_constitution_versions')
  }, [dbWrite])

  const proposeConstitutionVersion = useCallback((versionId) => {
    const now = new Date().toISOString()
    const updates = { status: 'proposed', proposed_at: now, updated_at: now }
    setConstitutionVersions(prev => prev.map(v => v.id === versionId ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('forum_constitution_versions', versionId, updates), 'propose:forum_constitution_versions')
  }, [dbWrite])

  const adoptConstitutionVersion = useCallback((versionId) => {
    const version = constitutionVersions.find(v => v.id === versionId)
    if (!version) return
    const now = new Date().toISOString()
    // Archive any previously adopted version for this constitution
    const prevAdopted = constitutionVersions.find(v => v.constitution_id === version.constitution_id && v.status === 'adopted')
    if (prevAdopted) {
      const archiveUpdates = { status: 'archived', updated_at: now }
      setConstitutionVersions(prev => prev.map(v => v.id === prevAdopted.id ? { ...v, ...archiveUpdates } : v))
      dbWrite(() => updateRow('forum_constitution_versions', prevAdopted.id, archiveUpdates), 'archive:forum_constitution_versions')
    }
    const updates = { status: 'adopted', adopted_at: now, updated_at: now }
    setConstitutionVersions(prev => prev.map(v => v.id === versionId ? { ...v, ...updates } : v))
    dbWrite(() => updateRow('forum_constitution_versions', versionId, updates), 'adopt:forum_constitution_versions')
  }, [constitutionVersions, dbWrite])

  const deleteConstitutionVersion = useCallback((versionId) => {
    setConstitutionVersions(prev => prev.filter(v => v.id !== versionId))
    setConstitutionRatifications(prev => prev.filter(r => r.version_id !== versionId))
    dbWrite(() => deleteRow('forum_constitution_versions', versionId), 'delete:forum_constitution_versions')
  }, [dbWrite])

  // ── Forum Health Assessments ────────────────────────────────
  // One row per (forum_id, fiscal_year). Upsert by that pair so the
  // dashboard's per-field edits don't need to know whether the row
  // already exists.
  const upsertHealthAssessment = useCallback((forumId, fiscalYear, patch, assessedByMemberId) => {
    const existing = healthAssessments.find(
      a => a.forum_id === forumId && a.fiscal_year === fiscalYear
    )
    const now = new Date().toISOString()
    if (existing) {
      const updates = { ...patch, updated_at: now }
      if (assessedByMemberId) updates.assessed_by = assessedByMemberId
      setHealthAssessments(prev =>
        prev.map(a => a.id === existing.id ? { ...a, ...updates } : a)
      )
      dbWrite(
        () => updateRow('forum_health_assessments', existing.id, updates),
        'update:forum_health_assessments'
      )
      return { ...existing, ...updates }
    }
    const row = {
      id: crypto.randomUUID(),
      chapter_id: activeChapterId,
      forum_id: forumId,
      fiscal_year: fiscalYear,
      lifecycle_stage: null,
      lifecycle_note: '',
      constitution_reviewed: null,
      constitution_review_note: '',
      one_pager_complete: null,
      one_pager_note: '',
      roles_assigned: null,
      roles_note: '',
      chair_notes: '',
      handoff_narrative: '',
      assessed_by: assessedByMemberId ?? null,
      created_at: now,
      updated_at: now,
      ...patch,
    }
    setHealthAssessments(prev => [...prev, row])
    dbWrite(
      () => insertRow('forum_health_assessments', row),
      'insert:forum_health_assessments'
    )
    return row
  }, [activeChapterId, healthAssessments, dbWrite])

  // ── At-Risk Member Entries ──────────────────────────────────
  // Co-owned by Forum Health Chair + Forum Placement Chair. One open
  // entry per (forum × member); resolved entries pile up as history.
  const addAtRiskEntry = useCallback((entry, createdByMemberId) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      risk_level: 'medium',
      reasons: [],
      notes: '',
      better_fit_note: '',
      recommended_action: null,
      status: 'open',
      resolution_outcome: '',
      last_reviewed_at: now,
      created_by: createdByMemberId ?? null,
      created_at: now,
      updated_at: now,
      ...entry,
    }
    setAtRiskEntries(prev => [...prev, row])
    dbWrite(() => insertRow('forum_at_risk_entries', row), 'insert:forum_at_risk_entries')
    return row
  }, [activeChapterId, dbWrite])

  const updateAtRiskEntry = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setAtRiskEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    dbWrite(() => updateRow('forum_at_risk_entries', id, updates), 'update:forum_at_risk_entries')
  }, [dbWrite])

  const resolveAtRiskEntry = useCallback((id, resolutionOutcome) => {
    const now = new Date().toISOString()
    const updates = {
      status: 'resolved',
      resolution_outcome: resolutionOutcome || '',
      updated_at: now,
    }
    setAtRiskEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    dbWrite(() => updateRow('forum_at_risk_entries', id, updates), 'resolve:forum_at_risk_entries')
  }, [dbWrite])

  const reopenAtRiskEntry = useCallback((id) => {
    const updates = {
      status: 'open',
      resolution_outcome: '',
      updated_at: new Date().toISOString(),
    }
    setAtRiskEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    dbWrite(() => updateRow('forum_at_risk_entries', id, updates), 'reopen:forum_at_risk_entries')
  }, [dbWrite])

  const touchAtRiskReviewed = useCallback((id) => {
    const now = new Date().toISOString()
    const updates = { last_reviewed_at: now, updated_at: now }
    setAtRiskEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    dbWrite(() => updateRow('forum_at_risk_entries', id, updates), 'review:forum_at_risk_entries')
  }, [dbWrite])

  const deleteAtRiskEntry = useCallback((id) => {
    setAtRiskEntries(prev => prev.filter(e => e.id !== id))
    dbWrite(() => deleteRow('forum_at_risk_entries', id), 'delete:forum_at_risk_entries')
  }, [dbWrite])

  const ratifyConstitutionVersion = useCallback((versionId, memberId) => {
    // Don't insert a duplicate ratification
    if (constitutionRatifications.some(r => r.version_id === versionId && r.member_id === memberId)) return
    const row = {
      id: crypto.randomUUID(),
      version_id: versionId,
      chapter_id: activeChapterId,
      member_id: memberId,
      signed_at: new Date().toISOString(),
    }
    setConstitutionRatifications(prev => [...prev, row])
    dbWrite(() => insertRow('forum_constitution_ratifications', row), 'insert:forum_constitution_ratifications')
  }, [activeChapterId, constitutionRatifications, dbWrite])

  const value = {
    forumRoles, forumDocs, forumCalendar, sapInterest, sapRatings, forumHistory,
    agendas, agendaItems,
    constitutions, constitutionVersions, constitutionRatifications,
    healthAssessments,
    atRiskEntries,
    loading, dbError, clearDbError: () => setDbError(null),
    addForumRole, updateForumRole, deleteForumRole,
    addForumCalEvent, updateForumCalEvent, deleteForumCalEvent,
    addForumDoc, deleteForumDoc,
    toggleSapInterest, upsertSapRating,
    addHistoryMember, deleteHistoryMember,
    addAgenda, updateAgenda, deleteAgenda,
    addAgendaItem, updateAgendaItem, deleteAgendaItem,
    createConstitutionDraft, proposeAmendment, updateConstitutionVersion,
    proposeConstitutionVersion, adoptConstitutionVersion, deleteConstitutionVersion,
    ratifyConstitutionVersion,
    upsertHealthAssessment,
    addAtRiskEntry, updateAtRiskEntry, resolveAtRiskEntry,
    reopenAtRiskEntry, touchAtRiskReviewed, deleteAtRiskEntry,
  }

  return createElement(ForumStoreContext.Provider, { value }, children)
}

export function useForumStore() {
  const ctx = useContext(ForumStoreContext)
  if (!ctx) throw new Error('useForumStore must be used within ForumStoreProvider')
  return ctx
}
