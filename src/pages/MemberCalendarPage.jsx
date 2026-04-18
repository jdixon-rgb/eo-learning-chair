import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { useChapter } from '@/lib/chapter'
import ThemeInfo from '@/components/ThemeInfo'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { FISCAL_MONTHS, STRATEGIC_MAP, EVENT_TYPES } from '@/lib/constants'
import { formatDateWithDay } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Clock, Lock, ChevronRight, Palette } from 'lucide-react'

// Rolling 2-month window:
// - Events in the next 2 calendar months: full details (speaker, venue, description, date)
// - Events beyond 2 months: title + month only (no speaker name, no details)
// This prevents members from "shopping" the calendar and skipping events they think are less interesting.

function getMonthWindow() {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentYear = now.getFullYear()

  // Calculate the next 2 calendar months from today
  const windowMonths = []
  for (let offset = 0; offset <= 2; offset++) {
    let m = currentMonth + offset
    let y = currentYear
    if (m > 12) { m -= 12; y += 1 }
    windowMonths.push({ month: m, year: y })
  }
  return windowMonths
}

function isEventInWindow(event, windowMonths) {
  if (!event.event_date) return false
  const d = new Date(event.event_date + 'T12:00:00')
  const evtMonth = d.getMonth() + 1
  const evtYear = d.getFullYear()
  return windowMonths.some(w => w.month === evtMonth && w.year === evtYear)
}

function isEventPast(event) {
  if (!event.event_date) return false
  const d = new Date(event.event_date + 'T23:59:59')
  return d < new Date()
}

