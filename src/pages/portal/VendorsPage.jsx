import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useBoardStore } from '@/lib/boardStore'
import { useVendorStore, VENDOR_CATEGORIES } from '@/lib/vendorStore'
import { useSAPStore } from '@/lib/sapStore'
import { SAP_TIERS } from '@/lib/constants'
import {
  Store, Plus, Star, Search, X, ThumbsUp, ThumbsDown,
  ExternalLink, Phone, MapPin, ChevronDown, Pencil, Trash2, Send,
} from 'lucide-react'

export default function VendorsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const { chapterMembers } = useBoardStore()
  const {
    vendors, loading,
    addVendor, updateVendor, deleteVendor,
    addReview, updateReview, deleteReview, voteReview,
    reviewsForVendor, averageRating, reviewCount, searchVendors,
  } = useVendorStore()
  const { partners: sapPartners, addConnectRequest, appearancesForSAP } = useSAPStore()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [connectSent, setConnectSent] = useState(new Set())

  // Find current member — must be declared BEFORE any callback that
  // closes over it, otherwise the dependency array hits a TDZ ReferenceError.
  const email = user?.email
  const currentMember = useMemo(() => {
    if (!email) return null
    return chapterMembers.find(m => m.email?.toLowerCase() === email.toLowerCase()) ?? null
  }, [email, chapterMembers])

  const handleConnect = useCallback((vendor, message) => {
    if (!currentMember || !vendor.sap_id) return
    addConnectRequest({
      member_id: user?.id,
      sap_id: vendor.sap_id,
      member_name: currentMember.name || '',
      member_company: currentMember.company || '',
      message,
    })
    setConnectSent(prev => new Set([...prev, vendor.id]))
  }, [currentMember, user, addConnectRequest])

  // Merge real vendors with virtual entries for every active SAP
  // partner (so members can discover SAPs through the vendor surface
  // without admins having to duplicate-create each one as a vendor).
  // Virtual rows are read-only; they cannot be edited, deleted, or
  // reviewed. If a real vendor already links a SAP via sap_id, we
  // don't double-list it.
  const displayVendors = useMemo(() => {
    const real = vendors.map(v => ({ ...v, _virtual: false }))
    const linkedSapIds = new Set(real.filter(v => v.sap_id).map(v => v.sap_id))
    const virtualFromSaps = (sapPartners || [])
      .filter(p => (p.status || 'active') === 'active')
      .filter(p => !linkedSapIds.has(p.id))
      .map(p => ({
        id: `sap:${p.id}`,
        _virtual: true,
        _sapTier: p.tier,
        sap_id: p.id,
        name: p.company || p.name,
        category: p.industry || 'Other',
        description: p.description || '',
        website: p.website || '',
        phone: '',
        location: '',
        status: 'active',
      }))
    return [...real, ...virtualFromSaps]
  }, [vendors, sapPartners])

  // Filtered vendors
  const filtered = useMemo(() => {
    let list = [...displayVendors]
    if (categoryFilter !== 'All') {
      list = list.filter(v => v.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      )
    }
    // SAP partners sort first (both virtual and linked), then by rating, then name
    list.sort((a, b) => {
      const aSAP = (a._virtual || a.sap_id) ? 1 : 0
      const bSAP = (b._virtual || b.sap_id) ? 1 : 0
      if (bSAP !== aSAP) return bSAP - aSAP
      const ra = averageRating(a.id)
      const rb = averageRating(b.id)
      if (rb !== ra) return rb - ra
      return a.name.localeCompare(b.name)
    })
    return list
  }, [vendors, categoryFilter, search, averageRating])

  // When the "All" filter is active we want each category to render as
  // its own section so the list isn't a wall of mixed industries. We
  // preserve the sort order `filtered` already computed (SAPs first,
  // then rating, then name) — we just bucket by category. Categories
  // render in the order defined by VENDOR_CATEGORIES, with any unknown
  // ones appended alphabetically so nothing falls off.
  const groupedByCategory = useMemo(() => {
    if (categoryFilter !== 'All') return null
    const buckets = new Map()
    filtered.forEach(v => {
      const key = v.category || 'Other'
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(v)
    })
    const known = VENDOR_CATEGORIES.filter(c => buckets.has(c))
    const extras = [...buckets.keys()].filter(c => !VENDOR_CATEGORIES.includes(c)).sort()
    return [...known, ...extras].map(c => ({ category: c, vendors: buckets.get(c) }))
  }, [filtered, categoryFilter])

  if (loading) {
    return <div className="text-muted-foreground text-center py-12">Loading vendors...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Exchange</h1>
        <p className="text-muted-foreground text-sm mt-1">Rate and review any vendor in Arizona</p>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white focus:outline-none focus:border-border cursor-pointer"
          >
            <option value="All">All Categories</option>
            {VENDOR_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
        </div>
        <button
          onClick={() => { setEditingVendor(null); setShowAddVendor(true) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {/* Vendor grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-8 w-8 text-muted-foreground/60 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">No vendors found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {vendors.length === 0
              ? 'Be the first to add a vendor your chapter uses.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : groupedByCategory ? (
        <div className="space-y-8">
          {groupedByCategory.map(({ category, vendors: catVendors }) => (
            <section key={category}>
              <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h2>
                <span className="text-xs text-muted-foreground/70">
                  {catVendors.length} {catVendors.length === 1 ? 'vendor' : 'vendors'}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catVendors.map(vendor => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    avgRating={averageRating(vendor.id)}
                    numReviews={reviewCount(vendor.id)}
                    onClick={() => setSelectedVendor(vendor)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              avgRating={averageRating(vendor.id)}
              numReviews={reviewCount(vendor.id)}
              onClick={() => setSelectedVendor(vendor)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit vendor modal */}
      {showAddVendor && (
        <AddVendorModal
          vendor={editingVendor}
          existingVendors={vendors}
          searchVendors={searchVendors}
          onSave={(data) => {
            if (editingVendor) {
              updateVendor(editingVendor.id, data)
            } else {
              addVendor({ ...data, created_by: user?.id ?? null })
            }
            setShowAddVendor(false)
            setEditingVendor(null)
          }}
          onClose={() => { setShowAddVendor(false); setEditingVendor(null) }}
        />
      )}

      {/* Vendor detail modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          reviews={reviewsForVendor(selectedVendor.id)}
          avgRating={averageRating(selectedVendor.id)}
          currentMember={currentMember}
          chapterMembers={chapterMembers}
          isAdmin={isAdmin || isSuperAdmin}
          userId={user?.id}
          onConnect={handleConnect}
          connectSent={connectSent.has(selectedVendor.id)}
          forumAppearanceCount={selectedVendor.sap_id ? appearancesForSAP(selectedVendor.sap_id).length : 0}
          onClose={() => { setSelectedVendor(null); setShowReviewForm(false) }}
          onEdit={() => { setEditingVendor(selectedVendor); setShowAddVendor(true); setSelectedVendor(null) }}
          onDelete={() => setDeleteConfirm(selectedVendor)}
          showReviewForm={showReviewForm}
          setShowReviewForm={setShowReviewForm}
          onAddReview={(review) => {
            addReview(review)
            setShowReviewForm(false)
          }}
          onUpdateReview={updateReview}
          onDeleteReview={deleteReview}
          onVote={voteReview}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <h3 className="text-lg font-bold mb-2">Delete vendor?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            This will permanently delete <span className="text-foreground/90">{deleteConfirm.name}</span> and all its reviews. This can't be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg text-sm bg-red-600/80 hover:bg-red-600 text-white"
              onClick={() => { deleteVendor(deleteConfirm.id); setDeleteConfirm(null); setSelectedVendor(null) }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }) {
  const px = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${px} ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </div>
  )
}

function InteractiveStarRating({ rating, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function CategoryBadge({ category }) {
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full bg-muted/50 text-xs font-medium text-foreground/80">
      {category}
    </span>
  )
}

function VendorCard({ vendor, avgRating, numReviews, onClick }) {
  // Virtual SAP entry (auto-surfaced from the SAPs table) OR a real
  // vendor linked to a SAP via sap_id. Either way, show tier badge.
  const isSAP = vendor._virtual || !!vendor.sap_id
  const tierId = vendor._sapTier || (vendor.tier && vendor.tier !== 'sap_partner' ? vendor.tier : null)
  const tier = tierId ? SAP_TIERS.find(t => t.id === tierId) : null

  return (
    <button
      onClick={onClick}
      className={`text-left w-full p-5 rounded-2xl border transition-all ${
        isSAP
          ? 'bg-warm/5 border-warm/30 hover:border-warm/50 hover:bg-warm/10'
          : 'bg-card border-border hover:border-primary/30 hover:bg-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <h3 className="font-semibold text-foreground truncate">{vendor.name}</h3>
          {isSAP && (
            <span
              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
              style={
                tier
                  ? { backgroundColor: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }
                  : { backgroundColor: 'rgba(200,75,12,0.15)', color: '#c84b0c', border: '1px solid rgba(200,75,12,0.3)' }
              }
              title={tier ? `${tier.label} SAP partner` : 'SAP partner'}
            >
              {tier ? `${tier.label} SAP` : 'SAP Partner'}
            </span>
          )}
        </div>
        <CategoryBadge category={vendor.category} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <StarRating rating={avgRating} />
        <span className="text-xs text-muted-foreground">
          {avgRating > 0 ? avgRating.toFixed(1) : '--'}
          {' '}({numReviews} {numReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
      {vendor.address && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
          <MapPin className="h-3 w-3 shrink-0" /> {vendor.address}
        </p>
      )}
      {vendor._virtual && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Auto-listed from chapter SAP roster
        </p>
      )}
    </button>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1724] border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function AddVendorModal({ vendor, searchVendors, onSave, onClose }) {
  const [name, setName] = useState(vendor?.name ?? '')
  const [category, setCategory] = useState(vendor?.category ?? 'Other')
  const [address, setAddress] = useState(vendor?.address ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [website, setWebsite] = useState(vendor?.website ?? '')
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)

  // Fuzzy type-ahead
  useEffect(() => {
    if (vendor) return // don't suggest when editing
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSuggestions(searchVendors(name))
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [name, searchVendors, vendor])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), category, address, phone, website })
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold mb-4">{vendor ? 'Edit Vendor' : 'Add a Vendor'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="block text-xs text-muted-foreground mb-1">Business Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Legal Services"
            className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border"
            autoFocus
          />
          {suggestions.length > 0 && !vendor && (
            <div className="absolute z-10 mt-1 w-full bg-[#1a2332] border border-border rounded-xl overflow-hidden shadow-xl">
              <p className="text-xs text-muted-foreground/70 px-3 py-2 border-b border-border/50">Already listed — click to view</p>
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSuggestions([]); onClose() }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground/90 hover:bg-muted/30 flex justify-between items-center"
                >
                  <span>{s.name}</span>
                  <CategoryBadge category={s.category} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white focus:outline-none focus:border-border"
          >
            {VENDOR_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Street address, city, ZIP"
            className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(480) 555-0100"
              className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Website</label>
            <input
              type="text"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-5 py-2 rounded-lg text-sm bg-primary/80 hover:bg-primary text-white font-medium disabled:opacity-40"
          >
            {vendor ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function VendorDetailModal({
  vendor, reviews, avgRating, currentMember, chapterMembers, isAdmin, userId,
  onClose, onEdit, onDelete,
  showReviewForm, setShowReviewForm,
  onAddReview, onUpdateReview, onDeleteReview, onVote,
  onConnect, connectSent, forumAppearanceCount,
}) {
  const [connectMsg, setConnectMsg] = useState('')
  const [showConnectForm, setShowConnectForm] = useState(false)
  // Virtual SAP entries are read-only — the admin manages them on the
  // SAPs page, not here. Real vendors: owner or chapter admin can edit.
  const canEdit = !vendor._virtual && (isAdmin || vendor.created_by === userId)
  const hasReviewed = currentMember && reviews.some(r => r.chapter_member_id === currentMember.id)

  return (
    <Modal onClose={onClose}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{vendor.name}</h2>
            <CategoryBadge category={vendor.category} />
          </div>
          {canEdit && (
            <div className="flex gap-1.5 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onDelete} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Rating summary */}
        <div className="flex items-center gap-3">
          <StarRating rating={avgRating} size="md" />
          <span className="text-sm text-muted-foreground">
            {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}
            {reviews.length > 0 && ` (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})`}
          </span>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {vendor.address && (
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70" /> {vendor.address}</p>
          )}
          {vendor.phone && (
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" /> {vendor.phone}</p>
          )}
          {vendor.website && (
            <p className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                {vendor.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
        </div>

        {/* SAP partner extras */}
        {vendor.tier === 'sap_partner' && (
          <div className="space-y-3">
            {forumAppearanceCount > 0 && (
              <p className="text-xs text-indigo-300 flex items-center gap-1.5">
                Spoken at {forumAppearanceCount} forum{forumAppearanceCount !== 1 ? 's' : ''}
              </p>
            )}
            {currentMember && !connectSent && !showConnectForm && (
              <button
                onClick={() => setShowConnectForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" /> Connect with {vendor.name}
              </button>
            )}
            {showConnectForm && !connectSent && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2">
                <textarea
                  value={connectMsg}
                  onChange={e => setConnectMsg(e.target.value)}
                  placeholder="Optional message — why do you want to connect?"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-indigo-500/30 resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onConnect(vendor, connectMsg); setShowConnectForm(false) }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 cursor-pointer"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => setShowConnectForm(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {connectSent && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <Send className="h-3 w-3" /> Connect request sent!
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground/90">Reviews</h3>
            {currentMember && !hasReviewed && !showReviewForm && !vendor._virtual && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
              >
                <Plus className="h-3.5 w-3.5" /> Write a Review
              </button>
            )}
            {vendor._virtual && (
              <span className="text-[10px] text-muted-foreground italic">
                Reviews unavailable — auto-listed from SAP roster
              </span>
            )}
          </div>

          {showReviewForm && currentMember && (
            <ReviewForm
              memberId={currentMember.id}
              vendorId={vendor.id}
              onSubmit={onAddReview}
              onCancel={() => setShowReviewForm(false)}
            />
          )}

          {reviews.length === 0 && !showReviewForm ? (
            <p className="text-sm text-muted-foreground/70 text-center py-4">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-3 mt-3">
              {reviews
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    memberName={chapterMembers.find(m => m.id === review.chapter_member_id)?.name ?? 'Member'}
                    isOwn={currentMember?.id === review.chapter_member_id}
                    isAdmin={isAdmin}
                    onUpdate={onUpdateReview}
                    onDelete={() => onDeleteReview(review.id)}
                    onVote={onVote}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ReviewForm({ memberId, vendorId, onSubmit, onCancel }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) return
    onSubmit({ vendor_id: vendorId, chapter_member_id: memberId, rating, review_text: text })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Your Rating</label>
        <InteractiveStarRating rating={rating} onChange={setRating} />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Review (optional)</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder="Share your experience..."
          className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-border resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          disabled={rating === 0}
          className="px-5 py-2 rounded-lg text-sm bg-primary/80 hover:bg-primary text-white font-medium disabled:opacity-40"
        >
          Submit Review
        </button>
      </div>
    </form>
  )
}

function ReviewCard({ review, memberName, isOwn, isAdmin, onUpdate, onDelete, onVote }) {
  const [editing, setEditing] = useState(false)
  const [editRating, setEditRating] = useState(review.rating)
  const [editText, setEditText] = useState(review.review_text)

  if (editing) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
        <InteractiveStarRating rating={editRating} onChange={setEditRating} />
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-white focus:outline-none focus:border-border resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(false)}>Cancel</button>
          <button
            className="px-4 py-1.5 rounded-lg text-xs bg-primary/80 hover:bg-primary text-white"
            onClick={() => { onUpdate(review.id, { rating: editRating, review_text: editText }); setEditing(false) }}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <span className="text-sm font-medium text-foreground">{memberName}</span>
          <span className="text-xs text-muted-foreground/70 ml-2">{date}</span>
        </div>
        {(isOwn || isAdmin) && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="p-1 rounded text-muted-foreground/60 hover:text-foreground/80">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded text-muted-foreground/60 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <StarRating rating={review.rating} />
      {review.review_text && (
        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{review.review_text}</p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => onVote(review.id, 'up')}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-green-400 transition-colors"
        >
          <ThumbsUp className="h-3.5 w-3.5" /> {review.upvotes || 0}
        </button>
        <button
          onClick={() => onVote(review.id, 'down')}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-red-400 transition-colors"
        >
          <ThumbsDown className="h-3.5 w-3.5" /> {review.downvotes || 0}
        </button>
      </div>
    </div>
  )
}
