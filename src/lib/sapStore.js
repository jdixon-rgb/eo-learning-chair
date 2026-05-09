import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'
import { mockSAPs, mockSAPContacts } from './mockData'

const SAPStoreContext = createContext(null)

function storageKey(chapterId) {
  return `eo-sap-store-${chapterId}`
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

export function SAPStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const cached = loadCache(activeChapterId)

  const [partners, setPartners] = useState(cached?.partners ?? mockSAPs)
  const [contacts, setContacts] = useState(cached?.contacts ?? mockSAPContacts)
  const [connectRequests, setConnectRequests] = useState(cached?.connectRequests ?? [])
  const [forumAppearances, setForumAppearances] = useState(cached?.forumAppearances ?? [])
  const [chapterFeedback, setChapterFeedback] = useState(cached?.chapterFeedback ?? [])
  const [engagements, setEngagements] = useState(cached?.engagements ?? [])
  const [memberInterest, setMemberInterest] = useState(cached?.memberInterest ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  // Persist
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { partners, contacts, connectRequests, forumAppearances, chapterFeedback, engagements, memberInterest })
  }, [activeChapterId, partners, contacts, connectRequests, forumAppearances, chapterFeedback, engagements, memberInterest])

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
      if (chapterCache.partners) setPartners(chapterCache.partners)
      if (chapterCache.contacts) setContacts(chapterCache.contacts)
      if (chapterCache.memberInterest) setMemberInterest(chapterCache.memberInterest)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const partnersRes = await fetchByChapter('saps', activeChapterId)
        if (partnersRes.data) setPartners(partnersRes.data)
        // sap_contacts may not exist yet — fetch separately so partner load isn't blocked
        try {
          const contactsRes = await fetchSAPContacts(activeChapterId)
          if (contactsRes) setContacts(contactsRes)
        } catch {
          // sap_contacts table may not exist; contacts will stay at defaults
          setContacts([])
        }
        // sap_member_interest is a newer table; degrade gracefully
        // if the migration hasn't been pushed yet.
        try {
          const interestRes = await fetchByChapter('sap_member_interest', activeChapterId)
          if (interestRes.data) setMemberInterest(interestRes.data)
        } catch {
          setMemberInterest([])
        }
      } catch (err) {
        setDbError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

  // sap_contacts doesn't have chapter_id directly — fetch via join or all and filter client-side
  async function fetchSAPContacts(chapterId) {
    if (!isSupabaseConfigured()) return mockSAPContacts
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('sap_contacts')
      .select('*, saps!inner(chapter_id)')
      .eq('saps.chapter_id', chapterId)
    if (error) throw error
    // Strip the joined saps object — we just used it for filtering
    return (data || []).map(({ saps, ...rest }) => rest)
  }

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

  // ── Partner CRUD ──────────────────────────────────────────────
  const addPartner = useCallback((partner) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      name: partner.name,
      industry: partner.industry ?? '',
      tier: partner.tier ?? 'gold',
      status: partner.status ?? 'active',
      description: partner.description ?? '',
      contribution_type: partner.contribution_type ?? null,
      contribution_description: partner.contribution_description ?? '',
      contact_email: partner.contact_email ?? '',
      contact_phone: partner.contact_phone ?? '',
      website: partner.website ?? '',
      annual_sponsorship: partner.annual_sponsorship ?? null,
      renewal_amount: partner.renewal_amount ?? null,
      notes: partner.notes ?? '',
      created_at: now,
      updated_at: now,
    }
    setPartners(prev => [...prev, row])
    dbWrite(() => insertRow('saps', row), 'insert:saps')
    return row
  }, [activeChapterId, dbWrite])

  const updatePartner = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setPartners(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
    dbWrite(() => updateRow('saps', id, updates), 'update:saps')
  }, [dbWrite])

  const deletePartner = useCallback((id) => {
    setPartners(prev => prev.filter(p => p.id !== id))
    // Cascade: remove contacts for this partner locally
    setContacts(prev => prev.filter(c => c.sap_id !== id))
    dbWrite(() => deleteRow('saps', id), 'delete:saps')
  }, [dbWrite])

  // ── Contact CRUD ──────────────────────────────────────────────
  const addContact = useCallback((contact) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      sap_id: contact.sap_id,
      name: contact.name,
      role: contact.role ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      is_primary: contact.is_primary ?? false,
      forum_trained: contact.forum_trained ?? false,
      forum_trained_date: contact.forum_trained_date ?? null,
      notes: contact.notes ?? '',
      created_at: now,
      updated_at: now,
    }
    setContacts(prev => [...prev, row])
    dbWrite(() => insertRow('sap_contacts', row), 'insert:sap_contacts')
    return row
  }, [dbWrite])

  const updateContact = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
    dbWrite(() => updateRow('sap_contacts', id, updates), 'update:sap_contacts')
  }, [dbWrite])

  const deleteContact = useCallback((id) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    dbWrite(() => deleteRow('sap_contacts', id), 'delete:sap_contacts')
  }, [dbWrite])

  // ── Connect Requests ──────────────────────────────────────────
  const addConnectRequest = useCallback((req) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      member_id: req.member_id,
      sap_id: req.sap_id,
      member_name: req.member_name ?? '',
      member_company: req.member_company ?? '',
      message: req.message ?? '',
      status: 'pending',
      created_at: now,
      updated_at: now,
    }
    setConnectRequests(prev => [...prev, row])
    dbWrite(() => insertRow('sap_connect_requests', row), 'insert:sap_connect_requests')
    return row
  }, [activeChapterId, dbWrite])

  const updateConnectRequest = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setConnectRequests(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
    dbWrite(() => updateRow('sap_connect_requests', id, updates), 'update:sap_connect_requests')
  }, [dbWrite])

  const connectRequestsForSAP = useCallback((sapId) => {
    return connectRequests.filter(r => r.sap_id === sapId)
  }, [connectRequests])

  // ── Forum Appearances ────────────────────────────────────────
  const addForumAppearance = useCallback((appearance) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      sap_contact_id: appearance.sap_contact_id,
      forum_name: appearance.forum_name ?? '',
      appearance_date: appearance.appearance_date ?? null,
      topic: appearance.topic ?? '',
      created_at: now,
    }
    setForumAppearances(prev => [...prev, row])
    dbWrite(() => insertRow('sap_forum_appearances', row), 'insert:sap_forum_appearances')
    return row
  }, [dbWrite])

  const deleteForumAppearance = useCallback((id) => {
    setForumAppearances(prev => prev.filter(a => a.id !== id))
    dbWrite(() => deleteRow('sap_forum_appearances', id), 'delete:sap_forum_appearances')
  }, [dbWrite])

  const appearancesForContact = useCallback((contactId) => {
    return forumAppearances.filter(a => a.sap_contact_id === contactId)
  }, [forumAppearances])

  const appearancesForSAP = useCallback((sapId) => {
    const contactIds = contacts.filter(c => c.sap_id === sapId).map(c => c.id)
    return forumAppearances.filter(a => contactIds.includes(a.sap_contact_id))
  }, [forumAppearances, contacts])

  // ── Chapter Feedback ─────────────────────────────────────────
  const addChapterFeedback = useCallback((fb) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      sap_contact_id: fb.is_anonymous ? null : fb.sap_contact_id,
      sap_id: fb.sap_id,
      rating: fb.rating,
      feedback_text: fb.feedback_text ?? '',
      is_anonymous: fb.is_anonymous ?? false,
      created_at: now,
    }
    setChapterFeedback(prev => [...prev, row])
    dbWrite(() => insertRow('sap_chapter_feedback', row), 'insert:sap_chapter_feedback')
    return row
  }, [dbWrite])

  // ── Event Engagements ─────────────────────────────────────────
  const addEngagement = useCallback((eng) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      event_id: eng.event_id,
      sap_id: eng.sap_id,
      sap_contact_id: eng.sap_contact_id ?? null,
      chapter_id: activeChapterId,
      role: eng.role ?? 'attending',
      topic: eng.topic ?? '',
      topic_description: eng.topic_description ?? '',
      time_slot: eng.time_slot ?? '',
      run_of_show_notes: eng.run_of_show_notes ?? '',
      av_needs: eng.av_needs ?? '',
      materials_notes: eng.materials_notes ?? '',
      materials_url: eng.materials_url ?? '',
      status: eng.status ?? 'invited',
      created_at: now,
      updated_at: now,
    }
    setEngagements(prev => [...prev, row])
    dbWrite(() => insertRow('sap_event_engagements', row), 'insert:sap_event_engagements')
    return row
  }, [activeChapterId, dbWrite])

  const updateEngagement = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setEngagements(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
    dbWrite(() => updateRow('sap_event_engagements', id, updates), 'update:sap_event_engagements')
  }, [dbWrite])

  const deleteEngagement = useCallback((id) => {
    setEngagements(prev => prev.filter(e => e.id !== id))
    dbWrite(() => deleteRow('sap_event_engagements', id), 'delete:sap_event_engagements')
  }, [dbWrite])

  const engagementsForEvent = useCallback((eventId) => {
    return engagements.filter(e => e.event_id === eventId)
  }, [engagements])

  const engagementsForContact = useCallback((contactId) => {
    return engagements.filter(e => e.sap_contact_id === contactId)
  }, [engagements])

  const engagementsForSAP = useCallback((sapId) => {
    return engagements.filter(e => e.sap_id === sapId)
  }, [engagements])

  // ── Prospect Pipeline ────────────────────────────────────────
  // A "prospect" is a SAP being courted but not yet active. Created
  // via addProspect, advanced through pipeline stages, and finally
  // promoted to status='active' once the contract is signed.
  const addProspect = useCallback((partner) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      name: partner.name,
      industry: partner.industry ?? '',
      tier: partner.tier ?? 'gold',
      status: 'prospect',
      pipeline_stage: partner.pipeline_stage ?? 'lead',
      description: partner.description ?? '',
      contribution_type: partner.contribution_type ?? null,
      contribution_description: partner.contribution_description ?? '',
      contact_email: partner.contact_email ?? '',
      contact_phone: partner.contact_phone ?? '',
      website: partner.website ?? '',
      annual_sponsorship: partner.annual_sponsorship ?? null,
      notes: partner.notes ?? '',
      created_at: now,
      updated_at: now,
    }
    setPartners(prev => [...prev, row])
    dbWrite(() => insertRow('saps', row), 'insert:saps:prospect')
    return row
  }, [activeChapterId, dbWrite])

  const advancePipelineStage = useCallback((sapId, stage) => {
    const updates = { pipeline_stage: stage, updated_at: new Date().toISOString() }
    setPartners(prev => prev.map(p => p.id === sapId ? { ...p, ...updates } : p))
    dbWrite(() => updateRow('saps', sapId, updates), 'update:saps:pipeline_stage')
  }, [dbWrite])

  const promoteProspectToActive = useCallback((sapId) => {
    const updates = { status: 'active', pipeline_stage: null, updated_at: new Date().toISOString() }
    setPartners(prev => prev.map(p => p.id === sapId ? { ...p, ...updates } : p))
    dbWrite(() => updateRow('saps', sapId, updates), 'update:saps:promote')
  }, [dbWrite])

  // Archive an active SAP that's not renewing — preserves the full
  // record so a future chair can revisit them. status flips to
  // 'inactive'; clears renewal_status since it no longer applies.
  const archivePartner = useCallback((sapId) => {
    const updates = { status: 'inactive', renewal_status: null, updated_at: new Date().toISOString() }
    setPartners(prev => prev.map(p => p.id === sapId ? { ...p, ...updates } : p))
    dbWrite(() => updateRow('saps', sapId, updates), 'update:saps:archive')
  }, [dbWrite])

  // Re-engage a past SAP — drop them back into the prospect pipeline
  // as a Lead. All historical fields (contact, sponsorship amount,
  // contribution type, notes) are preserved.
  const revivePartnerToProspect = useCallback((sapId) => {
    const updates = { status: 'prospect', pipeline_stage: 'lead', updated_at: new Date().toISOString() }
    setPartners(prev => prev.map(p => p.id === sapId ? { ...p, ...updates } : p))
    dbWrite(() => updateRow('saps', sapId, updates), 'update:saps:revive')
  }, [dbWrite])

  // ── Renewal Intent (active SAPs only) ────────────────────────
  // SAP Chair sets one of: 'renewing' | 'uncertain' | 'not_renewing'.
  // Surfaces in President / Executive Director dashboards so leadership
  // sees at-risk partnerships early.
  const setRenewalStatus = useCallback((sapId, renewalStatus, renewalNotes) => {
    const updates = {
      renewal_status: renewalStatus,
      renewal_status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (typeof renewalNotes === 'string') updates.renewal_notes = renewalNotes
    setPartners(prev => prev.map(p => p.id === sapId ? { ...p, ...updates } : p))
    dbWrite(() => updateRow('saps', sapId, updates), 'update:saps:renewal')
  }, [dbWrite])

  // ── Member Interest (chapter-wide) ───────────────────────────
  // A chapter member declares interest in a SAP. Distinct from the
  // forum-scoped sap_forum_interest. Read by: the SAP partner (warm
  // leads), the SAP Chair (chapter pull), and forum moderators
  // joining against their forum membership.
  const toggleMemberInterest = useCallback((memberId, sapId) => {
    if (!memberId || !sapId) return
    const existing = memberInterest.find(
      i => i.sap_id === sapId && i.chapter_member_id === memberId,
    )
    if (existing) {
      setMemberInterest(prev => prev.filter(i => i.id !== existing.id))
      dbWrite(() => deleteRow('sap_member_interest', existing.id), 'delete:sap_member_interest')
    } else {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const row = {
        id,
        chapter_id: activeChapterId,
        sap_id: sapId,
        chapter_member_id: memberId,
        created_at: now,
        updated_at: now,
      }
      setMemberInterest(prev => [...prev, row])
      dbWrite(() => insertRow('sap_member_interest', row), 'insert:sap_member_interest')
    }
  }, [activeChapterId, memberInterest, dbWrite])

  const interestedMembersForSAP = useCallback((sapId) => {
    return memberInterest.filter(i => i.sap_id === sapId).map(i => i.chapter_member_id)
  }, [memberInterest])

  const isMemberInterestedInSAP = useCallback((memberId, sapId) => {
    if (!memberId || !sapId) return false
    return memberInterest.some(i => i.sap_id === sapId && i.chapter_member_id === memberId)
  }, [memberInterest])

  // ── Helpers ───────────────────────────────────────────────────
  const contactsForPartner = useCallback((sapId) => {
    return contacts.filter(c => c.sap_id === sapId)
  }, [contacts])

  const primaryContact = useCallback((sapId) => {
    return contacts.find(c => c.sap_id === sapId && c.is_primary) || contacts.find(c => c.sap_id === sapId)
  }, [contacts])

  const partnersByTier = useCallback((tier) => {
    return partners.filter(p => p.tier === tier && p.status === 'active')
  }, [partners])

  const value = {
    partners, contacts, connectRequests, forumAppearances, chapterFeedback,
    loading, dbError, clearDbError: () => setDbError(null),
    addPartner, updatePartner, deletePartner,
    addContact, updateContact, deleteContact,
    contactsForPartner, primaryContact, partnersByTier,
    addConnectRequest, updateConnectRequest, connectRequestsForSAP,
    addForumAppearance, deleteForumAppearance, appearancesForContact, appearancesForSAP,
    addChapterFeedback,
    engagements, addEngagement, updateEngagement, deleteEngagement,
    engagementsForEvent, engagementsForContact, engagementsForSAP,
    memberInterest, toggleMemberInterest, interestedMembersForSAP, isMemberInterestedInSAP,
    addProspect, advancePipelineStage, promoteProspectToActive,
    setRenewalStatus, archivePartner, revivePartnerToProspect,
  }

  return createElement(SAPStoreContext.Provider, { value }, children)
}

export function useSAPStore() {
  const ctx = useContext(SAPStoreContext)
  if (!ctx) throw new Error('useSAPStore must be used within SAPStoreProvider')
  return ctx
}
