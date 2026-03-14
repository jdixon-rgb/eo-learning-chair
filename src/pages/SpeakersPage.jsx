import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { PIPELINE_STAGES, CONTACT_METHODS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Star, Phone, Mail, Globe, ArrowRight, GripVertical, User, CalendarDays, DollarSign, Play } from 'lucide-react'

const emptyForm = {
  name: '', topic: '', bio: '', fee_range_low: '', fee_range_high: '',
  fee_estimated: '', fee_actual: '',
  contact_email: '', contact_phone: '', agency_name: '', agency_contact: '',
  contact_method: 'direct', fit_score: 7, notes: '', sizzle_reel_url: '',
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

  // Map speaker → event assignment (includes candidate assignments)
  const speakerEventMap = {}
  events.forEach(evt => {
    // Track all candidate assignments
    const allSpeakerIds = new Set([
      ...(evt.candidate_speaker_ids || []),
      ...(evt.speaker_id ? [evt.speaker_id] : []),
    ])
    allSpeakerIds.forEach(sid => {
      if (!speakerEventMap[sid]) speakerEventMap[sid] = []
      speakerEventMap[sid].push(evt)
    })
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
      fee_estimated: speakerData.fee_estimated ? parseFloat(speakerData.fee_estimated) : null,
      fee_actual: speakerData.fee_actual ? parseFloat(speakerData.fee_actual) : null,
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

    // Handle event assignment changes (adds speaker as candidate)
    if (speakerId) {
      // Remove speaker from events they were previously a candidate for (if different event)
      events.forEach(evt => {
        const candidates = evt.candidate_speaker_ids || []
        if (candidates.includes(speakerId) && evt.id !== assigned_event_id) {
          updateEvent(evt.id, {
            candidate_speaker_ids: candidates.filter(sid => sid !== speakerId),
            ...(evt.speaker_id === speakerId ? { speaker_id: candidates.filter(sid => sid !== speakerId)[0] || null } : {}),
          })
        }
      })
      // Add as candidate to the selected event
      if (assigned_event_id) {
        const evt = events.find(e => e.id === assigned_event_id)
        const current = evt?.candidate_speaker_ids || []
        if (!current.includes(speakerId)) {
          updateEvent(assigned_event_id, {
            candidate_speaker_ids: [...current, speakerId],
            ...(!evt?.speaker_id ? { speaker_id: speakerId } : {}),
          })
        }
      }
    }

    setShowForm(false)
    setEditSpeaker(null)
    setForm(emptyForm)
  }

  const openEdit = (speaker) => {
    setEditSpeaker(speaker)
    const assignedEvt = events.find(e => (e.candidate_speaker_ids || []).includes(speaker.id) || e.speaker_id === speaker.id)
    setForm({
      name: speaker.name || '',
      topic: speaker.topic || '',
      bio: speaker.bio || '',
      fee_range_low: speaker.fee_range_low || '',
      fee_range_high: speaker.fee_range_high || '',
      fee_estimated: speaker.fee_estimated || '',
      fee_actual: speaker.fee_actual || '',
      contact_email: speaker.contact_email || '',
      contact_phone: speaker.contact_phone || '',
      agency_name: speaker.agency_name || '',
      agency_contact: speaker.agency_contact || '',
      contact_method: speaker.contact_method || 'direct',
      fit_score: speaker.fit_score || 7,
      notes: speaker.notes || '',
      sizzle_reel_url: speaker.sizzle_reel_url || '',
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
            {speaker.sizzle_reel_url && (
              <a
                href={speaker.sizzle_reel_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                onDragStart={e => e.stopPropagation()}
                title="Watch sizzle reel"
                className="shrink-0 w-5 h-5 rounded-full bg-eo-blue/10 hover:bg-eo-blue/20 flex items-center justify-center transition-colors"
              >
                <Play className="h-2.5 w-2.5 text-eo-blue fill-eo-blue" />
              </a>
            )}
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
        {/* Inline estimated / actual fee inputs */}
        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
          <InlineFeeInput
            label="Estimated"
            value={speaker.fee_estimated}
            onSave={val => updateSpeaker(speaker.id, { fee_estimated: val })}
          />
          <InlineFeeInput
            label="Actual"
            value={speaker.fee_actual}
            onSave={val => updateSpeaker(speaker.id, { fee_actual: val })}
          />
        </div>
        {assignedEvents.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {assignedEvents.map(e => {
              const isPrimary = e.speaker_id === speaker.id
              return (
                <div key={e.id} className={`flex items-center gap-1 text-[11px] ${isPrimary ? 'text-eo-blue font-semibold' : 'text-muted-foreground'}`}>
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className="truncate">{e.title.split(':')[0]}</span>
                  {isPrimary && <span className="text-[9px]">★</span>}
                </div>
              )
            })}
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
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Estimated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actual</th>
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
                  <td className="px-4 py-3 text-sm text-right">
                    {speaker.fee_estimated ? formatCurrency(speaker.fee_estimated) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {speaker.fee_actual ? formatCurrency(speaker.fee_actual) : '—'}
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
                <label className="text-xs font-medium">Estimated Fee ($)</label>
                <Input type="number" value={form.fee_estimated} onChange={e => setForm(p => ({ ...p, fee_estimated: e.target.value }))} placeholder="Negotiated estimate" />
              </div>
              <div>
                <label className="text-xs font-medium">Actual Fee ($)</label>
                <Input type="number" value={form.fee_actual} onChange={e => setForm(p => ({ ...p, fee_actual: e.target.value }))} placeholder="Final amount paid" />
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
                <label className="text-xs font-medium">Sizzle Reel URL</label>
                <Input value={form.sizzle_reel_url} onChange={e => setForm(p => ({ ...p, sizzle_reel_url: e.target.value }))} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
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
                    const candidateCount = (evt.candidate_speaker_ids || []).length
                    const primarySpeaker = evt.speaker_id ? speakers.find(s => s.id === evt.speaker_id) : null
                    return (
                      <option key={evt.id} value={evt.id}>
                        {evt.title}{candidateCount > 0 ? ` (${candidateCount} candidates${primarySpeaker ? `, primary: ${primarySpeaker.name}` : ''})` : ''}
                      </option>
                    )
                  })}
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Adds this speaker as a candidate for the event. Set the primary speaker and finalize via the Contract tab.
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

// ── Stable helper: local state prevents unmount on every keystroke ──
function InlineFeeInput({ label, value, onSave }) {
  const [local, setLocal] = useState(value ?? '')

  // Sync from parent when the speaker's stored value changes externally
  useEffect(() => { setLocal(value ?? '') }, [value])

  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
      <Input
        className="h-7 text-xs text-right"
        type="number"
        value={local}
        placeholder="$"
        onClick={e => e.stopPropagation()}
        onDragStart={e => e.stopPropagation()}
        onChange={e => {
          e.stopPropagation()
          setLocal(e.target.value)
        }}
        onBlur={() => onSave(local ? parseFloat(local) : null)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
      />
    </div>
  )
}