export default function MemberCalendarPage({ embedded = false }) {
  const { chapter, events, speakers, venues, saps } = useStore()
  const { activePresidentTheme, activePresidentThemeDescription } = useBoardStore()
  const { activeChapter } = useChapter()
  const chapterName = activeChapter?.name || 'OurChapter OS'
  const { activeFiscalYear } = useFiscalYear()
  const incomingTheme = activePresidentTheme || chapter.president_theme || ''
  const windowMonths = getMonthWindow()

  // Sort events by date
  const sortedEvents = [...events]
    .filter(e => e.event_date && !isEventPast(e))
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

  const upcomingDetailed = sortedEvents.filter(e => isEventInWindow(e, windowMonths))
  const futureTeaser = sortedEvents.filter(e => !isEventInWindow(e, windowMonths))

  return (
    <div className={embedded ? 'text-white' : 'min-h-screen bg-gradient-to-b from-ink via-[#121248] to-ink text-white'}>
      {/* Header — standalone only */}
      {!embedded && (
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-[2px] bg-warm" />
              <span className="text-xs font-bold tracking-[0.3em] text-warm uppercase">{chapterName}</span>
              <div className="w-8 h-[2px] bg-warm" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Learning Calendar
            </h1>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Palette className="h-4 w-4 text-warm" />
              <p className="text-lg text-white/70">
                {formatFiscalYear(activeFiscalYear)} &middot; <ThemeInfo theme={incomingTheme} description={activePresidentThemeDescription} className="text-white/70" />
              </p>
            </div>
            <p className="mt-3 text-sm text-white/40">
              All events are included with your membership — no additional fees.
            </p>
          </div>
        </header>
      )}

      {/* Upcoming Events (Full Detail) */}
      <section className="max-w-4xl mx-auto px-6 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Upcoming Events</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">FULL DETAILS</Badge>
        </div>

        {upcomingDetailed.length > 0 ? (
          <div className="space-y-4">
            {upcomingDetailed.map(event => {
              const speaker = speakers.find(s => s.id === event.speaker_id)
              const eventSAPs = (event.sap_ids || []).map(sid => (saps || []).find(s => s.id === sid)).filter(Boolean)
              const venue = venues.find(v => v.id === event.venue_id)
              const eventType = EVENT_TYPES.find(t => t.id === event.event_type)
              const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
              const strategic = event.month_index != null ? STRATEGIC_MAP[event.month_index] : null

              return (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors">
                  {/* Strategic banner */}
                  {strategic && (
                    <div className={`${strategic.color} px-5 py-1.5`}>
                      <span className="text-[11px] font-bold tracking-wider text-white">{strategic.label}</span>
                    </div>
                  )}

                  <div className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold leading-tight">{event.title}</h3>

                        {/* Date */}
                        {event.event_date && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-white/70">
                            <Calendar className="h-4 w-4 text-warm" />
                            <span className="font-medium text-white">{formatDateWithDay(event.event_date)}</span>
                          </div>
                        )}

                        {/* Time */}
                        {event.event_time && (
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                            <Clock className="h-4 w-4 text-primary" />
                            {event.event_time.slice(0, 5) === '18:00' ? '6:00 PM' :
                             event.event_time.slice(0, 5) === '18:30' ? '6:30 PM' :
                             event.event_time}
                          </div>
                        )}

                        {/* Speaker */}
                        {speaker && (
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                            <Users className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-white">{speaker.name}</span>
                            {speaker.topic && <span className="text-white/50">&middot; {speaker.topic.split('—')[0].trim()}</span>}
                          </div>
                        )}
                        {/* SAP partner(s) */}
                        {eventSAPs.map(sap => (
                          <div key={sap.id} className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                            <Users className="h-4 w-4 text-amber-400" />
                            <span className="font-medium text-white">{sap.company || sap.name}</span>
                            <span className="text-white/40">&middot; SAP Partner</span>
                          </div>
                        ))}

                        {/* Venue */}
                        {venue && (
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                            <MapPin className="h-4 w-4 text-green-400" />
                            <span>{venue.name}</span>
                            {venue.address && <span className="text-white/40">&middot; {venue.address}</span>}
                          </div>
                        )}

                        {/* Theme Connection */}
                        {event.theme_connection && (
                          <p className="mt-4 text-sm text-white/60 italic border-t border-white/10 pt-3 leading-relaxed">
                            "{event.theme_connection}"
                          </p>
                        )}
                      </div>

                      {/* Event Type Badge */}
                      {eventType && (
                        <Badge
                          className="text-[10px] shrink-0 bg-white/10 border-white/20"
                          variant="outline"
                        >
                          {eventType.label}
                        </Badge>
                      )}
                    </div>

                    {/* Attendance info */}
                    {event.expected_attendance && (
                      <div className="mt-3 text-[11px] text-white/30">
                        Expected: {event.expected_attendance} members
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Calendar className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">No events in the next two months. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Future Events (Teaser Only) */}
      {futureTeaser.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-4 w-4 text-white/40" />
            <h2 className="text-lg font-bold text-white/70">Coming Later This Year</h2>
            <span className="text-xs text-white/30">Full details revealed 2 months before</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {futureTeaser.map(event => {
              const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
              const strategic = event.month_index != null ? STRATEGIC_MAP[event.month_index] : null
              const yearForMonth = month?.calendarMonth >= 8 ? 2026 : 2027

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-3"
                >
                  {/* Month indicator */}
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 ${strategic?.color || 'bg-white/10'}`}>
                    <span className="text-[10px] font-bold leading-none">{month?.shortName || '?'}</span>
                    <span className="text-[9px] opacity-70">{yearForMonth}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white/80 truncate">{event.title}</h4>
                    {strategic && (
                      <span className="text-[10px] text-white/30">{strategic.label}</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                </div>
              )
            })}
          </div>

          <p className="text-center mt-8 text-xs text-white/30">
            Event details are revealed as they get closer. This keeps the surprise alive and ensures every event gets the attendance it deserves.
          </p>
        </section>
      )}

      {/* Footer — standalone only */}
      {!embedded && (
        <footer className="border-t border-white/5 py-8">
          <div className="max-w-4xl mx-auto px-6 text-center text-xs text-white/30">
            <p>{chapterName} &middot; Learning Calendar &middot; {formatFiscalYear(activeFiscalYear)}</p>
            <p className="mt-1">All learning events are included with your EO membership. No additional fees.</p>
          </div>
        </footer>
      )}
    </div>
  )
}
