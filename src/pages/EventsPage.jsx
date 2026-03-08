import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES, EVENT_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin, Users, DollarSign, ArrowRight } from 'lucide-react'

export default function EventsPage() {
  const navigate = useNavigate()
  const { events, speakers, venues, budgetItems } = useStore()

  const sortedEvents = [...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99))

  const getEventBudget = (eventId) =>
    budgetItems.filter(b => b.event_id === eventId).reduce((s, b) => s + (b.estimated_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">{events.length} events planned</p>
        </div>
        <Button size="sm" onClick={() => navigate('/calendar')}>
          View Calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedEvents.map(event => {
          const eventType = EVENT_TYPES.find(t => t.id === event.event_type)
          const status = EVENT_STATUSES.find(s => s.id === event.status)
          const speaker = speakers.find(s => s.id === event.speaker_id)
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
                  {eventType && (
                    <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: eventType.color, color: eventType.color }}>
                      {eventType.label.split(' ')[0]}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  {event.event_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(event.event_date)}
                    </div>
                  )}
                  {speaker && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {speaker.name}
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
                      <DollarSign className="h-3 w-3" />
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
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
