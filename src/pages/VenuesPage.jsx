import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VENUE_PIPELINE_STAGES, AV_QUALITY, ARCHIVE_REASONS } from '@/lib/constants'
import TourTip from '@/components/TourTip'
import { formatCurrency } from '@/lib/utils'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus, Search, MapPin, Users, DollarSign, Volume2, Utensils,
  Phone, Mail, Trash2, Building2, GripVertical, Star,
  Sparkles, Loader2, CalendarDays, Image as ImageIcon,
  Archive, RotateCcw, Library,
} from 'lucide-react'

const VENUE_TYPES = [
  { id: 'hotel', label: 'Hotel / Ballroom' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'museum', label: 'Museum / Gallery' },
  { id: 'outdoor', label: 'Outdoor / Park' },
  { id: 'private', label: 'Private Estate' },
  { id: 'theater', label: 'Theater / Concert Hall' },
  { id: 'other', label: 'Other' },
]

const emptyForm = {
  name: '', address: '', capacity: '', base_rental_cost: '',
  av_quality: 'good', av_cost_estimate: '', venue_type: 'other',
  notes: '', contact_name: '', contact_email: '', contact_phone: '',
  fb_notes: '', fb_estimated_cost: '', fb_vendor: '',
  parking_notes: '', setup_notes: '',
  description: '', image_url: '', staff_rating: 0, pipeline_stage: 'researching',
}

