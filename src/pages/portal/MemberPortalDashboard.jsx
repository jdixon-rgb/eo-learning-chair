import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Calendar, ClipboardList, Bell, ChevronRight, Sparkles } from 'lucide-react'
import { formatDateWithDay } from '@/lib/utils'

export default function MemberPortalDashboard() {
  const { profile } = useAuth()
  const { events, speakers } = useStore()

  // Next upcoming event
  const now = new Date()
  const upcomingEvents = events
    .filter(e => e.event_date && new Date(e.event_date + 'T23:59:59') >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  const nextEvent = upcomingEvents[0]
  const nextSpeaker = nextEvent ? speakers.find(s => s.id === nextEvent.speaker_id) : null

  const firstName = profile?.full_name?.split(' ')[0] || 'Member'

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-eo-coral" />
          <h1 className="text-2xl md:text-3xl font-bold">Welcome, {firstName}</h1>
        </div>
        <p className="text-white/50 text-sm">Your EO Arizona member hub</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Event */}
        <Link
          to="/portal/calendar"
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-eo-blue/50 hover:bg-white/[0.07] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-5 w-5 text-eo-blue" />
            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Next Event</h3>
          {nextEvent ? (
            <>
              <p className="text-white/80 text-sm font-medium">{nextEvent.title}</p>
              <p className="text-xs text-white/40 mt-1">{formatDateWithDay(nextEvent.event_date)}</p>
              {nextSpeaker && (
                <p className="text-xs text-white/40">Featuring: {nextSpeaker.name}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-white/40">No upcoming events</p>
          )}
        </Link>

        {/* Survey CTA */}
        <Link
          to="/portal/survey"
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-eo-coral/50 hover:bg-white/[0.07] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <ClipboardList className="h-5 w-5 text-eo-coral" />
            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Learning Preferences</h3>
          {profile?.survey_completed_at ? (
            <p className="text-xs text-white/40">Completed — update anytime</p>
          ) : (
            <>
              <p className="text-white/80 text-sm">Help us plan better events</p>
              <p className="text-xs text-eo-coral mt-1">Takes ~5 minutes</p>
            </>
          )}
        </Link>

        {/* Notifications */}
        <Link
          to="/portal/notifications"
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-purple-500/50 hover:bg-white/[0.07] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Bell className="h-5 w-5 text-purple-400" />
            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Notifications</h3>
          <p className="text-xs text-white/40">Stay updated on chapter news</p>
        </Link>
      </div>

      {/* Upcoming events preview */}
      {upcomingEvents.length > 1 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming Events</h2>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map(event => (
              <div key={event.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-eo-blue/20 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-eo-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                  <p className="text-xs text-white/40">{formatDateWithDay(event.event_date)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/portal/calendar"
            className="block text-center text-xs text-eo-blue hover:text-eo-blue/80 mt-3 transition-colors"
          >
            View full calendar →
          </Link>
        </div>
      )}
    </div>
  )
}
