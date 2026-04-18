import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useBoardStore } from '@/lib/boardStore'
import { Users, GraduationCap, Store, Globe, ChevronRight, MessageSquarePlus, Activity } from 'lucide-react'
import { formatDateWithDay } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import NavigatorBroadcastCard from './NavigatorBroadcastCard'
import ProfileFreshnessCard from './ProfileFreshnessCard'

export default function MemberPortalDashboard() {
  const { profile } = useAuth()
  const { events, speakers } = useStore()
  const { chapterMembers } = useBoardStore()

  const currentMember = (() => {
    const email = profile?.email
    if (!email) return null
    return chapterMembers.find(cm => (cm.email || '').toLowerCase() === email.toLowerCase()) || null
  })()

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
        <h1 className="text-2xl md:text-3xl font-bold">Welcome, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Your Compass</p>
      </div>

      {/* Navigator broadcast check-in (visible only to active navigators with open broadcasts) */}
      <NavigatorBroadcastCard currentMember={currentMember} />

      {/* Profile freshness ping (shows quarterly) */}
      <ProfileFreshnessCard currentMember={currentMember} />

      {/* Primary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forum */}
        <Link
          to="/portal/forum"
          className="rounded-2xl border border-border bg-muted/30 p-6 hover:border-primary/50 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="h-6 w-6 text-primary" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          <h3 className="text-base font-semibold mb-1">Forum</h3>
          <p className="text-xs text-muted-foreground">Your forum — parking lot, tools, agenda, calendar, partners, and history.</p>
        </Link>

        {/* Learning */}
        <Link
          to="/portal/calendar"
          className="rounded-2xl border border-border bg-muted/30 p-6 hover:border-emerald-400/50 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <GraduationCap className="h-6 w-6 text-emerald-400" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          <h3 className="text-base font-semibold mb-1">Learning</h3>
          <p className="text-xs text-muted-foreground">
            Chapter events, speakers, and Executive Education.
            {nextEvent ? (
              <span className="block mt-1 text-foreground/80">
                Next: {nextEvent.title} — {formatDateWithDay(nextEvent.event_date)}
              </span>
            ) : null}
          </p>
        </Link>

        {/* Vendors */}
        <Link
          to="/portal/vendors"
          className="rounded-2xl border border-border bg-muted/30 p-6 hover:border-amber-400/50 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Store className="h-6 w-6 text-amber-400" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          <h3 className="text-base font-semibold mb-1">Vendors</h3>
          <p className="text-xs text-muted-foreground">Rate, review, and discover vendors in Arizona. Protect yourself. Find the best.</p>
        </Link>

        {/* Lifeline */}
        <Link
          to="/portal/lifeline"
          className="rounded-2xl border border-border bg-muted/30 p-6 hover:border-orange-400/50 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="h-6 w-6 text-orange-400" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          <h3 className="text-base font-semibold mb-1">Lifeline</h3>
          <p className="text-xs text-muted-foreground">Chart your journey — plot the highs and lows that shaped who you are.</p>
        </Link>

        {/* My EO */}
        <a
          href="https://www.eonetwork.org/myeo/"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-border bg-muted/30 p-6 hover:border-purple-400/50 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Globe className="h-6 w-6 text-purple-400" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          <h3 className="text-base font-semibold mb-1">My EO</h3>
          <p className="text-xs text-muted-foreground">Interest groups, international travel with EOers, and experiences you're probably forgetting exist.</p>
        </a>
      </div>

      {/* Survey banner */}
      <Link
        to="/portal/survey"
        className="block rounded-xl border border-border/50 bg-muted/30 px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground/90">Learning Preferences Survey</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {profile?.survey_completed_at
                ? 'Completed — update anytime to help us plan better events.'
                : 'Help us plan better events — takes ~5 minutes.'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </div>
      </Link>

      {/* Upcoming events preview */}
      {upcomingEvents.length > 1 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming Events</h2>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map(event => (
              <div key={event.id} className="rounded-xl border border-border/50 bg-muted/30 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                  <p className="text-xs text-muted-foreground/70">{formatDateWithDay(event.event_date)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/portal/calendar"
            className="block text-center text-xs text-primary hover:text-primary/80 mt-3 transition-colors"
          >
            View full calendar →
          </Link>
        </div>
      )}

      {/* EO Core Values */}
      <div className="pt-8 mt-4 border-t border-border/50">
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">
          EO Core Values
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Trust and Respect',
            'Thirst for Learning',
            'Think Big, Be Bold',
            'Together We Grow',
          ].map(value => (
            <div
              key={value}
              className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-center"
            >
              <p className="text-xs font-medium text-foreground/80">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Suggestion + Version */}
      <div className="pt-4 border-t border-border/50 flex items-center justify-between">
        <Link
          to="/portal/feedback"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Suggestion | Report Bug
        </Link>
        <span className="text-[10px] text-muted-foreground/40">v{APP_VERSION}</span>
      </div>
    </div>
  )
}
