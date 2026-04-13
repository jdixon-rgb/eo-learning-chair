import { useState, useCallback, useMemo } from 'react'
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
  const [expandedEngagement, setExpandedEngagement] = useState(null)

  const handleRsvp = useCallback((eventId, status) => {
    saveRsvp(eventId, sapContactId, status)
    setRsvps(loadRsvps())
  }, [sapContactId])

  const now = new Date()

  // Build a unified event list: each item has { event, type, engagement }
  // type: 'speaking' | 'attending' | 'invited' | 'open'
  const unifiedEvents = useMemo(() => {
    const items = []
    const seen = new Set()

    // Speaking engagements (highest priority)
    speakingEngagements.forEach(eng => {
      const event = events.find(e => e.id === eng.event_id)
      if (event) { items.push({ event, type: 'speaking', engagement: eng }); seen.add(event.id) }
    })

    // Attending engagements
    attendingEngagements.forEach(eng => {
      const event = events.find(e => e.id === eng.event_id)
      if (event && !seen.has(event.id)) { items.push({ event, type: 'attending', engagement: eng }); seen.add(event.id) }
    })

    // Legacy partner events (sap_ids but no engagement row yet)
    partnerEvents.forEach(event => {
      if (!seen.has(event.id)) { items.push({ event, type: 'invited', engagement: null }); seen.add(event.id) }
    })

    // Other SAP-visible events
    sapVisibleEvents.forEach(event => {
      if (!seen.has(event.id)) { items.push({ event, type: 'open', engagement: null }); seen.add(event.id) }
    })

    return items
  }, [speakingEngagements, attendingEngagements, partnerEvents, sapVisibleEvents, events])

  const upcoming = unifiedEvents
    .filter(item => item.event.event_date && new Date(item.event.event_date) >= now)
    .sort((a, b) => new Date(a.event.event_date) - new Date(b.event.event_date))

  const past = unifiedEvents
    .filter(item => item.event.event_date && new Date(item.event.event_date) < now)
    .sort((a, b) => new Date(b.event.event_date) - new Date(a.event.event_date))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-white/50 mt-1">Your chapter calendar</p>
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map(item => (
            <EventRow
              key={item.event.id}
              item={item}
              sapContactId={sapContactId}
              rsvps={rsvps}
              onRsvp={handleRsvp}
              expanded={expandedEngagement === item.engagement?.id}
              onToggle={() => setExpandedEngagement(expandedEngagement === item.engagement?.id ? null : item.engagement?.id)}
              onUpdateEngagement={(patch) => updateEngagement(item.engagement.id, patch)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <CalendarDays className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">No upcoming events right now.</p>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Past</h2>
          {past.map(item => (
            <EventRow
              key={item.event.id}
              item={item}
              sapContactId={sapContactId}
              rsvps={rsvps}
              onRsvp={handleRsvp}
              expanded={false}
              onToggle={() => {}}
              onUpdateEngagement={() => {}}
              isPast
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({ item, sapContactId, rsvps, onRsvp, expanded, onToggle, onUpdateEngagement, isPast }) {
  const { event, type, engagement } = item
  const isSpeaking = type === 'speaking'
  const isInvited = type === 'attending' || type === 'invited'
  const isOpen = type === 'open'
  const eventType = EVENT_TYPES.find(t => t.id === event.event_type)

  // Speaking engagements get indigo border + mic icon
  if (isSpeaking && engagement) {
    return (
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5">
        <div className={`p-4 ${!isPast ? 'cursor-pointer' : ''}`} onClick={!isPast ? onToggle : undefined}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-indigo-400 shrink-0" />
                <h3 className="text-sm font-semibold">{event.title}</h3>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {event.event_time && ` at ${event.event_time}`}
                </span>
                {engagement.time_slot && <span className="text-indigo-300">{engagement.time_slot}</span>}
              </div>
              {engagement.topic && (
                <p className="text-xs text-indigo-300/80 mt-1">Topic: {engagement.topic}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                  Speaking
                </span>
                {eventType && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${eventType.color}25`, color: eventType.color }}>
                    {eventType.label}
                  </span>
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${engagement.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : engagement.status === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {engagement.status}
                </span>
              </div>
            </div>
            {!isPast && (
              expanded ? <ChevronDown className="h-4 w-4 text-white/30 shrink-0" /> : <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            )}
          </div>
        </div>

        {expanded && !isPast && (
          <div className="px-4 pb-4 pt-1 border-t border-indigo-500/20 space-y-3">
            {engagement.status === 'invited' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onUpdateEngagement({ status: 'confirmed' })} className="bg-green-600 hover:bg-green-700 text-xs">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => onUpdateEngagement({ status: 'declined' })} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">Decline</Button>
              </div>
            )}
            <div>
              <label className="text-[11px] text-white/40 font-medium">Topic</label>
              <Input value={engagement.topic || ''} onChange={e => onUpdateEngagement({ topic: e.target.value })} placeholder="Your presentation topic" className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium">Topic Description</label>
              <Textarea value={engagement.topic_description || ''} onChange={e => onUpdateEngagement({ topic_description: e.target.value })} placeholder="What you'll cover, key takeaways..." rows={2} className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/40 font-medium">Time Slot</label>
                <Input value={engagement.time_slot || ''} onChange={e => onUpdateEngagement({ time_slot: e.target.value })} placeholder="e.g. 2:00 PM - 3:30 PM" className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
              </div>
              <div>
                <label className="text-[11px] text-white/40 font-medium">AV Needs</label>
                <Input value={engagement.av_needs || ''} onChange={e => onUpdateEngagement({ av_needs: e.target.value })} placeholder="Mic, projector, clicker..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium">Run of Show Notes</label>
              <Textarea value={engagement.run_of_show_notes || ''} onChange={e => onUpdateEngagement({ run_of_show_notes: e.target.value })} placeholder="Timing, flow, what you need before/after..." rows={2} className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/40 font-medium">Materials Notes</label>
                <Input value={engagement.materials_notes || ''} onChange={e => onUpdateEngagement({ materials_notes: e.target.value })} placeholder="Slides, handouts, surveys..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
              </div>
              <div>
                <label className="text-[11px] text-white/40 font-medium">Materials URL</label>
                <Input value={engagement.materials_url || ''} onChange={e => onUpdateEngagement({ materials_url: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10 text-white text-xs mt-0.5" />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Attending / Invited / Open events — standard card
  const rsvpKey = `${sapContactId}:${event.id}`
  const rsvpStatus = rsvps[rsvpKey]

  return (
    <div className={`rounded-xl border p-4 ${isOpen ? 'border-white/5 bg-white/[0.02]' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isOpen ? 'text-white/70' : ''}`}>{event.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {event.event_time && ` at ${event.event_time}`}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {eventType && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${eventType.color}25`, color: eventType.color }}>
                {eventType.label}
              </span>
            )}
            {isInvited && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-eo-blue/10 text-eo-blue uppercase tracking-wider">
                Invited
              </span>
            )}
          </div>
        </div>
        {/* RSVP / Confirm for invited events */}
        {!isPast && (isInvited || type === 'attending') && engagement && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onUpdateEngagement({ status: 'confirmed' })} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${engagement.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-white/10 hover:text-green-400'}`} title="Confirm">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => onUpdateEngagement({ status: 'declined' })} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${engagement.status === 'declined' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-white/10 hover:text-red-400'}`} title="Decline">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {!isPast && !engagement && (isInvited || type === 'invited') && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onRsvp(event.id, 'yes')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rsvpStatus === 'yes' ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:bg-white/10 hover:text-green-400'}`} title="Attending">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => onRsvp(event.id, 'no')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rsvpStatus === 'no' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:bg-white/10 hover:text-red-400'}`} title="Not attending">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