// ── Star Rating Component ──────────────────────────────────
function StarRating({ value, onChange, size = 'sm', readonly = false }) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star === value ? 0 : star)}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function VenuesPage() {
  const { venues, events, speakers, budgetItems, addVenue, updateVenue, deleteVenue, updateEvent, archiveVenue, restoreVenue } = useStore()
  const { activeFiscalYear } = useFiscalYear()
  const [showForm, setShowForm] = useState(false)
  const [editVenue, setEditVenue] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('pipeline') // pipeline, table, or library
  const [dragVenue, setDragVenue] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiveReason, setArchiveReason] = useState('not_this_year')
  const [archiveProgramYear, setArchiveProgramYear] = useState(formatFiscalYear(activeFiscalYear))
  const [libraryFilter, setLibraryFilter] = useState('all')

  // Map venue → events
  const venueEventMap = {}
  events.forEach(evt => {
    if (evt.venue_id) {
      if (!venueEventMap[evt.venue_id]) venueEventMap[evt.venue_id] = []
      venueEventMap[evt.venue_id].push(evt)
    }
  })

  // Default missing pipeline_stage to 'researching' so older saved venues still appear
  const normalizedVenues = venues.map(v => ({
    ...v,
    pipeline_stage: v.pipeline_stage || 'researching',
    staff_rating: v.staff_rating || null,
  }))

  const filteredVenues = normalizedVenues.filter(v =>
    v.pipeline_stage !== 'archived' &&
    (v.name.toLowerCase().includes(search.toLowerCase()) ||
     v.address?.toLowerCase().includes(search.toLowerCase()) ||
     v.venue_type?.toLowerCase().includes(search.toLowerCase()))
  )

  const archivedVenues = normalizedVenues.filter(v => v.pipeline_stage === 'archived')

  const handleSubmit = () => {
    if (!form.name) return
    const data = {
      ...form,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      base_rental_cost: form.base_rental_cost ? parseFloat(form.base_rental_cost) : null,
      av_cost_estimate: form.av_cost_estimate ? parseFloat(form.av_cost_estimate) : null,
      fb_estimated_cost: form.fb_estimated_cost ? parseFloat(form.fb_estimated_cost) : null,
      staff_rating: form.staff_rating || null,
    }
    if (editVenue) {
      updateVenue(editVenue.id, data)
    } else {
      addVenue(data)
    }
    setShowForm(false)
    setEditVenue(null)
    setForm(emptyForm)
  }

  const openEdit = (venue) => {
    setEditVenue(venue)
    setForm({
      name: venue.name || '',
      address: venue.address || '',
      capacity: venue.capacity || '',
      base_rental_cost: venue.base_rental_cost || '',
      av_quality: venue.av_quality || 'good',
      av_cost_estimate: venue.av_cost_estimate || '',
      venue_type: venue.venue_type || 'other',
      notes: venue.notes || '',
      contact_name: venue.contact_name || '',
      contact_email: venue.contact_email || '',
      contact_phone: venue.contact_phone || '',
      fb_notes: venue.fb_notes || '',
      fb_estimated_cost: venue.fb_estimated_cost || '',
      fb_vendor: venue.fb_vendor || '',
      parking_notes: venue.parking_notes || '',
      setup_notes: venue.setup_notes || '',
      description: venue.description || '',
      image_url: venue.image_url || '',
      staff_rating: venue.staff_rating || 0,
      pipeline_stage: venue.pipeline_stage || 'researching',
    })
    setLookupError(null)
    setShowForm(true)
  }

  const handleDelete = (venue) => {
    const linkedEvents = venueEventMap[venue.id] || []
    const msg = linkedEvents.length > 0
      ? `Delete "${venue.name}"? It's linked to ${linkedEvents.length} event(s). Events will keep their data but lose the venue link.`
      : `Delete "${venue.name}"?`
    if (window.confirm(msg)) {
      linkedEvents.forEach(evt => updateEvent(evt.id, { venue_id: null }))
      deleteVenue(venue.id)
    }
  }

  // ── Auto-Lookup ────────────────────────────────────────────
  const handleLookup = async () => {
    if (!form.name) return
    setLookupLoading(true)
    setLookupError(null)
    try {
      const res = await fetch('/api/venues/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, location: 'Phoenix/Scottsdale, Arizona' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Lookup failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setForm(prev => ({
        ...prev,
        address: data.address || data.google_verified_address || prev.address,
        description: data.description || prev.description,
        venue_type: data.category || prev.venue_type,
        capacity: data.capacity_estimate || prev.capacity,
        image_url: data.image_url || prev.image_url,
      }))
    } catch (e) {
      setLookupError(e.message)
    } finally {
      setLookupLoading(false)
    }
  }

  // ── Drag & Drop ────────────────────────────────────────────
  const handleDragStart = (venue) => setDragVenue(venue)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (stageId) => {
    if (dragVenue) {
      updateVenue(dragVenue.id, { pipeline_stage: stageId })
      setDragVenue(null)
    }
  }

  const getVenueTypeLabel = (id) => VENUE_TYPES.find(t => t.id === id)?.label || id

  // ── Venue Card (Pipeline Kanban) ───────────────────────────
  const VenueCard = ({ venue }) => {
    const linkedEvents = venueEventMap[venue.id] || []
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(venue)}
        className="rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing overflow-hidden"
        onClick={() => openEdit(venue)}
      >
        {/* Image or Type Banner */}
        {venue.image_url ? (
          <div className="h-24 bg-gray-100 relative overflow-hidden">
            <img
              src={venue.image_url}
              alt={venue.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/90">{getVenueTypeLabel(venue.venue_type)}</span>
              {venue.capacity && (
                <span className="text-[10px] text-white/80 flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />{venue.capacity}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-ink px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-white/60" />
              <span className="text-[10px] font-medium text-white/60">{getVenueTypeLabel(venue.venue_type)}</span>
            </div>
            {venue.capacity && (
              <span className="text-[10px] text-white/60 flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />{venue.capacity}
              </span>
            )}
          </div>
        )}

        <div className="p-3">
          {/* Name + Drag Handle */}
          <div className="flex items-start gap-1.5">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <h4 className="text-sm font-semibold leading-tight">{venue.name}</h4>
          </div>

          {/* Address */}
          {venue.address && (
            <div className="flex items-start gap-1 mt-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{venue.address}</span>
            </div>
          )}

          {/* Rating */}
          {venue.staff_rating > 0 && (
            <div className="mt-1.5">
              <StarRating value={venue.staff_rating} readonly size="sm" />
            </div>
          )}

          {/* Cost */}
          <div className="flex items-center gap-2.5 mt-2">
            {venue.base_rental_cost > 0 && (
              <span className="text-[11px] font-medium">{formatCurrency(venue.base_rental_cost)}</span>
            )}
            {venue.av_quality && (
              <Badge
                variant="outline"
                className="text-[9px] h-4"
                style={{
                  borderColor: venue.av_quality === 'excellent' ? '#22c55e' : venue.av_quality === 'good' ? '#3d46f2' : '#fa653c',
                  color: venue.av_quality === 'excellent' ? '#22c55e' : venue.av_quality === 'good' ? '#3d46f2' : '#fa653c',
                }}
              >
                AV: {venue.av_quality}
              </Badge>
            )}
          </div>

          {/* Linked Events */}
          {linkedEvents.length > 0 && (
            <div className="mt-2 pt-2 border-t space-y-1">
              {linkedEvents.map(evt => {
                const candidateSpeakers = (evt.candidate_speaker_ids || [])
                  .map(sid => speakers.find(s => s.id === sid)).filter(Boolean)
                const confirmedSpeaker = speakers.find(s => s.id === evt.speaker_id)
                return (
                  <div key={evt.id} className="text-xs">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="font-medium text-[11px] truncate">{evt.title}</p>
                    </div>
                    {candidateSpeakers.length > 0 ? (
                      <div className="flex flex-wrap gap-x-1 ml-4 text-[10px]">
                        {candidateSpeakers.map(s => (
                          <span key={s.id} className={s.id === evt.speaker_id ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                            {s.name}{s.id === evt.speaker_id ? ' ★' : ''}{s.id !== candidateSpeakers[candidateSpeakers.length - 1]?.id ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    ) : confirmedSpeaker ? (
                      <p className="text-[10px] text-primary font-medium ml-4">{confirmedSpeaker.name} ★</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {/* Description preview */}
          {venue.description && (
            <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2 italic">{venue.description}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TourTip />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venue Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredVenues.length} active &middot; {archivedVenues.length} archived &middot; {venues.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search venues..."
              className="pl-9 w-60"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-ink text-white' : 'hover:bg-muted'}`}
              onClick={() => setViewMode('pipeline')}
            >
              Pipeline
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-x ${viewMode === 'table' ? 'bg-ink text-white' : 'hover:bg-muted'}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'library' ? 'bg-ink text-white' : 'hover:bg-muted'}`}
              onClick={() => setViewMode('library')}
            >
              <Library className="h-3 w-3" /> Library
            </button>
          </div>
          <Button size="sm" onClick={() => { setEditVenue(null); setForm(emptyForm); setLookupError(null); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Add Venue
          </Button>
        </div>
      </div>

      {/* Pipeline (Kanban) View */}
      {viewMode === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {VENUE_PIPELINE_STAGES.map(stage => {
            const stageVenues = filteredVenues.filter(v => v.pipeline_stage === stage.id)
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">({stageVenues.length})</span>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                  {stageVenues.map(venue => (
                    <VenueCard key={venue.id} venue={venue} />
                  ))}
                  {stageVenues.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                      Drag venues here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Venue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cap</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rental</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Events</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map(venue => {
                const linkedEvents = venueEventMap[venue.id] || []
                const stage = VENUE_PIPELINE_STAGES.find(s => s.id === venue.pipeline_stage)
                return (
                  <tr key={venue.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEdit(venue)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {venue.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            <img src={venue.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-ink/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-ink/50" />
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium">{venue.name}</span>
                          {venue.address && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{venue.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{getVenueTypeLabel(venue.venue_type)}</td>
                    <td className="px-4 py-3 text-sm">{venue.capacity || '—'}</td>
                    <td className="px-4 py-3 text-sm">{venue.base_rental_cost ? formatCurrency(venue.base_rental_cost) : '—'}</td>
                    <td className="px-4 py-3">
                      {venue.staff_rating > 0 ? (
                        <StarRating value={venue.staff_rating} readonly size="sm" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: stage?.color, color: stage?.color }}
                      >
                        {stage?.label || venue.pipeline_stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {linkedEvents.length > 0 ? (
                        <div className="space-y-1">
                          {linkedEvents.map(evt => {
                            const candidateNames = (evt.candidate_speaker_ids || [])
                              .map(sid => speakers.find(s => s.id === sid)).filter(Boolean)
                              .map(s => s.id === evt.speaker_id ? `${s.name} ★` : s.name)
                            return (
                              <div key={evt.id}>
                                <p className="text-[11px] font-medium">{evt.title}</p>
                                <p className="text-[9px] text-muted-foreground">{candidateNames.join(', ') || 'No speaker'}</p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(venue) }}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer p-1 rounded"
                        title="Delete venue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Library View */
        <div className="space-y-4">
          {/* Library Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All Venues' },
              { id: 'active', label: 'Active Pipeline' },
              { id: 'archived', label: 'Archived' },
              { id: 'rated', label: 'Rated' },
              { id: 'has_quote', label: 'Has Quote' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setLibraryFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  libraryFilter === f.id
                    ? 'bg-ink text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Library Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {normalizedVenues
              .filter(v => {
                const matchesSearch = !search ||
                  v.name.toLowerCase().includes(search.toLowerCase()) ||
                  v.address?.toLowerCase().includes(search.toLowerCase()) ||
                  v.venue_type?.toLowerCase().includes(search.toLowerCase())
                if (!matchesSearch) return false
                switch (libraryFilter) {
                  case 'active': return v.pipeline_stage !== 'archived'
                  case 'archived': return v.pipeline_stage === 'archived'
                  case 'rated': return v.staff_rating > 0
                  case 'has_quote': return v.base_rental_cost > 0
                  default: return true
                }
              })
              .sort((a, b) => {
                if (a.staff_rating && !b.staff_rating) return -1
                if (!a.staff_rating && b.staff_rating) return 1
                return a.name.localeCompare(b.name)
              })
              .map(venue => {
                const linkedEvents = venueEventMap[venue.id] || []
                const isArchived = venue.pipeline_stage === 'archived'
                const stage = VENUE_PIPELINE_STAGES.find(s => s.id === venue.pipeline_stage)
                const archiveReasonLabel = ARCHIVE_REASONS.find(r => r.id === venue.archive_reason)?.label
                const totalEstimatedCost = (venue.base_rental_cost || 0) + (venue.av_cost_estimate || 0) + (venue.fb_estimated_cost || 0)

                return (
                  <div
                    key={venue.id}
                    className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md ${isArchived ? 'opacity-80' : ''}`}
                  >
                    {venue.image_url ? (
                      <div className="h-28 bg-gray-100 relative overflow-hidden">
                        <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-12 bg-ink/5 flex items-center px-4 gap-2">
                        <Building2 className="h-4 w-4 text-ink/40" />
                        <span className="text-xs text-ink/50 font-medium">{getVenueTypeLabel(venue.venue_type)}</span>
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{venue.name}</h3>
                        {isArchived ? (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Archived</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: stage?.color, color: stage?.color }}>
                            {stage?.label}
                          </Badge>
                        )}
                      </div>

                      {venue.address && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{venue.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {venue.staff_rating > 0 && (
                          <StarRating value={venue.staff_rating} readonly size="sm" />
                        )}
                        {venue.capacity && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {venue.capacity}
                          </span>
                        )}
                      </div>

                      {totalEstimatedCost > 0 && (
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Estimated Total Cost</div>
                          <div className="text-sm font-semibold">{formatCurrency(totalEstimatedCost)}</div>
                          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            {venue.base_rental_cost > 0 && <span>Rental: {formatCurrency(venue.base_rental_cost)}</span>}
                            {venue.av_cost_estimate > 0 && <span>AV: {formatCurrency(venue.av_cost_estimate)}</span>}
                            {venue.fb_estimated_cost > 0 && <span>F&B: {formatCurrency(venue.fb_estimated_cost)}</span>}
                          </div>
                        </div>
                      )}

                      {isArchived && (archiveReasonLabel || venue.program_year) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                          {venue.program_year && <p className="font-medium text-amber-800">{venue.program_year}</p>}
                          {archiveReasonLabel && <p className="text-amber-600">{archiveReasonLabel}</p>}
                        </div>
                      )}

                      {linkedEvents.length > 0 && (
                        <div className="border-t pt-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Event History</p>
                          {linkedEvents.map(evt => (
                            <div key={evt.id} className="flex items-center gap-1 text-xs">
                              <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{evt.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(venue)}>
                          View Details
                        </Button>
                        {isArchived ? (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-primary border-primary/30 hover:bg-primary/10" onClick={() => restoreVenue(venue.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setArchiveTarget(venue); setArchiveReason('not_this_year'); setShowArchiveDialog(true) }}>
                            <Archive className="h-3 w-3 mr-1" /> Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {normalizedVenues.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Library className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No venues in the library yet.</p>
              <p className="text-xs mt-1">Add venues from the Pipeline view to build your library.</p>
            </div>
          )}
        </div>
      )}

      {/* Archived Venues Summary (pipeline + table views only) */}
      {viewMode !== 'library' && archivedVenues.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived ({archivedVenues.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => setViewMode('library')}
            >
              View in Library
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {archivedVenues.map(v => (
              <Badge
                key={v.id}
                variant="secondary"
                className="cursor-pointer hover:bg-muted"
                onClick={() => openEdit(v)}
              >
                {v.name}
                {v.staff_rating > 0 && <span className="ml-1 text-amber-500">{'★'.repeat(v.staff_rating)}</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Add/Edit Venue Dialog ─────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editVenue ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="fb" className="flex-1">F&B</TabsTrigger>
              <TabsTrigger value="logistics" className="flex-1">Logistics</TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">Contact</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details">
              <div className="space-y-3 mt-3 max-h-[55vh] overflow-y-auto pr-1">
                {/* Venue Name + Auto-Lookup */}
                <div>
                  <label className="text-xs font-medium">Venue Name *</label>
                  <div className="flex gap-2">
                    <Input
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., The Wrigley Mansion"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!form.name || lookupLoading}
                      onClick={handleLookup}
                      className="shrink-0 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      {lookupLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Looking up...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Auto-Lookup</>
                      )}
                    </Button>
                  </div>
                  {lookupError && (
                    <p className="text-[11px] text-destructive mt-1">{lookupError}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Auto-Lookup uses AI to fill in address, description, and photo. Requires API keys in Vercel.
                  </p>
                </div>

                {/* Image Preview */}
                {form.image_url && (
                  <div className="relative rounded-lg overflow-hidden h-32 bg-gray-100">
                    <img src={form.image_url} alt="Venue" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                      onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Description */}
                {form.description && (
                  <div>
                    <label className="text-xs font-medium">Description</label>
                    <Textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}

                {/* Address + Type + Capacity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium">Address</label>
                    <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full street address" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Venue Type</label>
                    <Select value={form.venue_type} onChange={e => setForm(p => ({ ...p, venue_type: e.target.value }))}>
                      {VENUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Capacity</label>
                    <Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="150" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Base Rental Cost ($)</label>
                    <Input type="number" value={form.base_rental_cost} onChange={e => setForm(p => ({ ...p, base_rental_cost: e.target.value }))} placeholder="5000" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">AV Quality</label>
                    <Select value={form.av_quality} onChange={e => setForm(p => ({ ...p, av_quality: e.target.value }))}>
                      {AV_QUALITY.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">AV Cost Estimate ($)</label>
                    <Input type="number" value={form.av_cost_estimate} onChange={e => setForm(p => ({ ...p, av_cost_estimate: e.target.value }))} placeholder="3000" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Pipeline Stage</label>
                    <Select value={form.pipeline_stage} onChange={e => setForm(p => ({ ...p, pipeline_stage: e.target.value }))}>
                      {VENUE_PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      {form.pipeline_stage === 'archived' && (
                        <option value="archived" disabled>Archived</option>
                      )}
                    </Select>
                  </div>
                </div>

                {/* Staff Rating */}
                <div>
                  <label className="text-xs font-medium">Staff Rating</label>
                  <div className="flex items-center gap-3 mt-1">
                    <StarRating
                      value={form.staff_rating}
                      onChange={(val) => setForm(p => ({ ...p, staff_rating: val }))}
                      size="md"
                    />
                    <span className="text-xs text-muted-foreground">
                      {form.staff_rating === 0 ? 'Not rated' : `${form.staff_rating}/5`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Rate this venue from 1 (poor) to 5 (excellent).</p>
                </div>

                {/* Image URL (manual) */}
                {!form.image_url && (
                  <div>
                    <label className="text-xs font-medium">Image URL (optional)</label>
                    <Input
                      value={form.image_url}
                      onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="https://... (or use Auto-Lookup)"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="General venue notes..." rows={3} />
                </div>
              </div>
            </TabsContent>

            {/* F&B Tab */}
            <TabsContent value="fb">
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Utensils className="h-4 w-4" />
                  Food & Beverage
                </div>
                <div>
                  <label className="text-xs font-medium">F&B Vendor / Caterer</label>
                  <Input value={form.fb_vendor} onChange={e => setForm(p => ({ ...p, fb_vendor: e.target.value }))} placeholder="In-house, or external caterer name" />
                </div>
                <div>
                  <label className="text-xs font-medium">Estimated F&B Cost ($)</label>
                  <Input type="number" value={form.fb_estimated_cost} onChange={e => setForm(p => ({ ...p, fb_estimated_cost: e.target.value }))} placeholder="12000" />
                </div>
                <div>
                  <label className="text-xs font-medium">F&B Notes</label>
                  <Textarea
                    value={form.fb_notes}
                    onChange={e => setForm(p => ({ ...p, fb_notes: e.target.value }))}
                    placeholder="Menu preferences, dietary restrictions, bar options, tasting dates, minimum headcount requirements..."
                    rows={5}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Logistics Tab */}
            <TabsContent value="logistics">
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-xs font-medium">Setup & Layout Notes</label>
                  <Textarea
                    value={form.setup_notes}
                    onChange={e => setForm(p => ({ ...p, setup_notes: e.target.value }))}
                    placeholder="Room layout, table arrangements, stage placement, load-in times, tech rehearsal..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Parking Notes</label>
                  <Textarea
                    value={form.parking_notes}
                    onChange={e => setForm(p => ({ ...p, parking_notes: e.target.value }))}
                    placeholder="Valet, self-park, lot location, cost, validation..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact">
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-xs font-medium">Contact Name</label>
                  <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Venue coordinator name" />
                </div>
                <div>
                  <label className="text-xs font-medium">Contact Email</label>
                  <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="events@venue.com" />
                </div>
                <div>
                  <label className="text-xs font-medium">Contact Phone</label>
                  <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="(602) 555-0100" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button onClick={handleSubmit} className="flex-1">{editVenue ? 'Save Changes' : 'Add Venue'}</Button>
            {editVenue && (
              <>
                <Button
                  variant="outline"
                  className="text-muted-foreground"
                  onClick={() => {
                    setArchiveTarget(editVenue)
                    setArchiveReason('not_this_year')
                    setShowForm(false)
                    setShowArchiveDialog(true)
                  }}
                >
                  <Archive className="h-4 w-4 mr-1" /> Archive
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => { handleDelete(editVenue); setShowForm(false) }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Archive Venue Dialog ──────────────────────────────── */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive "{archiveTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              This venue will be moved out of the active pipeline and into the Venue Library for future reference.
            </p>
            <div>
              <label className="text-xs font-medium">Reason</label>
              <Select value={archiveReason} onChange={e => setArchiveReason(e.target.value)}>
                {ARCHIVE_REASONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Program Year</label>
              <Input
                value={archiveProgramYear}
                onChange={e => setArchiveProgramYear(e.target.value)}
                placeholder={formatFiscalYear(activeFiscalYear)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button
              onClick={() => {
                archiveVenue(archiveTarget.id, archiveReason, archiveProgramYear)
                setShowArchiveDialog(false)
                setArchiveTarget(null)
              }}
              className="flex-1"
            >
              <Archive className="h-4 w-4 mr-1" /> Archive Venue
            </Button>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
