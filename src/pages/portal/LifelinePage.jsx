import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  loadMemberPrivate,
  loadLifeEvents,
  deleteLifeEvent,
  reorderLifeEvent,
  toggleLifeEventBrief,
  eventScore,
  formatTimeLabel,
  CURRENT_YEAR,
} from '@/lib/lifelineStore'
import { loadCurrentMember } from '@/lib/reflectionsStore'
import { LifelineGraph } from '@/components/lifeline/LifelineGraph'
import { EventForm } from '@/components/lifeline/EventForm'
import { EventDetailModal } from '@/components/lifeline/EventDetailModal'
import { BirthYearOnboarding } from '@/components/lifeline/BirthYearOnboarding'
import { Toaster } from '@/components/lifeline/Toaster'
import { useToast } from '@/components/lifeline/useToast'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Printer,
  Bookmark,
  BookmarkCheck,
  Maximize2,
  X,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

// LifelinePage — orchestrates the Lifeline module inside the member portal.
// Lives under /portal/lifeline; the dark portal nav / sidebar are provided
// by MemberPortalLayout and don't need to be replicated here.
//
// Data flow:
//   1. Resolve auth → chapter_members row (same as ReflectionsPage)
//   2. Fetch member_private (birth year) + life_events in parallel
//   3. Show onboarding prompt if no birth year, otherwise render the graph
//   4. CRUD operations go through lifelineStore; local state is updated
//      optimistically on create/update/delete for instant feedback.

