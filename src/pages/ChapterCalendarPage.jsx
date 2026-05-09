import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { EVENT_OWNER_CHAIRS } from '@/lib/constants'
import { formatDateWithDay, formatTime } from '@/lib/utils'
import PageHeader from '@/lib/pageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarDays, AlertTriangle, Plus } from 'lucide-react'

// Chapter Calendar — board-level shared calendar that aggregates events
// from every chair into one conflict-spotting surface. Distinct from
// /calendar (Year Arc), which is the Learning Chair's externally-shared
// programming calendar (visible to SAPs and members).
//
// Design priorities (per user feedback 2026-05-09):
//   • Compact rows, not big cards — board members are scanning for
//     scheduling conflicts, not reading event details.
//   • Cross-chair color coding so a Learning event next to an
//     Engagement event is immediately distinguishable.
//   • Per-chair filter chips so a President can hide chairs they don't
//     want to see this round.
//   • Same-week conflict callouts: when two events from different
//     chairs land in the same calendar week, surface a warning chip
//     so the board has a chance to align before the week arrives.
//   • Open to any chair on the board (any ADMIN_LAYOUT_ROLES role) —
//     read access is universal; edit follows the owning chair.

function chairFilterKey(chapterId, fiscalYear) {
  return `eo-chapter-cal-chair-filters-${chapterId || 'na'}-${fiscalYear || 'na'}`
}

// Returns the Monday of the ISO week for a given Date.
function startOfIsoWeek(d) {
  const dt = new Date(d)
  const day = dt.getDay() // 0 = Sun … 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function weekKey(d) {
  return startOfIsoWeek(d).toISOString().slice(0, 10)
}

function formatWeekRange(monday) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const yr = sunday.getFullYear()
  return `${fmt(monday)} – ${fmt(sunday)}, ${yr}`
}

