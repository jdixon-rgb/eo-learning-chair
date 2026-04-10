import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import {
  FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES, EVENT_STATUSES, EVENT_FORMATS,
  BUDGET_CATEGORIES, CONTRACT_CHECKLIST_ITEMS, DEFAULT_MARKETING_MILESTONES,
} from '@/lib/constants'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft, Calendar, MapPin, Users, DollarSign, FileText, Megaphone,
  Star, Trash2, CheckCircle2, Circle, Clock, UserCheck, UserPlus, X, Shield,
  Handshake, Building2, Lock, LockOpen, Pencil,
} from 'lucide-react'
import EventDocuments from '@/components/EventDocuments'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    events, speakers, pipelineSpeakers, venues, budgetItems, contractChecklists, saps,
    updateEvent, deleteEvent,
    addBudgetItem, updateBudgetItem,
    getOrCreateChecklist, updateChecklist,
  } = useStore()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const event = events.find(e => e.id === id)
  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="link" onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    )
  }

  const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
  const strategic = event.month_index != null ? STRATEGIC_MAP[event.month_index] : null
  const eventType = EVENT_TYPES.find(t => t.id === event.event_type)
  const eventFormat = EVENT_FORMATS.find(f => f.id === event.event_format)
  const status = EVENT_STATUSES.find(s => s.id === event.status)
  const speaker = speakers.find(s => s.id === event.speaker_id)
  const venue = venues.find(v => v.id === event.venue_id)
  const eventBudget = budgetItems.filter(b => b.event_id === id)
  const totalBudget = eventBudget.reduce((s, b) => s + (b.budget_amount || 0), 0)
  const totalContracted = eventBudget.reduce((s, b) => s + (b.contracted_amount || 0), 0)
  const totalActual = eventBudget.reduce((s, b) => s + (b.actual_amount || 0), 0)
  const budgetDelta = totalBudget - totalContracted
  const budgetHealthPct = totalBudget > 0 ? (totalContracted / totalBudget) * 100 : 0
  const checklist = getOrCreateChecklist(id)

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/events')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Events
        </Button>
        <div className="flex items-start justify-between">
          <div>
            {month && strategic && (
              <Badge className={`${strategic.color} ${strategic.textColor} mb-2`}>
                {month.name} · {strategic.label}
              </Badge>
            )}
            <div className="flex items-center gap-2 group">
              {editingTitle && !event.title_locked ? (
                <input
                  className="text-2xl font-bold bg-transparent border-b-2 border-eo-blue outline-none flex-1 min-w-0"
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft.trim()) updateEvent(id, { title: titleDraft.trim() })
                    setEditingTitle(false)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') { setTitleDraft(event.title); setEditingTitle(false) }
                  }}
                  autoFocus
                />
              ) : (
                <h1
                  className={`text-2xl font-bold ${!event.title_locked ? 'cursor-text hover:text-eo-blue/80 transition-colors' : ''}`}
                  onClick={() => {
                    if (!event.title_locked) {
                      setTitleDraft(event.title)
                      setEditingTitle(true)
                    }
                  }}
                >
                  {event.title}
                </h1>
              )}
              {!editingTitle && !event.title_locked && (
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <button
                onClick={() => updateEvent(id, { title_locked: !event.title_locked })}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  event.title_locked
                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    : 'text-muted-foreground hover:text-eo-blue hover:bg-accent'
                }`}
                title={event.title_locked ? 'Title is locked — click to unlock' : 'Click to lock title'}
              >
                {event.title_locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>}
              {eventType && <span style={{ color: eventType.color }}>{eventType.label}</span>}
              {eventFormat && <Badge variant="outline" style={{ borderColor: eventFormat.color, color: eventFormat.color }}>{eventFormat.label} ({eventFormat.duration})</Badge>}
              {status && <Badge variant="outline" style={{ borderColor: status.color, color: status.color }}>{status.label}</Badge>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select
              value={event.status}
              onChange={e => updateEvent(id, { status: e.target.value })}
              className="w-44"
            >
              {EVENT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm(`Delete "${event.title}"? This will also remove its budget items and contract checklist. This cannot be undone.`)) {
                  deleteEvent(id)
                  navigate('/events')
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget ({formatCurrency(totalBudget)})</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Event Details */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold">Event Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input type="date" value={event.event_date || ''} onChange={e => updateEvent(id, { event_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Time</label>
                  <Input type="time" value={event.event_time || ''} onChange={e => updateEvent(id, { event_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Event Type</label>
                  <Select value={event.event_type || ''} onChange={e => updateEvent(id, { event_type: e.target.value })}>
                    <option value="">Select...</option>
                    {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Event Format</label>
                  <Select value={event.event_format || ''} onChange={e => updateEvent(id, { event_format: e.target.value })}>
                    <option value="">Select format...</option>
                    {EVENT_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label} ({f.duration})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected Attendance</label>
                  <Input type="number" value={event.expected_attendance || ''} onChange={e => updateEvent(id, { expected_attendance: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
              </div>

              {/* Candidate Speakers */}
              {(() => {
                const candidates = (event.candidate_speaker_ids || []).map(sid => pipelineSpeakers.find(s => s.id === sid) || speakers.find(s => s.id === sid)).filter(Boolean)
                const isSpeakerFinalized = checklist.contract_signed && event.speaker_id

                // Helper: get the best fee estimate for a speaker
                const getSpeakerFee = (s) => {
                  if (!s) return 0
                  if (s.fee_estimated) return s.fee_estimated
                  if (s.fee_range_low && s.fee_range_high) return (s.fee_range_low + s.fee_range_high) / 2
                  return s.fee_range_low || s.fee_range_high || 0
                }

                // Sync speaker_fee budget line when primary speaker changes
                const syncSpeakerFeeBudget = (speakerId) => {
                  const speakerObj = speakerId ? (pipelineSpeakers.find(s => s.id === speakerId) || speakers.find(s => s.id === speakerId)) : null
                  const fee = getSpeakerFee(speakerObj)
                  const existingItem = eventBudget.find(b => b.category === 'speaker_fee')
                  if (existingItem) {
                    updateBudgetItem(existingItem.id, { estimated_amount: fee, description: speakerObj ? `${speakerObj.name}` : '' })
                  } else if (fee > 0) {
                    addBudgetItem({ event_id: id, category: 'speaker_fee', description: speakerObj?.name || '', estimated_amount: fee, actual_amount: null })
                  }
                }

                const addCandidate = (speakerId) => {
                  if (!speakerId) return
                  const current = event.candidate_speaker_ids || []
                  if (!current.includes(speakerId)) {
                    updateEvent(id, { candidate_speaker_ids: [...current, speakerId] })
                  }
                  // Auto-set as primary if first candidate
                  if (!event.speaker_id) {
                    updateEvent(id, { speaker_id: speakerId, candidate_speaker_ids: [...current, speakerId] })
                    syncSpeakerFeeBudget(speakerId)
                  }
                }

                const removeCandidate = (speakerId) => {
                  const current = event.candidate_speaker_ids || []
                  const updated = current.filter(sid => sid !== speakerId)
                  const updates = { candidate_speaker_ids: updated }
                  if (event.speaker_id === speakerId) {
                    updates.speaker_id = updated[0] || null
                    syncSpeakerFeeBudget(updated[0] || null)
                  }
                  updateEvent(id, updates)
                }

                const setPrimary = (speakerId) => {
                  updateEvent(id, { speaker_id: speakerId })
                  syncSpeakerFeeBudget(speakerId)
                }

                const availableSpeakers = pipelineSpeakers.filter(s =>
                  s.pipeline_stage !== 'passed' && !(event.candidate_speaker_ids || []).includes(s.id)
                )

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">
                        {isSpeakerFinalized ? 'Confirmed Speaker' : 'Candidate Speakers'}
                      </label>
                      {isSpeakerFinalized && (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                          <Shield className="h-3 w-3 mr-0.5" /> Finalized (Contract Signed)
                        </Badge>
                      )}
                    </div>

                    {/* Current candidates */}
                    {candidates.length > 0 ? (
                      <div className="space-y-1.5 mb-2">
                        {candidates.map(s => {
                          const isPrimary = s.id === event.speaker_id
                          return (
                            <div key={s.id} className={`flex items-center justify-between p-2 rounded-lg border text-sm ${isPrimary ? 'border-eo-blue bg-eo-blue/5' : 'border-border'}`}>
                              <div className="flex items-center gap-2">
                                {isPrimary ? (
                                  <UserCheck className="h-3.5 w-3.5 text-eo-blue" />
                                ) : (
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <span className={isPrimary ? 'font-semibold text-eo-blue' : ''}>{s.name}</span>
                                {s.fee_range_low && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatCurrency(s.fee_range_low)}–{formatCurrency(s.fee_range_high)}
                                  </span>
                                )}
                                {isPrimary && <Badge variant="outline" className="text-[9px] border-eo-blue text-eo-blue">Primary</Badge>}
                              </div>
                              {!isSpeakerFinalized && (
                                <div className="flex items-center gap-1">
                                  {!isPrimary && (
                                    <button
                                      onClick={() => setPrimary(s.id)}
                                      className="text-[10px] text-eo-blue hover:underline cursor-pointer px-1"
                                    >
                                      Set Primary
                                    </button>
                                  )}
                                  <button onClick={() => removeCandidate(s.id)} className="text-muted-foreground hover:text-eo-pink cursor-pointer p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-2 italic">No speakers added yet</p>
                    )}

                    {/* Add candidate dropdown */}
                    {!isSpeakerFinalized && availableSpeakers.length > 0 && (
                      <Select
                        value=""
                        onChange={e => { addCandidate(e.target.value); e.target.value = '' }}
                        className="text-xs"
                      >
                        <option value="">+ Add candidate speaker...</option>
                        {availableSpeakers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}{s.fee_range_low ? ` (${formatCurrency(s.fee_range_low)}–${formatCurrency(s.fee_range_high)})` : ''}
                          </option>
                        ))}
                      </Select>
                    )}

                    {!isSpeakerFinalized && candidates.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                        The primary speaker is finalized when "Contract signed" is checked on the Contract tab.
                      </p>
                    )}
                  </div>
                )
              })()}

              <div>
                <label className="text-xs text-muted-foreground">Venue</label>
                <Select value={event.venue_id || ''} onChange={e => updateEvent(id, { venue_id: e.target.value || null })}>
                  <option value="">No venue assigned</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name} (cap: {v.capacity})</option>)}
                </Select>
              </div>
            </div>

            {/* Theme + Day Chair */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold">Theme Connection</h3>
                <Textarea
                  value={event.theme_connection || ''}
                  onChange={e => updateEvent(id, { theme_connection: e.target.value })}
                  placeholder="How does this event tie to the president's theme?"
                  rows={3}
                />
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold">Day Chair</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input value={event.day_chair_name || ''} onChange={e => updateEvent(id, { day_chair_name: e.target.value })} placeholder="Member name" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={event.day_chair_phone || ''} onChange={e => updateEvent(id, { day_chair_phone: e.target.value })} placeholder="(555) 123-4567" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic">Pro tip: Volunteer frequent complainers as Day Chair.</p>
              </div>

              {/* Strategic Alliance Partners */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-eo-coral" />
                  <h3 className="text-sm font-semibold">Strategic Alliance Partners</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">SAPs are sponsors who support EO and can run workshops or contribute to events.</p>

                {/* Current SAPs for this event */}
                {(() => {
                  const eventSAPs = (event.sap_ids || []).map(sid => (saps || []).find(s => s.id === sid)).filter(Boolean)
                  const availableSAPs = (saps || []).filter(s => !(event.sap_ids || []).includes(s.id))

                  const addSAPToEvent = (sapId) => {
                    if (!sapId) return
                    const current = event.sap_ids || []
                    if (!current.includes(sapId)) {
                      updateEvent(id, { sap_ids: [...current, sapId] })
                    }
                  }

                  const removeSAPFromEvent = (sapId) => {
                    updateEvent(id, { sap_ids: (event.sap_ids || []).filter(sid => sid !== sapId) })
                  }

                  return (
                    <>
                      {eventSAPs.length > 0 ? (
                        <div className="space-y-2">
                          {eventSAPs.map(sap => (
                            <div key={sap.id} className="flex items-start justify-between p-3 rounded-lg border border-eo-coral/30 bg-eo-coral/5">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-eo-coral" />
                                  <span className="text-sm font-semibold">{sap.name}</span>
                                  <Badge variant="outline" className="text-[9px] border-eo-coral/50 text-eo-coral">{sap.company}</Badge>
                                </div>
                                {sap.contribution_type && (
                                  <p className="text-xs text-muted-foreground mt-1 capitalize">{sap.contribution_type}: {sap.contribution_description}</p>
                                )}
                              </div>
                              <button onClick={() => removeSAPFromEvent(sap.id)} className="text-muted-foreground hover:text-eo-pink cursor-pointer p-0.5 ml-2">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No SAPs linked to this event</p>
                      )}

                      {availableSAPs.length > 0 && (
                        <Select
                          value=""
                          onChange={e => { addSAPToEvent(e.target.value); e.target.value = '' }}
                          className="text-xs"
                        >
                          <option value="">+ Link a SAP to this event...</option>
                          {availableSAPs.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — {s.company}</option>
                          ))}
                        </Select>
                      )}
                    </>
                  )
                })()}
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold">Notes</h3>
                <Textarea
                  value={event.notes || ''}
                  onChange={e => updateEvent(id, { notes: e.target.value })}
                  placeholder="General notes about this event..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* BUDGET TAB */}
        <TabsContent value="budget">
          <div className="mt-4 space-y-4">
            {/* Budget Summary Bar */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contracted</p>
                  <p className={`text-lg font-bold ${totalContracted > totalBudget && totalBudget > 0 ? 'text-eo-pink' : ''}`}>
                    {formatCurrency(totalContracted)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-lg font-bold">{formatCurrency(totalActual)}</p>
                </div>
              </div>
              {totalBudget > 0 && (
                <>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetHealthPct > 100 ? 'bg-eo-pink' : budgetHealthPct > 75 ? 'bg-eo-coral' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budgetHealthPct, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${budgetDelta < 0 ? 'text-eo-pink font-medium' : 'text-muted-foreground'}`}>
                    {budgetDelta >= 0 ? `${formatCurrency(budgetDelta)} remaining` : `${formatCurrency(Math.abs(budgetDelta))} over budget`}
                  </p>
                </>
              )}
            </div>

            {/* Category Rows */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Budget by Category</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-semibold text-foreground">
                    <th className="pb-2 text-left">Category</th>
                    <th className="pb-2 text-right">Budget</th>
                    <th className="pb-2 text-right">Contracted</th>
                    <th className="pb-2 text-right">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {BUDGET_CATEGORIES.map(cat => {
                    const item = eventBudget.find(b => b.category === cat.id)
                    const budgetAmt = item?.budget_amount || 0
                    const contractedAmt = item?.contracted_amount || 0
                    const actualAmt = item?.actual_amount || 0
                    const isOverBudget = contractedAmt > budgetAmt && budgetAmt > 0

                    return (
                      <tr key={cat.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm">{cat.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28 ml-auto"
                            type="number"
                            value={budgetAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : 0
                              if (item) {
                                updateBudgetItem(item.id, { budget_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: val, contracted_amount: 0, actual_amount: null })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className={`h-8 text-xs text-right w-28 ml-auto ${isOverBudget ? 'border-eo-pink text-eo-pink' : ''}`}
                            type="number"
                            value={contractedAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : 0
                              if (item) {
                                updateBudgetItem(item.id, { contracted_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: 0, contracted_amount: val, actual_amount: null })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28 ml-auto"
                            type="number"
                            value={actualAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null
                              if (item) {
                                updateBudgetItem(item.id, { actual_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: 0, contracted_amount: 0, actual_amount: val })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold text-sm">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{formatCurrency(totalBudget)}</td>
                    <td className={`py-2 text-right ${totalContracted > totalBudget && totalBudget > 0 ? 'text-eo-pink' : ''}`}>
                      {formatCurrency(totalContracted)}
                    </td>
                    <td className="py-2 text-right">{formatCurrency(totalActual)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* CONTRACT TAB */}
        <TabsContent value="contract">
          <div className="mt-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold">Contract Checklist</h3>
              <p className="text-xs text-muted-foreground">Wisdom from the Learning Chair Summit — protect your chapter.</p>

              <div className="space-y-3">
                {CONTRACT_CHECKLIST_ITEMS.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                    <Checkbox
                      checked={checklist[item.id] || false}
                      onCheckedChange={(val) => updateChecklist(checklist.id, { [item.id]: val })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    {checklist[item.id] && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <label className="text-xs font-medium">Contract Notes</label>
                <Textarea
                  value={checklist.contract_notes || ''}
                  onChange={e => updateChecklist(checklist.id, { contract_notes: e.target.value })}
                  placeholder="Additional notes about the contract..."
                  rows={3}
                />
              </div>

              {/* Progress indicator */}
              {(() => {
                const completed = CONTRACT_CHECKLIST_ITEMS.filter(item => checklist[item.id]).length
                const total = CONTRACT_CHECKLIST_ITEMS.length
                return (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{completed}/{total}</span>
                  </div>
                )
              })()}

              {/* Documents section */}
              <EventDocuments eventId={id} />
            </div>
          </div>
        </TabsContent>

        {/* MARKETING TAB */}
        <TabsContent value="marketing">
          <div className="mt-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Marketing Timeline</h3>
                  <p className="text-xs text-muted-foreground">6-week countdown to event. Start promoting early.</p>
                </div>
                {event.event_date && (
                  <Badge variant={daysUntil(event.event_date) <= 42 ? 'coral' : 'blue'}>
                    {daysUntil(event.event_date)} days to event
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {DEFAULT_MARKETING_MILESTONES.map((milestone, i) => {
                  const targetDate = event.event_date
                    ? new Date(new Date(event.event_date) - milestone.week * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    : null
                  const isPast = targetDate && new Date(targetDate) < new Date()

                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isPast ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          W{milestone.week}
                        </div>
                        {i < DEFAULT_MARKETING_MILESTONES.length - 1 && (
                          <div className="w-px h-4 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{milestone.name}</p>
                        <p className="text-xs text-muted-foreground">{milestone.description}</p>
                        {targetDate && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Target: {formatDate(targetDate)}
                            {isPast && <span className="text-eo-coral ml-1">(overdue)</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* FEEDBACK TAB */}
        <TabsContent value="feedback">
          <div className="mt-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold">Post-Event Feedback</h3>
              <p className="text-xs text-muted-foreground">Keep it simple. NPS + one question. Don't exhaust members with long surveys.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Actual Attendance</label>
                  <Input
                    type="number"
                    value={event.actual_attendance ?? ''}
                    onChange={e => updateEvent(id, { actual_attendance: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={event.expected_attendance ? `Expected: ${event.expected_attendance}` : ''}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">NPS Score (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={event.nps_score ?? ''}
                    onChange={e => updateEvent(id, { nps_score: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Top Takeaway</label>
                <Textarea
                  value={event.nps_top_takeaway || ''}
                  onChange={e => updateEvent(id, { nps_top_takeaway: e.target.value })}
                  placeholder="What was the #1 thing members took away from this event?"
                  rows={3}
                />
              </div>

              {event.nps_score && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <div className={`text-3xl font-bold ${
                    event.nps_score >= 8 ? 'text-green-600' : event.nps_score >= 6 ? 'text-eo-coral' : 'text-eo-pink'
                  }`}>
                    {event.nps_score}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {event.nps_score >= 8 ? 'Excellent' : event.nps_score >= 6 ? 'Good' : 'Needs improvement'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.nps_score >= 8 ? 'Members loved it. This is your benchmark.' : event.nps_score >= 6 ? 'Solid event. Room to grow.' : 'Dig into feedback. What missed?'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
