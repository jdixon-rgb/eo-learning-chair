import { useState } from 'react'
import { useStore } from '@/lib/store'
import { PIPELINE_STAGES, CONTACT_METHODS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Star, Phone, Mail, Globe, ArrowRight, GripVertical, User, CalendarDays } from 'lucide-react'

const emptyForm = {
  name: '', topic: '', bio: '', fee_range_low: '', fee_range_high: '',
  contact_email: '', contact_phone: '', agency_name: '', agency_contact: '',
  contact_method: 'direct', fit_score: 7, notes: '',
  routing_flexibility: false, multi_chapter_interest: false,
}

export default function SpeakersPage() {
  const { speakers, events, updateEvent, addSpeaker, updateSpeaker, deleteSpeaker } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editSpeaker, setEditSpeaker] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('kanban') // kanban or list
  const [dragSpeaker, setDragSpeaker] = useState(null)

  // Map speaker → event assignment
  const speakerEventMap = {}
  events.forEach(evt => {
    if (evt.speaker_id) {
      if (!speakerEventMap[evt.speaker_id]) speakerEventMap[evt.speaker_id] = []
      speakerEventMap[evt.speaker_id].push(evt)
    }
  })

  const filteredSpeakers = speakers.filter(s =>
    s.pipeline_stage !== 'passed' &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.topic?.toLowerCase().includes(search.toLowerCase()))
  )

  const passedSpeakers = speakers.filter(s => s.pipeline_stage === 'passed')

  const handleSubmit = () => {
    if (!form.name) return
    const { assigned_event_id, ...speakerData } = form
    const data = {
      ...speakerData,
      fee_range_low: speakerData.fee_range_low ? parseFloat(speakerData.fee_range_low) : null,
      fee_range_high: speakerData.fee_range_high ? parseFloat(speakerData.fee_range_high) : null,
      fit_score: parseInt(speakerData.fit_score),
    }
    let speakerId
    if (editSpeaker) {
      updateSpeaker(editSpeaker.id, data)
      speakerId = editSpeaker.id
    } else {
      const newSpeaker = addSpeaker({ ...data, pipeline_stage: 'researching' })
      speakerId = newSpeaker.id
    }

    // Handle event assignment changes
    if (speakerId) {
      // Remove speaker from any events they were previously assigned to
      events.forEach(evt => {
        if (evt.speaker_id === speakerId && evt.id !== assigned_event_id) {
          updateEvent(evt.id, { speaker_id: null })
        }
      })
      // Assign to the selected event
      if (assigned_event_id) {
        updateEvent(assigned_event_id, { speaker_id: speakerId })
      }
    }

    setShowForm(false)
    setEditSpeaker(null)
    setForm(emptyForm)
  }

  const openEdit = (speaker) => {
    setEditSpeaker(speaker)
    const assignedEvt = events.find(e => e.speaker_id === speaker.id)
    setForm({
      name: speaker.name || '',
      topic: speaker.topic || '',
      bio: speaker.bio || '',
      fee_range_low: speaker.fee_range_low || '',
      fee_range_high: speaker.fee_range_high || '',
      contact_email: speaker.contact_email || '',
      contact_phone: speaker.contact_phone || '',
      agency_name: speaker.agency_name || '',
      agency_contact: speaker.agency_contact || '',
      contact_method: speaker.contact_method || 'direct',
      fit_score: speaker.fit_score || 7,
      notes: speaker.notes || '',
      routing_flexibility: speaker.routing_flexibility || false,
      multi_chapter_interest: speaker.multi_chapter_interest || false,
      assigned_event_id: assignedEvt?.id || '',
    })
    setShowForm(true)
  }

  const handleDragStart = (speaker) => setDragSpeaker(speaker)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (stageId) => {
    if (dragSpeaker) {
      updateSpeaker(dragSpeaker.id, { pipeline_stage: stageId })
      setDragSpeaker(null)
    }
  }

  const SpeakerCard = ({ speaker }) => {
    const assignedEvents = speakerEventMap[speaker.id] || []
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(speaker)}
        className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
        onClick={() => openEdit(speaker)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
            <h4 className="text-sm font-semibold">{speaker.name}</h4>
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.ceil((speaker.fit_score || 0) / 2) ? 'text-eo-coral fill-eo-coral' : 'text-gray-200'}`}
              />
            ))}
          </div>
        </div>
        {speaker.topic && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{speaker.topic}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-medium">
            {speaker.fee_range_low ? `${formatCurrency(speaker.fee_range_low)}–${formatCurrency(speaker.fee_range_high)}` : 'TBD'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {CONTACT_METHODS.find(m => m.id === speaker.contact_method)?.label || 'Direct'}
          </Badge>
        </div>
        {assignedEvents.length > 0 && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-eo-blue font-medium">
            <CalendarDays className="h-3 w-3" />
            {assignedEvents.map(e => e.title.split(':')[0]).join(', ')}
          </div>
        )}
        {speaker.notes && (
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 border-t pt-2">{speaker.notes}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Speaker Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">{speakers.length} speakers tracked</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search speakers..."
              className="pl-9 w-60"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
            {viewMode === 'kanban' ? 'List View' : 'Kanban View'}
          </Button>
          <Button size="sm" onClick={() => { setEditSpeaker(null); setForm(emptyForm); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Add Speaker
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageSpeakers = filteredSpeakers.filter(s => s.pipeline_stage === stage.id)
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-64"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">({stageSpeakers.length})</span>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                  {stageSpeakers.map(speaker => (
                    <SpeakerCard key={speaker.id} speaker={speaker} />
                  ))}
                  {stageSpeakers.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                      Drag speakers here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fee Range</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpeakers.map(speaker => (
                <tr key={speaker.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEdit(speaker)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-eo-blue/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-eo-blue" />
                      </div>
                      <span className="text-sm font-medium">{speaker.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{speaker.topic}</td>
                  <td className="px-4 py-3 text-sm">
                    {speaker.fee_range_low ? `${formatCurrency(speaker.fee_range_low)}–${formatCurrency(speaker.fee_range_high)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-eo-coral fill-eo-coral" />
                      <span className="text-sm">{speaker.fit_score}/10</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: PIPELINE_STAGES.find(s => s.id === speaker.pipeline_stage)?.color }}>
                      {PIPELINE_STAGES.find(s => s.id === speaker.pipeline_stage)?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {CONTACT_METHODS.find(m => m.id === speaker.contact_method)?.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Passed Speakers Archive */}
      {passedSpeakers.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Passed ({passedSpeakers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {passedSpeakers.map(s => (
              <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => openEdit(s)}>
                {s.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Speaker Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSpeaker ? 'Edit Speaker' : 'Add Speaker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Name *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Speaker name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Topic / Expertise</label>
                <Input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} placeholder="AI, Leadership, etc." />
              </div>
              <div>
                <label className="text-xs font-medium">Fee Low ($)</label>
                <Input type="number" value={form.fee_range_low} onChange={e => setForm(p => ({ ...p, fee_range_low: e.target.value }))} placeholder="15000" />
              </div>
              <div>
                <label className="text-xs font-medium">Fee High ($)</label>
                <Input type="number" value={form.fee_range_high} onChange={e => setForm(p => ({ ...p, fee_range_high: e.target.value }))} placeholder="25000" />
              </div>
              <div>
                <label className="text-xs font-medium">Contact Method</label>
                <Select value={form.contact_method} onChange={e => setForm(p => ({ ...p, contact_method: e.target.value }))}>
                  {CONTACT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Fit Score (1-10)</label>
                <Input type="number" min="1" max="10" value={form.fit_score} onChange={e => setForm(p => ({ ...p, fit_score: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="speaker@email.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              {form.contact_method === 'agency' && (
                <>
                  <div>
                    <label className="text-xs font-medium">Agency Name</label>
                    <Input value={form.agency_name} onChange={e => setForm(p => ({ ...p, agency_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Agency Contact</label>
                    <Input value={form.agency_contact} onChange={e => setForm(p => ({ ...p, agency_contact: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="text-xs font-medium">Bio</label>
                <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief bio..." rows={2} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Negotiation strategy, referral source, etc." rows={3} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Event Assignment</label>
                <Select value={form.assigned_event_id || ''} onChange={e => setForm(p => ({ ...p, assigned_event_id: e.target.value }))}>
                  <option value="">Not assigned to an event</option>
                  {[...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99)).map(evt => {
                    const otherSpeaker = evt.speaker_id && evt.speaker_id !== editSpeaker?.id
                      ? speakers.find(s => s.id === evt.speaker_id)
                      : null
                    return (
                      <option key={evt.id} value={evt.id}>
                        {evt.title}{otherSpeaker ? ` (current: ${otherSpeaker.name})` : ''}
                      </option>
                    )
                  })}
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Assign this speaker to an event. Multiple speakers can be considered — only one is assigned at a time.
                </p>
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.routing_flexibility} onChange={e => setForm(p => ({ ...p, routing_flexibility: e.target.checked }))} />
                  Routing flexibility (flexible dates)
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.multi_chapter_interest} onChange={e => setForm(p => ({ ...p, multi_chapter_interest: e.target.checked }))} />
                  Multi-chapter bundling interest
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">{editSpeaker ? 'Save Changes' : 'Add Speaker'}</Button>
              {editSpeaker && (
                <Button variant="outline" className="text-eo-pink border-eo-pink hover:bg-eo-pink/10" onClick={() => {
                  if (confirm('Move this speaker to Passed?')) {
                    updateSpeaker(editSpeaker.id, { pipeline_stage: 'passed' })
                    setShowForm(false)
                  }
                }}>
                  Mark Passed
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
