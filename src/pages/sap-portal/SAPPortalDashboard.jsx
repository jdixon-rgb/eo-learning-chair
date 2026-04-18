import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useSAPContact } from '@/lib/useSAPContact'
import { SAP_TIERS } from '@/lib/constants'
import { useStore } from '@/lib/store'
import { CalendarDays, Building2, FileText, Bell, GraduationCap, ArrowRight, Mic } from 'lucide-react'

const quickLinks = [
  { to: '/sap-portal/events', icon: CalendarDays, label: 'Events', desc: 'See events you\'re invited to' },
  { to: '/sap-portal/profile', icon: Building2, label: 'Our Profile', desc: 'View and update your info' },
  { to: '/sap-portal/resources', icon: FileText, label: 'Resources', desc: 'Chapter documents and links' },
  { to: '/sap-portal/announcements', icon: Bell, label: 'Announcements', desc: 'Messages from the chapter' },
]

export default function SAPPortalDashboard() {
  const { profile } = useAuth()
  const { contact, partner, partnerEvents, speakingEngagements } = useSAPContact()
  const { events } = useStore()

  const tier = SAP_TIERS.find(t => t.id === partner?.tier)
  const firstName = (contact?.name || profile?.full_name || 'Partner').split(' ')[0]

  const now = new Date()

  // Next speaking engagement
  const nextSpeaking = speakingEngagements
    .map(eng => ({ ...eng, event: events.find(e => e.id === eng.event_id) }))
    .filter(eng => eng.event?.event_date && new Date(eng.event.event_date) >= now)
    .sort((a, b) => new Date(a.event.event_date) - new Date(b.event.event_date))[0]

  // Next upcoming event (any type)
  const upcomingEvents = partnerEvents
    .filter(e => e.event_date && new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  const nextEvent = nextSpeaking ? null : upcomingEvents[0]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <h1 className="text-2xl font-bold">Welcome, {firstName}</h1>
        {partner && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-foreground/90 font-medium">{partner.name}</span>
            {tier && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: `${tier.color}30`, color: tier.color }}
              >
                {tier.label}
              </span>
            )}
          </div>
        )}
        {contact && (
          <div className="flex items-center gap-3 mt-3">
            {contact.forum_trained ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-community">
                <GraduationCap className="h-4 w-4" />
                Forum Trained
                {contact.forum_trained_date && (
                  <span className="text-muted-foreground">({contact.forum_trained_date})</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-warm">
                <GraduationCap className="h-4 w-4" />
                Not yet forum trained
              </span>
            )}
          </div>
        )}
      </div>

      {/* Next Speaking Engagement */}
      {nextSpeaking && (
        <Link to="/sap-portal/events" className="block rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 hover:bg-indigo-500/15 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/60 flex items-center gap-1">
                <Mic className="h-3 w-3" /> Next Speaking Engagement
              </p>
              <h3 className="text-lg font-semibold mt-1">{nextSpeaking.event?.title}</h3>
              {nextSpeaking.topic && <p className="text-sm text-indigo-300/70 mt-0.5">{nextSpeaking.topic}</p>}
              <p className="text-sm text-muted-foreground mt-0.5">
                {nextSpeaking.event?.event_date && new Date(nextSpeaking.event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {nextSpeaking.time_slot && ` · ${nextSpeaking.time_slot}`}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-indigo-300/60 shrink-0" />
          </div>
        </Link>
      )}

      {/* Next Event (attending) */}
      {nextEvent && (
        <Link to="/sap-portal/events" className="block rounded-2xl border border-border bg-muted/30 p-5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next Event</p>
              <h3 className="text-lg font-semibold mt-1">{nextEvent.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date(nextEvent.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {nextEvent.event_time && ` at ${nextEvent.event_time}`}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
          </div>
        </Link>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-border bg-muted/30 p-5 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold group-hover:text-indigo-300 transition-colors">{label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!partner && (
        <div className="rounded-2xl border border-warm/30 bg-warm/10 p-5 text-center">
          <p className="text-sm text-warm">
            Your account hasn't been linked to a partner yet. Contact your EO chapter to complete setup.
          </p>
        </div>
      )}
    </div>
  )
}