export default function LifelinePage() {
  const { user, profile } = useAuth()
  const email = user?.email || profile?.email
  const { toasts, toast, dismiss } = useToast()

  // ── State ────────────────────────────────────────────────
  const [memberId, setMemberId] = useState(null)
  const [memberName, setMemberName] = useState('')
  const [birthYear, setBirthYear] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [briefMode, setBriefMode] = useState(false)
  const [presentMode, setPresentMode] = useState(false)

  // Esc exits presentation mode
  useEffect(() => {
    if (!presentMode) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setPresentMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentMode])

  // ── Initial load ─────────────────────────────────────────
  // Follows the same async-IIFE-inside-effect pattern as ReflectionsPage
  // to satisfy the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!email) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data: m } = await loadCurrentMember(email)
      if (cancelled) return
      if (!m?.id) {
        setLoading(false)
        return
      }
      setMemberId(m.id)
      setMemberName(
        [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || ''
      )

      const [{ data: priv }, { data: ev }] = await Promise.all([
        loadMemberPrivate(m.id),
        loadLifeEvents(m.id),
      ])
      if (cancelled) return
      setBirthYear(priv?.birthYear ?? null)
      setEvents(ev || [])
      setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [email])

  // Lightweight refresh for after reorder — member is already resolved.
  async function refreshEvents() {
    if (!memberId) return
    const { data } = await loadLifeEvents(memberId)
    setEvents(data || [])
  }

  // ── Event handlers ───────────────────────────────────────

  function handleEventSaved(saved) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = saved
        return updated.sort((a, b) => a.computedYear - b.computedYear)
      }
      return [...prev, saved].sort((a, b) => a.computedYear - b.computedYear)
    })
    setShowEventForm(false)
    setEditingEvent(null)
    toast(
      editingEvent ? 'Event updated.' : 'Event added to your lifeline.',
      'success'
    )
  }

  async function handleDeleteEvent(event) {
    const { error } = await deleteLifeEvent(event.id)
    if (error) {
      toast('Failed to delete event.', 'error')
      return
    }
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
    toast('Event removed.', 'default')
  }

  function handleEditEvent(event) {
    setEditingEvent(event)
    setShowEventForm(true)
  }

  async function handleToggleBrief(event) {
    const { data } = await toggleLifeEventBrief(event.id, !event.brief)
    if (data) {
      setEvents((prev) =>
        prev
          .map((e) => (e.id === data.id ? data : e))
          .sort((a, b) =>
            a.computedYear !== b.computedYear
              ? a.computedYear - b.computedYear
              : a.sortOrder - b.sortOrder
          )
      )
    }
  }

  async function handleReorder(event, direction) {
    const { error } = await reorderLifeEvent(event.id, direction, memberId)
    if (!error) await refreshEvents()
  }

  function handleBirthYearComplete(by) {
    setBirthYear(by)
  }

  // ── Derived state ────────────────────────────────────────
  const needsOnboarding = birthYear == null
  const displayEvents = briefMode ? events.filter((e) => e.brief) : events
  const positiveCount = displayEvents.filter(
    (e) => e.valence === 'positive'
  ).length
  const negativeCount = displayEvents.filter(
    (e) => e.valence === 'negative'
  ).length
  const highestScore = displayEvents.length
    ? Math.max(...displayEvents.map((e) => eventScore(e.valence, e.intensity)))
    : null
  const lowestScore = displayEvents.length
    ? Math.min(...displayEvents.map((e) => eventScore(e.valence, e.intensity)))
    : null

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="font-lifeline-display text-2xl text-lifeline-ink animate-pulse">
            LIFELINE
          </div>
          <p className="font-lifeline-body text-sm text-lifeline-ink-muted mt-2">
            Loading your story…
          </p>
        </div>
      </div>
    )
  }

  if (!memberId) return null

  // ── Page ─────────────────────────────────────────────────
  return (
    <div className="bg-lifeline-paper text-lifeline-ink min-h-full">
      {/* Toolbar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 print:hidden">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <h1 className="font-lifeline-display text-xl text-lifeline-ink tracking-widest">
              LIFELINE
            </h1>
            <span className="hidden sm:block font-lifeline-mono text-xs text-lifeline-ink-faint tracking-widest uppercase">
              EO Forum
            </span>
          </div>
          {memberName && (
            <p className="font-lifeline-body text-xs text-lifeline-ink-muted">
              {memberName}
              {birthYear && (
                <span className="font-lifeline-mono ml-1 text-lifeline-ink-faint">
                  · b. {birthYear}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!needsOnboarding && (
            <Button
              onClick={() => {
                setEditingEvent(null)
                setShowEventForm(true)
              }}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Event</span>
            </Button>
          )}
          <Button
            variant={briefMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBriefMode((b) => !b)}
            title={briefMode ? 'Switch to Full view' : 'Switch to Brief view'}
          >
            {briefMode ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Brief</span>
          </Button>
          {!needsOnboarding && displayEvents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresentMode(true)}
              title="Present fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Present</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Print / Save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block px-8 pt-6 pb-2">
        <div className="flex items-end justify-between border-b border-gray-300 pb-3">
          <div>
            <p className="font-lifeline-mono text-xs text-gray-400 tracking-widest uppercase">
              Lifeline
            </p>
            <h1 className="font-lifeline-display text-3xl text-gray-900 tracking-wide">
              {memberName}
            </h1>
          </div>
          <div className="text-right">
            <p className="font-lifeline-mono text-xs text-gray-400">
              {birthYear} – {CURRENT_YEAR}
            </p>
            <p className="font-lifeline-mono text-xs text-gray-400">
              {events.length} events
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pb-8">
        {needsOnboarding ? (
          <BirthYearOnboarding
            memberId={memberId}
            onComplete={handleBirthYearComplete}
          />
        ) : (
          <>
            {/* Graph card */}
            <div className="bg-lifeline-card border border-lifeline-border rounded-lg shadow-lifeline-card p-4 sm:p-6 mb-6 print-graph">
              {/* Title + stats row */}
              <div className="flex items-start justify-between mb-4 print:mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-lifeline-display text-lg text-lifeline-ink">
                      My Lifeline
                    </h2>
                    {briefMode && (
                      <span className="font-lifeline-mono text-[10px] text-lifeline-accent border border-lifeline-accent/40 bg-lifeline-accent-bg px-1.5 py-0.5 rounded tracking-wider uppercase">
                        Brief
                      </span>
                    )}
                  </div>
                  <p className="font-lifeline-mono text-xs text-lifeline-ink-muted">
                    {birthYear} → {CURRENT_YEAR}
                  </p>
                </div>
                {displayEvents.length > 0 && (
                  <div className="flex gap-4 text-center print:hidden">
                    <div>
                      <p className="font-lifeline-mono text-lg font-bold text-lifeline-positive">
                        {highestScore !== null && highestScore > 0
                          ? `+${highestScore}`
                          : '–'}
                      </p>
                      <p className="font-lifeline-body text-xs text-lifeline-ink-faint">
                        Peak
                      </p>
                    </div>
                    <div className="w-px bg-lifeline-border" />
                    <div>
                      <p className="font-lifeline-mono text-lg font-bold text-lifeline-negative">
                        {lowestScore !== null && lowestScore < 0
                          ? lowestScore
                          : '–'}
                      </p>
                      <p className="font-lifeline-body text-xs text-lifeline-ink-faint">
                        Trough
                      </p>
                    </div>
                    <div className="w-px bg-lifeline-border" />
                    <div>
                      <p className="font-lifeline-mono text-lg font-bold text-lifeline-ink">
                        {displayEvents.length}
                      </p>
                      <p className="font-lifeline-body text-xs text-lifeline-ink-faint">
                        Events
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Graph or empty state */}
              {displayEvents.length === 0 ? (
                briefMode ? (
                  <BriefEmptyState onDisable={() => setBriefMode(false)} />
                ) : (
                  <EmptyState onAdd={() => setShowEventForm(true)} />
                )
              ) : (
                /* On narrow / portrait screens the 16:7 chart gets
                   crushed. Wrap in a scrollable container with a min-width
                   so users can swipe left-right to explore the timeline.
                   On wider screens the min-width has no effect. */
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="min-w-[700px]">
                    <LifelineGraph
                      events={displayEvents}
                      birthYear={birthYear}
                      onEventClick={setSelectedEvent}
                    />
                  </div>
                </div>
              )}

              {/* Legend */}
              {displayEvents.length > 0 && (
                <div className="flex items-center gap-6 mt-3 justify-center print:justify-start">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-lifeline-positive inline-block" />
                    <span className="font-lifeline-body text-xs text-lifeline-ink-muted">
                      Positive ({positiveCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-lifeline-negative inline-block" />
                    <span className="font-lifeline-body text-xs text-lifeline-ink-muted">
                      Negative ({negativeCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-0.5 inline-block"
                      style={{ background: '#c84b0c' }}
                    />
                    <span className="font-lifeline-body text-xs text-lifeline-ink-muted">
                      Lifeline
                    </span>
                  </div>
                  <span className="font-lifeline-body text-xs text-lifeline-ink-faint print:hidden">
                    · click any dot for details
                  </span>
                </div>
              )}
            </div>

            {/* Events list */}
            {displayEvents.length > 0 && (
              <EventsList
                events={displayEvents}
                briefMode={briefMode}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onAdd={() => setShowEventForm(true)}
                onReorder={handleReorder}
                onToggleBrief={handleToggleBrief}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showEventForm && birthYear != null && (
        <EventForm
          event={editingEvent}
          memberId={memberId}
          birthYear={birthYear}
          onClose={() => {
            setShowEventForm(false)
            setEditingEvent(null)
          }}
          onSaved={handleEventSaved}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Presentation mode */}
      {presentMode && birthYear != null && displayEvents.length > 0 && (
        <div className="fixed inset-0 z-50 bg-lifeline-card flex flex-col print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresentMode(false)}
            title="Exit presentation (Esc)"
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
          <div className="flex-1 flex items-center justify-center px-2 py-2 overflow-hidden">
            <div className="w-full flex items-center">
              <LifelineGraph
                events={displayEvents}
                birthYear={birthYear}
                onEventClick={setSelectedEvent}
              />
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}

// ── Inline sub-components ──────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-full max-w-md h-px mb-12"
        style={{
          background:
            'linear-gradient(to right, transparent, #dfd8cc 20%, #dfd8cc 80%, transparent)',
        }}
      />
      <p className="font-lifeline-mono text-xs tracking-widest text-lifeline-ink-faint uppercase mb-3">
        Your story begins here
      </p>
      <h3 className="font-lifeline-display text-2xl text-lifeline-ink mb-2">
        No events yet
      </h3>
      <p className="font-lifeline-body text-sm text-lifeline-ink-muted mb-6 max-w-xs leading-relaxed">
        Add your first life event — a pivotal moment, a triumph, or a difficult
        chapter. Each point will form your lifeline.
      </p>
      <Button onClick={onAdd} size="lg">
        <Plus className="h-4 w-4" />
        Add your first event
      </Button>
      <div
        className="w-full max-w-md h-px mt-12"
        style={{
          background:
            'linear-gradient(to right, transparent, #dfd8cc 20%, #dfd8cc 80%, transparent)',
        }}
      />
    </div>
  )
}

function BriefEmptyState({ onDisable }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Bookmark className="h-8 w-8 text-lifeline-ink-faint mb-4" />
      <h3 className="font-lifeline-display text-xl text-lifeline-ink mb-2">
        No events marked for brief
      </h3>
      <p className="font-lifeline-body text-sm text-lifeline-ink-muted mb-4 max-w-xs leading-relaxed">
        Mark events as "Include in brief presentation" using the edit form or
        the bookmark icon on each event card.
      </p>
      <Button variant="outline" size="sm" onClick={onDisable}>
        Switch to Full view
      </Button>
    </div>
  )
}

function EventsList({
  events,
  onEdit,
  onDelete,
  onAdd,
  onReorder,
  onToggleBrief,
}) {
  // Sort: computed_year ASC, sort_order ASC, created_at ASC
  const sorted = [...events].sort((a, b) => {
    if (a.computedYear !== b.computedYear) {
      return a.computedYear - b.computedYear
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Group by year
  const groups = []
  for (const event of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.year === event.computedYear) {
      last.items.push(event)
    } else {
      groups.push({ year: event.computedYear, items: [event] })
    }
  }

  return (
    <div className="print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-lifeline-body text-sm font-medium text-lifeline-ink-muted tracking-wide uppercase">
          All Events
        </h2>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add event
        </Button>
      </div>

      <div className="space-y-4">
        {groups.map(({ year, items }) => (
          <div key={year}>
            {items.length > 1 && (
              <p className="font-lifeline-mono text-[10px] text-lifeline-ink-faint tracking-widest uppercase mb-1.5 pl-0.5">
                {year} · {items.length} events
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((event, idxInYear) => {
                const score = eventScore(event.valence, event.intensity)
                const isPositive = event.valence === 'positive'
                const canMoveUp = items.length > 1 && idxInYear > 0
                const canMoveDown =
                  items.length > 1 && idxInYear < items.length - 1
                return (
                  <div
                    key={event.id}
                    className="group bg-lifeline-card border border-lifeline-border rounded-lg px-4 py-3 hover:border-lifeline-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 mt-0.5 w-9 h-9 rounded flex items-center justify-center font-lifeline-mono text-sm font-bold ${
                          isPositive
                            ? 'bg-lifeline-positive-bg text-lifeline-positive'
                            : 'bg-lifeline-negative-bg text-lifeline-negative'
                        }`}
                      >
                        {score > 0 ? `+${score}` : score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-lifeline-body text-sm text-lifeline-ink leading-tight font-medium truncate">
                            {event.title}
                          </p>
                          <div className="flex gap-0.5 shrink-0 ml-1 items-center">
                            <button
                              onClick={() => onToggleBrief(event)}
                              className={`p-1 rounded transition-colors ${
                                event.brief
                                  ? 'text-lifeline-accent'
                                  : 'text-lifeline-ink-faint/40 opacity-0 group-hover:opacity-100 hover:text-lifeline-accent'
                              }`}
                              title={
                                event.brief
                                  ? 'Remove from brief'
                                  : 'Add to brief'
                              }
                            >
                              {event.brief ? (
                                <BookmarkCheck className="h-3 w-3" />
                              ) : (
                                <Bookmark className="h-3 w-3" />
                              )}
                            </button>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canMoveUp && (
                                <button
                                  onClick={() => onReorder(event, 'up')}
                                  className="p-1 rounded text-lifeline-ink-muted hover:text-lifeline-ink hover:bg-lifeline-paper-dark transition-colors"
                                  title="Move up within year"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                              )}
                              {canMoveDown && (
                                <button
                                  onClick={() => onReorder(event, 'down')}
                                  className="p-1 rounded text-lifeline-ink-muted hover:text-lifeline-ink hover:bg-lifeline-paper-dark transition-colors"
                                  title="Move down within year"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => onEdit(event)}
                                className="p-1 rounded text-lifeline-ink-muted hover:text-lifeline-ink hover:bg-lifeline-paper-dark transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${event.title}"?`))
                                    onDelete(event)
                                }}
                                className="p-1 rounded text-lifeline-ink-muted hover:text-lifeline-negative hover:bg-lifeline-negative-bg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="font-lifeline-mono text-xs text-lifeline-ink-faint mt-0.5">
                          {formatTimeLabel(event.timeType, event.timeValue)}
                          {event.timeType === 'age' && (
                            <span className="ml-1 text-lifeline-ink-faint/60">
                              ({event.computedYear})
                            </span>
                          )}
                        </p>
                        {event.summary && (
                          <p className="font-lifeline-body text-xs text-lifeline-ink-muted mt-1.5 leading-relaxed line-clamp-2">
                            {event.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
