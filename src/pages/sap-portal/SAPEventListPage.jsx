import { useState, useCallback } from 'react'
import { useSAPContact } from '@/lib/useSAPContact'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { EVENT_TYPES } from '@/lib/constants'
import { CalendarDays, MapPin, Check, X as XIcon } from 'lucide-react'

const RSVP_KEY = 'eo-sap-rsvps'

function loadRsvps() {
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || '{}') } catch { return {} }
}

function saveRsvp(eventId, contactId, status) {
  const all = loadRsvps()
  all[`${contactId}:${eventId}`] = status
  localStorage.setItem(RSVP_KEY, JSON.stringify(all))
}

export default function SAPEventListPage() {
  const { sapContactId } = useAuth()
  const { partnerEvents } = useSAPContact()
  const { events } = useStore()
  const [rsvps, setRsvps] = useState(loadRsvps)
  const [showAll, setShowAll] = useState(false)

  const handleRsvp = useCallback((eventId, status) => {
    saveRsvp(eventId, sapContactId, status)
    setRsvps(loadRsvps())
  }, [sapContactId])

  const now = new Date()
  const upcoming = partnerEvents
    .filter(e => e.event_date && new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  const past = partnerEvents
    .filter(e => e.event_date && new Date(e.event_date) < now)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))

  // Full chapter calendar (all future events, read-only, no RSVP)
  const allUpcoming = showAll
    ? events.filter(e => e.event_date && new Date(e.event_date) >= now).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    : []

  const EventCard = ({ event, canRsvp }) => {
    const rsvpKey = `${sapContactId}:${event.id}`
    const rsvpStatus = rsvps[rsvpKey]
    const eventType = EVENT_TYPES.find(t => t.id === event.event_type)

    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{event.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {event.event_time && ` at ${event.event_time}`}
              </span>
            </div>
            {eventType && (
              <span
                className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${eventType.color}25`, color: eventType.color }}
              >
                {eventType.label}
              </span>
            )}
          </div>

          {/* RSVP */}
          {canRsvp && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleRsvp(event.id, 'yes')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  rsvpStatus === 'yes' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-white/10 hover:text-green-400'
                }`}
                title="Attending"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleRsvp(event.id, 'no')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  rsvpStatus === 'no' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-white/10 hover:text-red-400'
                }`}
                title="Not attending"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-white/50 mt-1">Events your organization is invited to</p>
      </div>

      {/* Your Events */}
      {upcoming.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Upcoming</h2>
          {upcoming.map(e => <EventCard key={e.id} event={e} canRsvp />)}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <CalendarDays className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">No upcoming events for your organization right now.</p>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Past Events</h2>
          {past.map(e => <EventCard key={e.id} event={e} canRsvp={false} />)}
        </div>
      )}

      {/* Full chapter calendar toggle */}
      <div className="border-t border-white/10 pt-6">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
        >
          {showAll ? 'Hide full chapter calendar' : 'View full chapter calendar'}
        </button>
        {showAll && allUpcoming.length > 0 && (
          <div className="space-y-3 mt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">All Chapter Events</h2>
            {allUpcoming.map(e => (
              <div key={e.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <h3 className="text-sm font-medium text-white/70">{e.title}</h3>
                <p className="text-xs text-white/30 mt-1">
                  {e.event_date
                    ? new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : 'Date TBD'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