export default function ChapterCalendarPage() {
  const navigate = useNavigate()
  const { events, addEvent } = useStore()
  const { activeChapterId } = useChapter()
  const { activeFiscalYear } = useFiscalYear()

  const [chairFilter, setChairFilter] = useState(() => new Set(EVENT_OWNER_CHAIRS.map(c => c.id)))

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chairFilterKey(activeChapterId, activeFiscalYear))
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          setChairFilter(new Set(arr))
          return
        }
      }
    } catch { /* corrupt cache */ }
    setChairFilter(new Set(EVENT_OWNER_CHAIRS.map(c => c.id)))
  }, [activeChapterId, activeFiscalYear])

  useEffect(() => {
    try {
      localStorage.setItem(chairFilterKey(activeChapterId, activeFiscalYear), JSON.stringify([...chairFilter]))
    } catch { /* storage full */ }
  }, [chairFilter, activeChapterId, activeFiscalYear])

  const toggleChair = (id) => {
    setChairFilter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build the agenda model: events filtered by chair, sorted by date,
  // grouped by ISO week.
  const { weeks, conflictWeeks } = useMemo(() => {
    const filtered = events
      .filter(e => e.event_date) // only dated events show up — undated drafts skipped
      .filter(e => chairFilter.has(e.owner_chair || 'learning'))
      .sort((a, b) => a.event_date.localeCompare(b.event_date))

    const byWeek = new Map()
    for (const e of filtered) {
      const d = new Date(e.event_date)
      if (isNaN(d.getTime())) continue
      const k = weekKey(d)
      if (!byWeek.has(k)) byWeek.set(k, [])
      byWeek.get(k).push(e)
    }

    // Conflict = a single ISO week containing 2+ events from different
    // chairs. Two Learning events same week is normal; cross-chair
    // collisions are what matters.
    const conflicts = new Set()
    for (const [k, list] of byWeek.entries()) {
      const chairs = new Set(list.map(e => e.owner_chair || 'learning'))
      if (chairs.size >= 2) conflicts.add(k)
    }

    const sortedWeeks = [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, list]) => ({ key: k, monday: new Date(k), events: list }))

    return { weeks: sortedWeeks, conflictWeeks: conflicts }
  }, [events, chairFilter])

  const chairsInUse = useMemo(() => {
    const used = new Set()
    for (const e of events) used.add(e.owner_chair || 'learning')
    return used
  }, [events])

  // ── Add event ──
  const [showAdd, setShowAdd] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', owner_chair: 'learning', event_date: '', event_time: '', notes: '' })
  const handleAdd = () => {
    if (!newEvent.title || !newEvent.event_date) return
    const month = new Date(newEvent.event_date).getMonth() + 1
    // Map to fiscal-month index (Aug=0 … May=9). Anything outside 8-12,1-5
    // gets month_index left null so it doesn't show on Year Arc.
    let month_index = null
    if (month >= 8 && month <= 12) month_index = month - 8
    else if (month >= 1 && month <= 5) month_index = month + 4
    addEvent({
      title: newEvent.title,
      owner_chair: newEvent.owner_chair,
      event_date: newEvent.event_date,
      event_time: newEvent.event_time || null,
      notes: newEvent.notes || '',
      month_index,
    })
    setNewEvent({ title: '', owner_chair: 'learning', event_date: '', event_time: '', notes: '' })
    setShowAdd(false)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chapter Calendar"
        subtitle={
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-warm" />
            {formatFiscalYear(activeFiscalYear)} · Cross-chair view for spotting scheduling conflicts
          </span>
        }
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Add event
        </Button>
      </div>

      {/* Filter chips — show every defined chair so a chapter just
          starting can see what categories are available, even if no
          events use them yet. */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mr-1">Show events from</span>
        {EVENT_OWNER_CHAIRS.map(c => {
          const on = chairFilter.has(c.id)
          const inUse = chairsInUse.has(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleChair(c.id)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${on ? '' : 'opacity-40 hover:opacity-70'}`}
              style={on
                ? { backgroundColor: `${c.color}1a`, borderColor: c.color, color: c.color }
                : { borderColor: '#cbd5e1', color: '#64748b' }}
              aria-pressed={on}
              title={inUse ? `${c.label} — toggle to ${on ? 'hide' : 'show'}` : `${c.label} — no events yet`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? c.color : '#cbd5e1' }} />
              {c.label}
              {inUse && <span className="text-[9px] opacity-70">·{events.filter(e => (e.owner_chair || 'learning') === c.id).length}</span>}
            </button>
          )
        })}
      </div>

      {/* Agenda by week */}
      {weeks.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No events match the current filter. Toggle a chair on, or click "Add event" to schedule one.
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map(week => {
            const isConflict = conflictWeeks.has(week.key)
            return (
              <div
                key={week.key}
                className={`rounded-lg border bg-card overflow-hidden ${isConflict ? 'border-amber-400 ring-1 ring-amber-200' : 'border-border'}`}
              >
                <div className={`px-3 py-1.5 flex items-center justify-between ${isConflict ? 'bg-amber-50' : 'bg-muted/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{formatWeekRange(week.monday)}</span>
                    {isConflict && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Multi-chair week — coordinate
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{week.events.length} event{week.events.length === 1 ? '' : 's'}</span>
                </div>
                <ul className="divide-y divide-border">
                  {week.events.map(e => {
                    const chair = EVENT_OWNER_CHAIRS.find(c => c.id === (e.owner_chair || 'learning'))
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate(`/events/${e.id}`)}
                      >
                        <span className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: chair?.color || '#3d46f2' }} />
                        <div className="text-[11px] text-muted-foreground w-28 shrink-0 tabular-nums">
                          {formatDateWithDay(e.event_date)}
                          {e.event_time && <span className="block text-[10px]">{formatTime(e.event_time)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{e.title || 'Untitled event'}</div>
                          {e.notes && (
                            <div className="text-[11px] text-muted-foreground truncate">{e.notes}</div>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0"
                          style={{ borderColor: chair?.color, color: chair?.color, backgroundColor: `${chair?.color}10` }}
                        >
                          {chair?.label || 'Learning'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Add event dialog — minimal: title, owning chair, date, optional
          time and one-line note. Anything more elaborate (speaker,
          venue, budget) belongs on the chair-specific surfaces. */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add event to chapter calendar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Forum mixer at Postino"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Owning chair</label>
                <Select
                  value={newEvent.owner_chair}
                  onChange={e => setNewEvent(p => ({ ...p, owner_chair: e.target.value }))}
                >
                  {EVENT_OWNER_CHAIRS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Date</label>
                <Input
                  type="date"
                  value={newEvent.event_date}
                  onChange={e => setNewEvent(p => ({ ...p, event_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Time (optional)</label>
              <Input
                type="time"
                value={newEvent.event_time}
                onChange={e => setNewEvent(p => ({ ...p, event_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea
                value={newEvent.notes}
                onChange={e => setNewEvent(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Anything the rest of the board should know at a glance"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newEvent.title || !newEvent.event_date}>
                Add event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
