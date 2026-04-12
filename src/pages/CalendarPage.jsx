import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES, EVENT_FORMATS } from '@/lib/constants'
import { formatCurrency, formatDateWithDay } from '@/lib/utils'
import ThemeInfo from '@/components/ThemeInfo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Calendar, MapPin, DollarSign, Handshake, Route } from 'lucide-react'

export default function CalendarPage() {
  const navigate = useNavigate()
  const { chapter, events, speakers, venues, budgetItems, saps, addEvent } = useStore()
  const { activePresidentTheme, activePresidentThemeDescription, activePresidentName } = useBoardStore()
  const { activeFiscalYear } = useFiscalYear()
  const incomingTheme = activePresidentTheme || chapter.president_theme || ''
  const incomingPresident = activePresidentName || chapter.president_name || ''
  const [createMonth, setCreateMonth] = useState(null)
  const [newEvent, setNewEvent] = useState({ title: '', event_type: 'traditional', event_format: 'keynote', theme_connection: '', event_date: '', expected_attendance: '' })

  const eventsByMonth = {}
  events.forEach(e => {
    if (e.month_index != null) {
      if (!eventsByMonth[e.month_index]) eventsByMonth[e.month_index] = []
      eventsByMonth[e.month_index].push(e)
    }
  })

  const getEventBudget = (eventId) => {
    return budgetItems
      .filter(b => b.event_id === eventId)
      .reduce((sum, b) => sum + (b.estimated_amount || 0), 0)
  }

  const handleCreate = () => {
    if (!newEvent.title) return
    const month = FISCAL_MONTHS[createMonth]
    const yearForMonth = month.calendarMonth >= 8 ? 2026 : 2027
    addEvent({
      ...newEvent,
      month_index: createMonth,
      event_date: newEvent.event_date || `${yearForMonth}-${String(month.calendarMonth).padStart(2, '0')}-15`,
      expected_attendance: newEvent.expected_attendance ? parseInt(newEvent.expected_attendance) : null,
      strategic_importance: STRATEGIC_MAP[createMonth]?.label.toLowerCase().replace(' ', '_'),
    })
    setCreateMonth(null)
    setNewEvent({ title: '', event_type: 'traditional', event_format: 'keynote', theme_connection: '', event_date: '', expected_attendance: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Year Arc Calendar</h1>
        <div className="flex items-center gap-2 mt-2">
          <Route className="h-4 w-4 text-eo-coral" />
          <p className="text-sm text-muted-foreground">
            {formatFiscalYear(activeFiscalYear)}{incomingPresident ? ` \u00b7 President: ${incomingPresident}` : ''} &middot; <ThemeInfo theme={incomingTheme} description={activePresidentThemeDescription} />
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-eo-coral" /> KICKOFF / RENEWAL / CLOSE</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-eo-blue" /> MOMENTUM / SUSTAIN</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-400" /> NO EVENT (Holiday)</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {FISCAL_MONTHS.map((month, i) => {
          const strategic = STRATEGIC_MAP[i]
          const monthEvents = eventsByMonth[i] || []
          const yearForMonth = month.calendarMonth >= 8 ? 2026 : 2027

          return (
            <div key={i} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Month Header with Strategic Banner */}
              <div className={`${strategic.color} ${strategic.textColor} px-4 py-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold tracking-wider">{strategic.label}</span>
                    <h3 className="text-lg font-bold">{month.name} {yearForMonth}</h3>
                  </div>
                  <Calendar className="h-5 w-5 opacity-50" />
                </div>
              </div>

              {/* Strategic Description */}
              <div className="px-4 py-2 bg-muted/50 border-b">
                <p className="text-[11px] text-muted-foreground italic">{strategic.description}</p>
              </div>

              {/* Events in this month */}
              <div className="p-4 min-h-[120px]">
                {monthEvents.length > 0 && (
                  <div className="space-y-3">
                    {monthEvents.map(event => {
                      const eventType = EVENT_TYPES.find(t => t.id === event.event_type)
                      const eventFormat = EVENT_FORMATS.find(f => f.id === event.event_format)
                      const budget = getEventBudget(event.id)
                      const eventSAPs = (event.sap_ids || []).map(sid => (saps || []).find(s => s.id === sid)).filter(Boolean)
                      const primarySpeaker = speakers.find(s => s.id === event.speaker_id)
                      const candidateSpeakers = (event.candidate_speaker_ids || [])
                        .map(sid => speakers.find(s => s.id === sid))
                        .filter(Boolean)

                      return (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border p-3 hover:border-eo-blue hover:shadow-sm cursor-pointer transition-all"
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold leading-tight">{event.title}</h4>
                            <div className="flex flex-col gap-0.5 items-end shrink-0">
                              {eventFormat && (
                                <Badge variant="outline" className="text-[9px]" style={{ borderColor: eventFormat.color, color: eventFormat.color }}>
                                  {eventFormat.label}
                                </Badge>
                              )}
                              {eventType && (
                                <Badge variant="outline" className="text-[9px]" style={{ borderColor: eventType.color, color: eventType.color }}>
                                  {eventType.label.split(' ')[0]}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {event.event_date && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDateWithDay(event.event_date)}
                            </div>
                          )}

                          {/* Show candidates with primary highlighted */}
                          {candidateSpeakers.length > 1 ? (
                            <div className="mt-1 space-y-0.5">
                              {candidateSpeakers.map(s => (
                                <div key={s.id} className={`flex items-center gap-1 text-xs ${s.id === event.speaker_id ? 'text-eo-blue font-medium' : 'text-muted-foreground'}`}>
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {s.name}{s.id === event.speaker_id ? ' ★' : ''}
                                </div>
                              ))}
                            </div>
                          ) : primarySpeaker ? (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {primarySpeaker.name}
                            </div>
                          ) : eventSAPs.length > 0 ? (
                            <div className="flex items-center gap-1 mt-1 text-xs text-eo-coral">
                              <Handshake className="h-3 w-3" />
                              {eventSAPs[0].company || eventSAPs[0].name}
                            </div>
                          ) : null}

                          {budget > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(budget)}
                            </div>
                          )}

                          {eventSAPs.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-eo-coral">
                              <Handshake className="h-3 w-3" />
                              {eventSAPs.map(s => s.company).join(', ')}
                            </div>
                          )}

                          {event.theme_connection && (
                            <p className="mt-2 text-[11px] text-muted-foreground italic border-t pt-2">
                              "{event.theme_connection}"
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <button
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-eo-blue hover:bg-blue-50/50 transition-colors cursor-pointer ${monthEvents.length > 0 ? 'mt-3 py-2' : 'h-full min-h-[80px] flex-col'}`}
                  onClick={() => setCreateMonth(i)}
                >
                  <Plus className={`text-muted-foreground ${monthEvents.length > 0 ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
                  <span className={`text-muted-foreground ${monthEvents.length > 0 ? 'text-[11px]' : 'text-xs mt-1'}`}>Add Event</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createMonth !== null} onOpenChange={() => setCreateMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create Event — {createMonth !== null && FISCAL_MONTHS[createMonth].name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="e.g., Kickoff: AI & the Exponential Future"
                value={newEvent.title}
                onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Event Type</label>
              <Select
                value={newEvent.event_type}
                onChange={e => setNewEvent(prev => ({ ...prev, event_type: e.target.value }))}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Event Format</label>
              <Select
                value={newEvent.event_format}
                onChange={e => setNewEvent(prev => ({ ...prev, event_format: e.target.value }))}
              >
                {EVENT_FORMATS.map(f => (
                  <option key={f.id} value={f.id}>{f.label} ({f.duration})</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newEvent.event_date}
                onChange={e => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Attendance</label>
              <Input
                type="number"
                placeholder="e.g., 120"
                value={newEvent.expected_attendance}
                onChange={e => setNewEvent(prev => ({ ...prev, expected_attendance: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Theme Connection</label>
              <Textarea
                placeholder={`How does this event tie to "${incomingTheme}"?`}
                value={newEvent.theme_connection}
                onChange={e => setNewEvent(prev => ({ ...prev, theme_connection: e.target.value }))}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
