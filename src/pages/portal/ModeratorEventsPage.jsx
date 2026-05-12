import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { useIsModerator } from '@/lib/useIsModerator'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import PageHeader from '@/lib/pageHeader'
import {
  CalendarDays, Plus, Trash2, MapPin, Video, Users2, Sparkles, Clock,
} from 'lucide-react'

const EVENT_TYPE_LABELS = {
  monthly_meeting: 'Monthly Moderator Meeting',
  summit: 'Annual Summit',
  other: 'Other',
}

const HOST_ROLE_LABELS = {
  moderator: 'Moderator',
  forum_health_chair: 'Forum Health Chair',
  president: 'President',
  other: 'Other',
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Convert a Date to the local-time value an <input type="datetime-local"> expects.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ModeratorEventsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const { activeChapter } = useChapter()
  const { activeFiscalYear } = useFiscalYear()
  const { isModerator } = useIsModerator()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const canAccess = isModerator || isAdmin || isSuperAdmin
  const chapterId = activeChapter?.id

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !chapterId) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('moderator_events')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('starts_at', { ascending: true })
    if (error) {
      console.error('[moderator_events:select]', error)
      setEvents([])
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }, [chapterId])

  useEffect(() => { if (canAccess) refresh() }, [canAccess, refresh])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const u = []
    const p = []
    events.forEach(e => {
      const t = new Date(e.starts_at).getTime()
      if (t >= now) u.push(e); else p.push(e)
    })
    return { upcoming: u, past: p.reverse() }
  }, [events])

  if (!canAccess) {
    // Defensive: route is also hidden in the sidebar, but a moderator
    // could deep-link here from elsewhere. Send non-moderators home.
    return <Navigate to="/portal" replace />
  }

  function startNew() {
    setDraft({
      id: null,
      event_type: 'monthly_meeting',
      host_role: 'moderator',
      title: '',
      description: '',
      starts_at: '',
      ends_at: '',
      location: '',
      virtual_link: '',
      region: activeChapter?.region || '',
    })
    setShowForm(true)
    setSaveError(null)
  }

  function startEdit(e) {
    setDraft({
      id: e.id,
      event_type: e.event_type,
      host_role: e.host_role,
      title: e.title,
      description: e.description || '',
      starts_at: toLocalInput(e.starts_at),
      ends_at: toLocalInput(e.ends_at),
      location: e.location || '',
      virtual_link: e.virtual_link || '',
      region: e.region || '',
    })
    setShowForm(true)
    setSaveError(null)
  }

  async function handleSave() {
    if (!draft.title.trim() || !draft.starts_at) {
      setSaveError('Title and start time are required.')
      return
    }
    const payload = {
      chapter_id: chapterId,
      event_type: draft.event_type,
      host_role: draft.host_role,
      title: draft.title.trim(),
      description: draft.description.trim(),
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      location: draft.location.trim(),
      virtual_link: draft.virtual_link.trim(),
      region: draft.region.trim() || null,
      fiscal_year: activeFiscalYear || null,
    }
    let error
    if (draft.id) {
      ({ error } = await supabase.from('moderator_events').update(payload).eq('id', draft.id))
    } else {
      ({ error } = await supabase.from('moderator_events').insert({ ...payload, created_by: user?.id || null }))
    }
    if (error) {
      console.error('[moderator_events:save]', error)
      setSaveError(error.message || 'Could not save event.')
      return
    }
    setShowForm(false)
    setDraft(null)
    refresh()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this moderator event?')) return
    const { error } = await supabase.from('moderator_events').delete().eq('id', id)
    if (error) {
      console.error('[moderator_events:delete]', error)
      alert(error.message || 'Could not delete event.')
      return
    }
    refresh()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Moderator Events"
        subtitle="Monthly moderator meetings & the annual summit — for moderators and forum-health leadership only."
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New event
        </button>
      </div>

      {showForm && (
        <EventForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setDraft(null); setSaveError(null) }}
          error={saveError}
        />
      )}

      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading…</div>
      ) : (
        <>
          <Section title="Upcoming" empty="No upcoming moderator events scheduled.">
            {upcoming.map(e => (
              <EventRow key={e.id} event={e} onEdit={() => startEdit(e)} onDelete={() => handleDelete(e.id)} />
            ))}
          </Section>

          {past.length > 0 && (
            <Section title="Past">
              {past.map(e => (
                <EventRow key={e.id} event={e} past onEdit={() => startEdit(e)} onDelete={() => handleDelete(e.id)} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, empty, children }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0)
  return (
    <div>
      <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">{title}</h2>
      {isEmpty ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {empty || 'Nothing here yet.'}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function EventRow({ event, past, onEdit, onDelete }) {
  const TypeIcon = event.event_type === 'summit' ? Sparkles : event.event_type === 'monthly_meeting' ? Users2 : CalendarDays
  return (
    <div className={`rounded-xl border bg-card p-4 ${past ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            <TypeIcon className="h-3 w-3" />
            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
            <span className="opacity-60">·</span>
            <span>Hosted by {HOST_ROLE_LABELS[event.host_role] || event.host_role}</span>
            {event.region && (<><span className="opacity-60">·</span><span>{event.region}</span></>)}
          </div>
          <h3 className="text-sm font-semibold mt-1">{event.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDateTime(event.starts_at)}{event.ends_at ? ` – ${fmtDateTime(event.ends_at)}` : ''}</span>
            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
            {event.virtual_link && <a href={event.virtual_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Video className="h-3 w-3" />Join</a>}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground/90 mt-2 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="px-2 py-1 text-[10px] font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EventForm({ draft, setDraft, onSave, onCancel, error }) {
  if (!draft) return null
  const set = (patch) => setDraft({ ...draft, ...patch })
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Type">
          <select
            value={draft.event_type}
            onChange={e => set({ event_type: e.target.value })}
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          >
            <option value="monthly_meeting">Monthly Moderator Meeting</option>
            <option value="summit">Annual Summit</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Host">
          <select
            value={draft.host_role}
            onChange={e => set({ host_role: e.target.value })}
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          >
            <option value="moderator">Moderator</option>
            <option value="forum_health_chair">Forum Health Chair</option>
            <option value="president">President</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input
          type="text"
          value={draft.title}
          onChange={e => set({ title: e.target.value })}
          placeholder={draft.event_type === 'summit' ? 'e.g. 2026 U.S. West Moderator Summit' : 'e.g. June moderator meeting'}
          className="w-full text-sm bg-background border rounded-lg px-3 py-2"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Starts">
          <input
            type="datetime-local"
            value={draft.starts_at}
            onChange={e => set({ starts_at: e.target.value })}
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          />
        </Field>
        <Field label="Ends (optional)">
          <input
            type="datetime-local"
            value={draft.ends_at}
            onChange={e => set({ ends_at: e.target.value })}
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Location">
          <input
            type="text"
            value={draft.location}
            onChange={e => set({ location: e.target.value })}
            placeholder="Venue or city"
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          />
        </Field>
        <Field label="Virtual link">
          <input
            type="url"
            value={draft.virtual_link}
            onChange={e => set({ virtual_link: e.target.value })}
            placeholder="https://…"
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          />
        </Field>
      </div>

      {draft.event_type === 'summit' && (
        <Field label="Region" hint="Annual summit happens per regional location — tag the region this one covers.">
          <input
            type="text"
            value={draft.region}
            onChange={e => set({ region: e.target.value })}
            placeholder="e.g. U.S. West"
            className="w-full text-xs bg-background border rounded-lg px-2 py-1.5"
          />
        </Field>
      )}

      <Field label="Description">
        <textarea
          rows={3}
          value={draft.description}
          onChange={e => set({ description: e.target.value })}
          placeholder="Agenda overview, prep notes, who should attend…"
          className="w-full text-sm bg-background border rounded-lg px-3 py-2"
        />
      </Field>

      {error && <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-muted-foreground/70 mt-1 leading-snug">{hint}</span>}
    </label>
  )
}
