import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES, EVENT_STATUSES, EVENT_FORMATS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin, Users, Wallet, ArrowRight, Trash2, Handshake, Download } from 'lucide-react'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'
import { downloadEventsBackup } from '@/lib/backupExport'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'

export default function EventsPage() {
  const navigate = useNavigate()
  const { chapter, events, speakers, venues, budgetItems, contractChecklists, eventDocuments, saps, deleteEvent } = useStore()
  const { activeFiscalYear } = useFiscalYear()

  const sortedEvents = [...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99))

  const getEventBudget = (eventId) =>
    budgetItems.filter(b => b.event_id === eventId).reduce((s, b) => s + (b.budget_amount || 0), 0)

  return (
    <div className="space-y-6">
      <TourTip />
      <div className="flex items-center justify-between">
        <PageHeader
          title="Events"
          subtitle={`${events.length} events planned`}
        />
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            title="Download a chapter-scoped XLSX backup: events, budget items, contract checklists, document metadata"
            onClick={() => downloadEventsBackup({
              chapterName: chapter?.name,
              events,
              budgetItems,
              contractChecklists,
              eventDocuments,
              fiscalYear: formatFiscalYear(activeFiscalYear),
            })}
          >
            <Download className="h-4 w-4" /> Backup
          </Button>
          <Button size="sm" onClick={() => navigate('/calendar')}>
            View Calendar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedEvents.map(event => {
          const eventType = EVENT_TYPES.find(t => t.id === event.event_type)
          const eventFormat = EVENT_FORMATS.find(f => f.id === event.event_format)
          const status = EVENT_STATUSES.find(s => s.id === event.status)
          const eventSAPs = (event.sap_ids || []).map(sid => (saps || []).find(s => s.id === sid)).filter(Boolean)
          const primarySpeaker = speakers.find(s => s.id === event.speaker_id)
          const candidateSpeakers = (event.candidate_speaker_ids || [])
            .map(sid => speakers.find(s => s.id === sid))
            .filter(Boolean)
          const venue = venues.find(v => v.id === event.venue_id)
          const budget = getEventBudget(event.id)
          const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
          const strategic = event.month_index != null ? STRATEGIC_MAP[event.month_index] : null

          return (
            <div
              key={event.id}
              className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {/* Top color bar */}
              {strategic && (
                <div className={`${strategic.color} h-1.5`} />
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    {month && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {month.name} {month.calendarMonth >= 8 ? 2026 : 2027}
                        {strategic && <span className="ml-1 font-semibold" style={{ color: eventType?.color }}>· {strategic.label}</span>}
                      </p>
                    )}
                    <h3 className="text-base font-semibold leading-tight">{event.title}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {eventFormat && (
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: eventFormat.color, color: eventFormat.color }}>
                        {eventFormat.label}
                      </Badge>
                    )}
                    {eventType && (
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: eventType.color, color: eventType.color }}>
                        {eventType.label.split(' ')[0]}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {event.event_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(event.event_date)}
                    </div>
                  )}
                  {candidateSpeakers.length > 1 ? (
                    <div className="space-y-0.5">
                      {candidateSpeakers.map(s => (
                        <div key={s.id} className={`flex items-center gap-2 text-xs ${s.id === event.speaker_id ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          <Users className="h-3 w-3 shrink-0" />
                          {s.name}{s.id === event.speaker_id ? ' ★' : ''}
                        </div>
                      ))}
                    </div>
                  ) : primarySpeaker ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {primarySpeaker.name}
                    </div>
                  ) : null}
                  {eventSAPs.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-warm">
                      <Handshake className="h-3 w-3" />
                      {eventSAPs.map(s => s.company || s.name).join(', ')}
                    </div>
                  )}
                  {venue && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {venue.name}
                    </div>
                  )}
                  {budget > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      {formatCurrency(budget)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  {status && (
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: status.color, color: status.color }}>
                      {status.label}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete "${event.title}"? This removes budget items and contract data too.`)) {
                          deleteEvent(event.id)
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer p-1 rounded"
                      title="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
