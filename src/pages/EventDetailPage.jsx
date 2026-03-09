import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import {
  FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES, EVENT_STATUSES,
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
  Star, Plus, Trash2, CheckCircle2, Circle, Clock,
} from 'lucide-react'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    events, speakers, venues, budgetItems, contractChecklists,
    updateEvent, deleteEvent,
    addBudgetItem, updateBudgetItem, deleteBudgetItem,
    getOrCreateChecklist, updateChecklist,
  } = useStore()

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
  const status = EVENT_STATUSES.find(s => s.id === event.status)
  const speaker = speakers.find(s => s.id === event.speaker_id)
  const venue = venues.find(v => v.id === event.venue_id)
  const eventBudget = budgetItems.filter(b => b.event_id === id)
  const totalBudget = eventBudget.reduce((s, b) => s + (b.estimated_amount || 0), 0)
  const totalActual = eventBudget.reduce((s, b) => s + (b.actual_amount || 0), 0)
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
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>}
              {eventType && <span style={{ color: eventType.color }}>{eventType.label}</span>}
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
                  <label className="text-xs text-muted-foreground">Expected Attendance</label>
                  <Input type="number" value={event.expected_attendance || ''} onChange={e => updateEvent(id, { expected_attendance: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Speaker</label>
                <Select value={event.speaker_id || ''} onChange={e => updateEvent(id, { speaker_id: e.target.value || null })}>
                  <option value="">No speaker assigned</option>
                  {speakers.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.fee_range_low)}–{formatCurrency(s.fee_range_high)})</option>)}
                </Select>
              </div>

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
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Event Budget</h3>
                  <p className="text-xs text-muted-foreground">Estimated: {formatCurrency(totalBudget)} | Actual: {formatCurrency(totalActual)}</p>
                </div>
                <Button size="sm" onClick={() => addBudgetItem({ event_id: id, category: 'speaker_fee', description: '', estimated_amount: 0, actual_amount: null })}>
                  <Plus className="h-4 w-4" /> Add Line Item
                </Button>
              </div>

              {eventBudget.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="pb-2 text-left">Category</th>
                      <th className="pb-2 text-left">Description</th>
                      <th className="pb-2 text-right">Estimated</th>
                      <th className="pb-2 text-right">Actual</th>
                      <th className="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventBudget.map(item => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Select value={item.category} onChange={e => updateBudgetItem(item.id, { category: e.target.value })} className="text-xs h-8">
                            {BUDGET_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </Select>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs"
                            value={item.description || ''}
                            onChange={e => updateBudgetItem(item.id, { description: e.target.value })}
                            placeholder="Description"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28"
                            type="number"
                            value={item.estimated_amount || ''}
                            onChange={e => updateBudgetItem(item.id, { estimated_amount: e.target.value ? parseFloat(e.target.value) : 0 })}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28"
                            type="number"
                            value={item.actual_amount ?? ''}
                            onChange={e => updateBudgetItem(item.id, { actual_amount: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2">
                          <button onClick={() => deleteBudgetItem(item.id)} className="text-muted-foreground hover:text-eo-pink cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold text-sm">
                      <td colSpan={2} className="py-2">Total</td>
                      <td className="py-2 text-right">{formatCurrency(totalBudget)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalActual)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No budget items yet. Click "Add Line Item" to start.</p>
              )}
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
