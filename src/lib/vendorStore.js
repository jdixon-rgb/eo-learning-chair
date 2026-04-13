import { useState, useCallback, useEffect, createContext, useContext, createElement, useRef } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { fetchByChapter, insertRow, updateRow, deleteRow } from './db'
import { useChapter } from './chapter'

const VendorStoreContext = createContext(null)

export const VENDOR_CATEGORIES = [
  'Legal', 'Accounting', 'Catering', 'AV/Production', 'Printing',
  'IT/Technology', 'Marketing', 'Real Estate', 'Insurance',
  'Financial Planning', 'HR/Staffing', 'Construction', 'Consulting',
  'Travel', 'Health/Wellness', 'Automotive', 'Photography/Video',
  'Signage', 'Coaching', 'Other',
]

function storageKey(chapterId) {
  return `eo-vendor-store-${chapterId}`
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

export function VendorStoreProvider({ children }) {
  const { activeChapterId, isChapterReady } = useChapter()
  const cached = loadCache(activeChapterId)

  const [vendors, setVendors] = useState(cached?.vendors ?? [])
  const [reviews, setReviews] = useState(cached?.reviews ?? [])
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [dbError, setDbError] = useState(null)
  const hasFetched = useRef(false)
  const prevChapterId = useRef(activeChapterId)

  // Persist
  useEffect(() => {
    if (!activeChapterId) return
    saveCache(activeChapterId, { vendors, reviews })
  }, [activeChapterId, vendors, reviews])

  // Hydrate from Supabase
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
      if (chapterCache.vendors) setVendors(chapterCache.vendors)
      if (chapterCache.reviews) setReviews(chapterCache.reviews)
    }

    setLoading(true)
    hydrate()

    async function hydrate() {
      try {
        const [vendorsRes, reviewsRes] = await Promise.all([
          fetchByChapter('vendors', activeChapterId),
          fetchVendorReviews(activeChapterId),
        ])
        if (vendorsRes.data) setVendors(vendorsRes.data)
        if (reviewsRes) setReviews(reviewsRes)
      } catch (err) {
        setDbError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
  }, [activeChapterId, isChapterReady])

  // vendor_reviews doesn't have chapter_id — fetch via join
  async function fetchVendorReviews(chapterId) {
    if (!isSupabaseConfigured()) return []
    const { data, error } = await supabase
      .from('vendor_reviews')
      .select('*, vendors!inner(chapter_id)')
      .eq('vendors.chapter_id', chapterId)
    if (error) throw error
    return (data || []).map(({ vendors: _v, ...rest }) => rest)
  }

  const dbWrite = useCallback(async (fn, label) => {
    if (!isSupabaseConfigured()) return
    try {
      const res = await fn()
      if (res?.error) throw res.error
    } catch (err) {
      setDbError(`${label}: ${err.message || String(err)}`)
    }
  }, [])

  // ── Vendor CRUD ──────────────────────────────────────────────
  const addVendor = useCallback((vendor) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      chapter_id: activeChapterId,
      name: vendor.name,
      category: vendor.category ?? 'Other',
      address: vendor.address ?? '',
      phone: vendor.phone ?? '',
      website: vendor.website ?? '',
      metro_area: vendor.metro_area ?? 'Phoenix Metro',
      tier: vendor.tier ?? 'community',
      sap_id: vendor.sap_id ?? null,
      created_by: vendor.created_by ?? null,
      created_at: now,
      updated_at: now,
    }
    setVendors(prev => [...prev, row])
    dbWrite(() => insertRow('vendors', row), 'insert:vendors')
    return row
  }, [activeChapterId, dbWrite])

  const updateVendor = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setVendors(prev => prev.map(v => (v.id === id ? { ...v, ...updates } : v)))
    dbWrite(() => updateRow('vendors', id, updates), 'update:vendors')
  }, [dbWrite])

  const deleteVendor = useCallback((id) => {
    setVendors(prev => prev.filter(v => v.id !== id))
    setReviews(prev => prev.filter(r => r.vendor_id !== id))
    dbWrite(() => deleteRow('vendors', id), 'delete:vendors')
  }, [dbWrite])

  // ── Review CRUD ──────────────────────────────────────────────
  const addReview = useCallback((review) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row = {
      id,
      vendor_id: review.vendor_id,
      chapter_member_id: review.chapter_member_id,
      rating: review.rating,
      review_text: review.review_text ?? '',
      upvotes: 0,
      downvotes: 0,
      created_at: now,
      updated_at: now,
    }
    setReviews(prev => [...prev, row])
    dbWrite(() => insertRow('vendor_reviews', row), 'insert:vendor_reviews')
    return row
  }, [dbWrite])

  const updateReview = useCallback((id, patch) => {
    const updates = { ...patch, updated_at: new Date().toISOString() }
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
    dbWrite(() => updateRow('vendor_reviews', id, updates), 'update:vendor_reviews')
  }, [dbWrite])

  const deleteReview = useCallback((id) => {
    setReviews(prev => prev.filter(r => r.id !== id))
    dbWrite(() => deleteRow('vendor_reviews', id), 'delete:vendor_reviews')
  }, [dbWrite])

  const voteReview = useCallback((id, direction) => {
    const field = direction === 'up' ? 'upvotes' : 'downvotes'
    setReviews(prev => prev.map(r => r.id === id ? { ...r, [field]: (r[field] || 0) + 1 } : r))
    dbWrite(async () => {
      const review = reviews.find(r => r.id === id)
      if (!review) return
      return updateRow('vendor_reviews', id, { [field]: (review[field] || 0) + 1 })
    }, `vote:vendor_reviews`)
  }, [dbWrite, reviews])

  // ── Helpers ──────────────────────────────────────────────────
  const reviewsForVendor = useCallback((vendorId) => {
    return reviews.filter(r => r.vendor_id === vendorId)
  }, [reviews])

  const averageRating = useCallback((vendorId) => {
    const vr = reviews.filter(r => r.vendor_id === vendorId)
    if (vr.length === 0) return 0
    return vr.reduce((sum, r) => sum + r.rating, 0) / vr.length
  }, [reviews])

  const reviewCount = useCallback((vendorId) => {
    return reviews.filter(r => r.vendor_id === vendorId).length
  }, [reviews])

  // Fuzzy search for type-ahead
  const searchVendors = useCallback((query) => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    return vendors
      .filter(v => v.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [vendors])

  const vendorForSAP = useCallback((sapId) => {
    return vendors.find(v => v.sap_id === sapId) ?? null
  }, [vendors])

  const value = {
    vendors, reviews,
    loading, dbError, clearDbError: () => setDbError(null),
    addVendor, updateVendor, deleteVendor,
    addReview, updateReview, deleteReview, voteReview,
    reviewsForVendor, averageRating, reviewCount, searchVendors,
    vendorForSAP,
  }

  return createElement(VendorStoreContext.Provider, { value }, children)
}

export function useVendorStore() {
  const ctx = useContext(VendorStoreContext)
  if (!ctx) throw new Error('useVendorStore must be used within VendorStoreProvider')
  return ctx
}
