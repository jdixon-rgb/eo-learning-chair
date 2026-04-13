import { useState, useCallback } from 'react'
import { useSAPContact } from '@/lib/useSAPContact'
import { useSAPStore } from '@/lib/sapStore'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { EVENT_TYPES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CalendarDays, Check, X as XIcon, Mic, ChevronDown, ChevronRight } from 'lucide-react'

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
  const { speakingEngagements, attendingEngagements, sapVisibleEvents, partnerEvents } = useSAPContact()
  const { updateEngagement } = useSAPStore()
  const { events } = useStore()
  const [rsvps, setRsvps] = useState(loadRsvps)
  const [showAll, setShowAll] = useState(false)
  const [expandedEngagement, setExpandedEngagement] = useState(null)

  const handleRsvp = useCallback((eventId, status) => {
    saveRsvp(eventId, sapContactId, status)
    setRsvps(loadRsvps())
  }, [sapContactId])

  const now = new Date()

  // Speaking engagements with event data joined
  const upcomingSpeaking = speakingEngagements
    .map(eng => ({ ...eng, event: events.find(e => e.id === eng.event_id) }))
    .filter(eng => eng.event?.event_date && new Date(eng.event.event_date) >= now)
    .sort((a, b) => new Date(a.event.event_date) - new Date(b.event.event_date))

  // Attending engagements with event data joined
  const upcomingAttending = attendingEngagements
    .map(eng => ({ ...eng, event: events.find(e => e.id === eng.event_id) }))
    .filter(eng => eng.event?.event_date && new Date(eng.event.event_date) >= now)
    .sort((a, b) => new Date(a.event.event_date) - new Date(b.event.event_date))

  // Fallback: partnerEvents not yet in engagements table (backwards compat with sap_ids)
  const engagementEventIds = new Set([...speakingEngagements, ...attendingEngagements].map(e => e.event_id))
  const legacyEvents = partnerEvents
    .filter(e => !engagementEventIds.has(e.id) && e.event_date && new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

  // Other open events
  const allInvitedIds = new Set([...partnerEvents.map(e => e.id), ...engagementEventIds])
  const otherOpen = showAll
    ? sapVisibleEvents.filter(e => e.event_date && new Date(e.event_date) >= now && !allInvitedIds.has(e.id)).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-white/50 mt-1">Your speaking engagements and event invitations</p>
      </div>

      {/* Speaking Engagements */}
      {upcomingSpeaking.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/60 flex items-center gap-1.5">
            <Mic className="h-3 w-3" /> Speaking Engagements
          </h2>
          {upcomingSpeaking.map(eng => (
            <SpeakingCard
              key={eng.id}
              engagement={eng}
              event={eng.event}
              expanded={expandedEngagement === eng.id}
              onToggle={() => setExpandedEngagement(expandedEngagement === eng.id ? null : eng.id)}
              onUpdate={(patch) => updateEngagement(eng.id, patch)}
            />
          ))}
        </div>
      )}

      {/* Invited Events (attending) */}
      {(upcomingAttending.length > 0 || legacyEvents.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Invited Events</h2>
          {upcomingAttending.map(eng => (
            <AttendingCard key={eng.id} event={eng.event} engagement={eng} sapContactId={sapContactId} rsvps={rsvps} onRsvp={handleRsvp} onUpdateStatus={(status) => updateEngagement(eng.id, { status })} />
          ))}
          {legacyEvents.map(e => (
            <AttendingCard key={e.id} event={e} sapContactId={sapContactId} rsvps={rsvps} onRsvp={handleRsvp} />
          ))}
        </div>
      )}

      {upcomingSpeaking.length === 0 && upcomingAttending.length === 0 && legacyEvents.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <CalendarDays className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">No upcoming events for your organization right now.</p>
        </div>
      )}

      {/* Other open events */}
      <div className="border-t border-white/10 pt-6">
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-indigo-300 hover:text-indigo-200 underline cursor-pointer">
          {showAll ? 'Hide chapter calendar' : 'View other open events'}
        </button>
        {showAll && otherOpen.length > 0 && (
          <div className="space-y-3 mt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Other Open Events</h2>
            {otherOpen.map(e => (
              <div key={e.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <h3 className="text-sm font-medium text-white/70">{e.title}</h3>
                <p className="text-xs text-white/30 mt-1">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SpeakingCard({ engagement, event, expanded, onToggle, onUpdate }) {
  const eventType = EVENT_TYPES.find(t => t.id === event?.event_type)

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5">
      {/* Header — always visible */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-indigo-400 shrink-0" />
              <h3 className="text-sm font-semibold">{event?.title}</h3>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
                {event?.event_time && ` at ${event.event_time}`}
              </span>
              {engagement.time_slot && <span className="text-indigo-300">{engagement.time_slot}</span>}
            </div>
            {engagement.topic && (
              <p className="text-xs text-indigo-300/80 mt-1">Topic: {engagement.topic}</p>
            )}
            {eventType && (
              <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${eventType.color}25`, color: eventType.color }}>
                {eventType.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${engagement.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : engagement.status === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {engagement.status}
            </span>
            {expanded ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
          </div>
        </div>
      </div>

      {/* Expanded logistics — editable by partner */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-indigo-500/20 space-y-3">
          {/* Confirm / Decline */}
          {engagement.status === 'invited' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onUpdate({ status: 'confirmed' })} className="bg-green-600 hover:bg-green-700 text-xs">Confirm</Button>
              <Button size="sm" variant="outline" onClick={() => onUpdate({ status: 'declined' })} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">Decline</Button>
            </div>
          )}
          <div>
            <label className="text-[11px] text-white/40 font-medium">Topic</label>
            <Input value={engagement.topic || ''} onChange={e => onUpdate({ topic: e.target.value })} placeholder="Your presentation topic" className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 font-medium">Topic Description</label>
            <Textarea value={engagement.topic_description || ''} onChange={e => onUpdate({ topic_description: e.target.value })} placeholder="What you'll cover, key takeaways..." rows={2} className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 font-medium">Time Slot</label>
              <Input value={engagement.time_slot || ''} onChange={e => onUpdate({ time_slot: e.target.value })} placeholder="e.g. 2:00 PM - 3:30 PM" className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium">AV Needs</label>
              <Input value={engagement.av_needs || ''} onChange={e => onUpdate({ av_needs: e.target.value })} placeholder="Mic, projector, clicker..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/40 font-medium">Run of Show Notes</label>
            <Textarea value={engagement.run_of_show_notes || ''} onChange={e => onUpdate({ run_of_show_notes: e.target.value })} placeholder="Timing, flow, what you need before/after..." rows={2} className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 font-medium">Materials Notes</label>
              <Input value={engagement.materials_notes || ''} onChange={e => onUpdate({ materials_notes: e.target.value })} placeholder="Slides, handouts, surveys..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium">Materials URL</label>
              <Input value={engagement.materials_url || ''} onChange={e => onUpdate({ materials_url: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AttendingCard({ event, engagement, sapContactId, rsvps, onRsvp, onUpdateStatus }) {
  const rsvpKey = `${sapContactId}:${event?.id}`
  const rsvpStatus = rsvps[rsvpKey]
  const eventType = EVENT_TYPES.find(t => t.id === event?.event_type)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{event?.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
              {event?.event_time && ` at ${event.event_time}`}
            </span>
          </div>
          {eventType && (
            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${eventType.color}25`, color: eventType.color }}>
              {eventType.label}
            </span>
          )}
        </div>
        {/* RSVP */}
        <div className="flex items-center gap-1.5 shrink-0">
          {engagement?.status === 'invited' && onUpdateStatus && (
            <>
              <button onClick={() => onUpdateStatus('confirmed')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${engagement.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-white/10 hover:text-green-400'}`} title="Confirm">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => onUpdateStatus('declined')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${engagement.status === 'declined' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-white/10 hover:text-red-400'}`} title="Decline">
                <XIcon className="h-4 w-4" />
              </button>
            </>
          )}
          {!engagement && (
            <>
              <button onClick={() => onRsvp(event.id, 'yes')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rsvpStatus === 'yes' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-white/10 hover:text-green-400'}`} title="Attending">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => onRsvp(event.id, 'no')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rsvpStatus === 'no' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-white/10 hover:text-red-400'}`} title="Not attending">
                <XIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
