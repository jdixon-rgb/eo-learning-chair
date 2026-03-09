import { useState } from 'react'
import { useStore } from '@/lib/store'
import { AV_QUALITY } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus, Search, MapPin, Users, DollarSign, Volume2, Utensils,
  Phone, Mail, Trash2, Building2, Pencil,
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
}

export default function VenuesPage() {
  const { venues, events, speakers, budgetItems, addVenue, updateVenue, deleteVenue, updateEvent } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editVenue, setEditVenue] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('cards')

  const filteredVenues = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase()) ||
    v.venue_type?.toLowerCase().includes(search.toLowerCase())
  )

  // Map venue → events
  const venueEventMap = {}
  events.forEach(evt => {
    if (evt.venue_id) {
      if (!venueEventMap[evt.venue_id]) venueEventMap[evt.venue_id] = []
      venueEventMap[evt.venue_id].push(evt)
    }
  })

  const handleSubmit = () => {
    if (!form.name) return
    const data = {
      ...form,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      base_rental_cost: form.base_rental_cost ? parseFloat(form.base_rental_cost) : null,
      av_cost_estimate: form.av_cost_estimate ? parseFloat(form.av_cost_estimate) : null,
      fb_estimated_cost: form.fb_estimated_cost ? parseFloat(form.fb_estimated_cost) : null,
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
    })
    setShowForm(true)
  }

  const handleDelete = (venue) => {
    const linkedEvents = venueEventMap[venue.id] || []
    const msg = linkedEvents.length > 0
      ? `Delete "${venue.name}"? It's linked to ${linkedEvents.length} event(s): ${linkedEvents.map(e => e.title).join(', ')}. The events will keep their data but lose the venue link.`
      : `Delete "${venue.name}"?`
    if (window.confirm(msg)) {
      // Clear venue_id from linked events
      linkedEvents.forEach(evt => {
        updateEvent(evt.id, { venue_id: null })
      })
      deleteVenue(venue.id)
    }
  }

  const getVenueTypeLabel = (id) => VENUE_TYPES.find(t => t.id === id)?.label || id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venues</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {venues.length} venues &middot; Manage locations, F&B, and logistics
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
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </Button>
          <Button size="sm" onClick={() => { setEditVenue(null); setForm(emptyForm); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Add Venue
          </Button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map(venue => {
            const linkedEvents = venueEventMap[venue.id] || []
            const totalCost = (venue.base_rental_cost || 0) + (venue.av_cost_estimate || 0)

            return (
              <div
                key={venue.id}
                className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEdit(venue)}
              >
                {/* Type Banner */}
                <div className="bg-eo-navy px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span className="text-xs font-medium text-white/70">{getVenueTypeLabel(venue.venue_type)}</span>
                  </div>
                  {venue.capacity && (
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      <Users className="h-3 w-3" />
                      {venue.capacity}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-base font-semibold leading-tight">{venue.name}</h3>
                  {venue.address && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {venue.address}
                    </div>
                  )}

                  {/* Cost Summary */}
                  <div className="flex items-center gap-3 mt-3">
                    {venue.base_rental_cost > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign className="h-3 w-3 text-eo-coral" />
                        <span className="font-medium">{formatCurrency(venue.base_rental_cost)}</span>
                        <span className="text-muted-foreground">rental</span>
                      </div>
                    )}
                    {venue.av_cost_estimate > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Volume2 className="h-3 w-3 text-purple-500" />
                        <span className="font-medium">{formatCurrency(venue.av_cost_estimate)}</span>
                        <span className="text-muted-foreground">AV</span>
                      </div>
                    )}
                  </div>

                  {/* AV Quality Badge */}
                  {venue.av_quality && (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: venue.av_quality === 'excellent' ? '#22c55e' : venue.av_quality === 'good' ? '#3d46f2' : venue.av_quality === 'fair' ? '#fa653c' : '#64648c',
                          color: venue.av_quality === 'excellent' ? '#22c55e' : venue.av_quality === 'good' ? '#3d46f2' : venue.av_quality === 'fair' ? '#fa653c' : '#64648c',
                        }}
                      >
                        AV: {AV_QUALITY.find(a => a.id === venue.av_quality)?.label || venue.av_quality}
                      </Badge>
                    </div>
                  )}

                  {/* Linked Events */}
                  {linkedEvents.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">LINKED EVENTS</p>
                      <div className="space-y-2">
                        {linkedEvents.map(evt => {
                          const confirmedSpeaker = speakers.find(s => s.id === evt.speaker_id)
                          const candidateSpeakers = (evt.candidate_speaker_ids || [])
                            .map(sid => speakers.find(s => s.id === sid))
                            .filter(Boolean)
                          const checklist = evt.id // we'll check contract_signed via store if available
                          const isFinalized = confirmedSpeaker && candidateSpeakers.length <= 1

                          return (
                            <div key={evt.id} className="text-xs">
                              <p className="font-medium text-[11px]">{evt.title}</p>
                              {candidateSpeakers.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {candidateSpeakers.map(s => (
                                    <span
                                      key={s.id}
                                      className={`text-[10px] ${s.id === evt.speaker_id ? 'text-eo-blue font-semibold' : 'text-muted-foreground'}`}
                                    >
                                      {s.name}{s.id === evt.speaker_id ? ' ★' : ''}
                                      {s.id !== candidateSpeakers[candidateSpeakers.length - 1]?.id ? ', ' : ''}
                                    </span>
                                  ))}
                                </div>
                              ) : confirmedSpeaker ? (
                                <p className="text-[10px] text-eo-blue font-medium mt-0.5">{confirmedSpeaker.name} ★</p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-0.5">No speaker</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes preview */}
                  {venue.notes && (
                    <p className="mt-3 text-[11px] text-muted-foreground line-clamp-2 italic">{venue.notes}</p>
                  )}

                  {/* Contact info */}
                  {(venue.contact_name || venue.contact_email) && (
                    <div className="mt-3 pt-2 border-t flex items-center gap-2 text-[11px] text-muted-foreground">
                      {venue.contact_name && <span>{venue.contact_name}</span>}
                      {venue.contact_email && (
                        <span className="flex items-center gap-0.5">
                          <Mail className="h-2.5 w-2.5" /> {venue.contact_email}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Venue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rental</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">AV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Events</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map(venue => {
                const linkedEvents = venueEventMap[venue.id] || []
                return (
                  <tr key={venue.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEdit(venue)}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium">{venue.name}</span>
                        {venue.address && <p className="text-[11px] text-muted-foreground">{venue.address}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{getVenueTypeLabel(venue.venue_type)}</td>
                    <td className="px-4 py-3 text-sm">{venue.capacity || '—'}</td>
                    <td className="px-4 py-3 text-sm">{venue.base_rental_cost ? formatCurrency(venue.base_rental_cost) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {venue.av_cost_estimate ? formatCurrency(venue.av_cost_estimate) : '—'}
                        {venue.av_quality && (
                          <Badge variant="outline" className="text-[9px] ml-1">
                            {venue.av_quality}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {linkedEvents.length > 0 ? (
                        <div className="space-y-1">
                          {linkedEvents.map(evt => {
                            const candidateNames = (evt.candidate_speaker_ids || [])
                              .map(sid => speakers.find(s => s.id === sid))
                              .filter(Boolean)
                              .map(s => s.id === evt.speaker_id ? `${s.name} ★` : s.name)
                            const confirmedName = !candidateNames.length && evt.speaker_id
                              ? speakers.find(s => s.id === evt.speaker_id)?.name + ' ★'
                              : null
                            return (
                              <div key={evt.id}>
                                <p className="text-[11px] font-medium">{evt.title}</p>
                                <p className="text-[9px] text-muted-foreground">
                                  {candidateNames.length > 0 ? candidateNames.join(', ') : confirmedName || 'No speaker'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{venue.contact_name || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(venue) }}
                        className="text-muted-foreground hover:text-eo-pink transition-colors cursor-pointer p-1 rounded"
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
      )}

      {/* Add/Edit Venue Dialog */}
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
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium">Venue Name *</label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., The Wrigley Mansion" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium">Address</label>
                    <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Phoenix, AZ" />
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
                </div>
                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="General venue notes..." rows={3} />
                </div>
              </div>
            </TabsContent>

            {/* F&B Tab */}
            <TabsContent value="fb">
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-2 text-sm font-medium text-eo-pink">
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
              <Button
                variant="outline"
                className="text-eo-pink border-eo-pink hover:bg-eo-pink/10"
                onClick={() => {
                  handleDelete(editVenue)
                  setShowForm(false)
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
