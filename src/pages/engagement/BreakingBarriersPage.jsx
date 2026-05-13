import { useState, useMemo } from 'react'
import {
  Utensils, Plus, X, MapPin, CalendarDays, Send, Trash2, Users,
  Trophy, ChevronDown, ChevronRight, Wallet, Sparkles, Check,
} from 'lucide-react'
import { useEngagementStore } from '@/lib/engagementStore'
import { useBoardStore } from '@/lib/boardStore'
import { useStore } from '@/lib/store'
import { BUDGET_CATEGORIES } from '@/lib/constants'
import { useFormatCurrency } from '@/lib/useFormatCurrency'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'
import StarRating from '@/components/StarRating'

const STATUS_LABELS = {
  planning: 'Planning',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_TONES = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function BreakingBarriersPage() {
  const {
    bbDinners, addDinner, updateDinner, deleteDinner,
    attendeesForDinner, addAttendee, updateAttendee, removeAttendee,
    sendDinnerReminders,
    budgetItemsForDinner, upsertDinnerBudgetItem, dinnerBudgetTotal,
  } = useEngagementStore()
  const { chapterMembers } = useBoardStore()
  const { venues } = useStore()
  const formatCurrency = useFormatCurrency()

  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [draft, setDraft] = useState(newDinnerDraft())
  const [attendeePickerFor, setAttendeePickerFor] = useState(null)

  const memberById = useMemo(() => {
    const m = new Map()
    chapterMembers.forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  const venueById = useMemo(() => {
    const m = new Map()
    venues.forEach(v => m.set(v.id, v))
    return m
  }, [venues])

  const sortedMembers = useMemo(() =>
    [...chapterMembers]
      .filter(cm => cm.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [chapterMembers])

  // Sort dinners: upcoming first by date, then completed, then cancelled
  const sortedDinners = useMemo(() => {
    return [...bbDinners].sort((a, b) => {
      const order = { planning: 0, confirmed: 0, completed: 1, cancelled: 2 }
      const so = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (so !== 0) return so
      const ad = a.dinner_date || '9999-12-31'
      const bd = b.dinner_date || '9999-12-31'
      return ad.localeCompare(bd)
    })
  }, [bbDinners])

  // Aggregate ratings across completed dinners → "Ranked Hosts" / "Ranked Facilitators"
  const hostRollup = useMemo(() => rollup(bbDinners, 'host_member_id', 'host_rating', memberById), [bbDinners, memberById])
  const facilitatorRollup = useMemo(() => rollup(bbDinners, 'facilitator_member_id', 'facilitator_rating', memberById), [bbDinners, memberById])

  const ytdTotal = useMemo(() =>
    bbDinners.reduce((sum, d) => sum + dinnerBudgetTotal(d.id, 'budget_amount'), 0),
    [bbDinners, dinnerBudgetTotal])

  const submitDraft = (e) => {
    e.preventDefault()
    if (!draft.title) return
    addDinner(draft)
    setDraft(newDinnerDraft())
    setShowAdd(false)
  }

  const handleSendReminders = (dinnerId) => {
    const count = sendDinnerReminders(dinnerId)
    alert(`Reminder timestamps stored for ${count} attendee${count === 1 ? '' : 's'}. Delivery via the chapter's outbound stack.`)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <TourTip />
      <PageHeader
        title="Breaking Barriers Dinners"
        subtitle="Small dinners that mix new and tenured members. Share venues with the Learning Chair; rank hosts and facilitators."
      />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-xs text-gray-500">
          {bbDinners.length} dinner{bbDinners.length === 1 ? '' : 's'} · {formatCurrency(ytdTotal)} year-to-date budget
        </div>
        <button
          onClick={() => { setDraft(newDinnerDraft()); setShowAdd(true) }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Schedule a dinner
        </button>
      </div>

      {/* Rankings */}
      {(hostRollup.length > 0 || facilitatorRollup.length > 0) && (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <RollupCard title="Ranked Hosts" icon={Trophy} rollup={hostRollup} />
          <RollupCard title="Ranked Facilitators" icon={Sparkles} rollup={facilitatorRollup} />
        </div>
      )}

      {sortedDinners.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Utensils className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No dinners yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Schedule the first one. Pick a host, choose a venue from the shared library, and add attendees.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sortedDinners.map(d => {
            const attendees = attendeesForDinner(d.id)
            const venue = d.venue_id ? venueById.get(d.venue_id) : null
            const host = d.host_member_id ? memberById.get(d.host_member_id) : null
            const facilitator = d.facilitator_member_id ? memberById.get(d.facilitator_member_id) : null
            const isExpanded = expanded === d.id
            const totalBudget = dinnerBudgetTotal(d.id, 'budget_amount')

            return (
              <div key={d.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : d.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                    <Utensils className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{d.title}</p>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${STATUS_TONES[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {d.dinner_date ? formatDate(d.dinner_date) : 'No date set'}
                        {d.dinner_time ? ` · ${d.dinner_time}` : ''}
                        {venue ? ` · ${venue.name}` : ''}
                        {host ? ` · Host: ${host.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 shrink-0">
                    <div>{attendees.length} invited</div>
                    {totalBudget > 0 && <div className="text-[11px] font-medium">{formatCurrency(totalBudget)}</div>}
                  </div>
                </button>

                {isExpanded && (
                  <DinnerDetail
                    dinner={d}
                    host={host}
                    facilitator={facilitator}
                    venue={venue}
                    attendees={attendees}
                    members={sortedMembers}
                    venues={venues}
                    memberById={memberById}
                    budgetItems={budgetItemsForDinner(d.id)}
                    onUpdate={(patch) => updateDinner(d.id, patch)}
                    onDelete={() => {
                      if (confirm(`Delete "${d.title}"? This removes attendees and budget items too.`)) {
                        deleteDinner(d.id)
                      }
                    }}
                    onAddAttendee={(memberId) => addAttendee(d.id, memberId)}
                    onUpdateAttendee={updateAttendee}
                    onRemoveAttendee={removeAttendee}
                    onSendReminders={() => handleSendReminders(d.id)}
                    onUpsertBudget={(category, field, val) => upsertDinnerBudgetItem(d.id, category, field, val)}
                    showAttendeePicker={attendeePickerFor === d.id}
                    onToggleAttendeePicker={(on) => setAttendeePickerFor(on ? d.id : null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add dinner modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold">Schedule a dinner</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitDraft} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  required
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. May Breaking Barriers — Old Town"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={draft.dinner_date}
                    onChange={e => setDraft(d => ({ ...d, dinner_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={draft.dinner_time}
                    onChange={e => setDraft(d => ({ ...d, dinner_time: e.target.value }))}
                    placeholder="6:30 PM"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Host</label>
                  <select
                    value={draft.host_member_id}
                    onChange={e => setDraft(d => ({ ...d, host_member_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">No host yet</option>
                    {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Facilitator</label>
                  <select
                    value={draft.facilitator_member_id}
                    onChange={e => setDraft(d => ({ ...d, facilitator_member_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">No facilitator yet</option>
                    {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Venue (shared with Learning Chair)</label>
                <select
                  value={draft.venue_id}
                  onChange={e => setDraft(d => ({ ...d, venue_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Pick from the venue library…</option>
                  {venues
                    .filter(v => v.pipeline_stage !== 'archived')
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}{v.staff_rating ? ` ${'★'.repeat(v.staff_rating)}` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Same catalog the Learning Chair curates — rate it once, see it everywhere.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={draft.status}
                  onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  placeholder="Theme, dietary considerations, who to seat near whom…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90">
                  Add dinner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function newDinnerDraft() {
  return {
    title: '',
    dinner_date: '',
    dinner_time: '',
    host_member_id: '',
    facilitator_member_id: '',
    venue_id: '',
    status: 'planning',
    notes: '',
  }
}

function DinnerDetail({
  dinner, host, facilitator, venue, attendees, members, venues, memberById,
  budgetItems, onUpdate, onDelete,
  onAddAttendee, onUpdateAttendee, onRemoveAttendee,
  onSendReminders, onUpsertBudget,
  showAttendeePicker, onToggleAttendeePicker,
}) {
  const formatCurrency = useFormatCurrency()
  const [activeBudgetField, setActiveBudgetField] = useState('budget_amount')

  const attendeeMemberIds = new Set(attendees.map(a => a.chapter_member_id))
  const pickableMembers = members.filter(m => !attendeeMemberIds.has(m.id))

  const getCell = (cat) => {
    const item = budgetItems.find(b => b.category === cat)
    return item ? (item[activeBudgetField] || 0) : 0
  }
  const totalForField = budgetItems.reduce((sum, b) => sum + (b[activeBudgetField] || 0), 0)

  return (
    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Logistics */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Logistics</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="text-gray-600">Date</label>
            <input
              type="date"
              value={dinner.dinner_date || ''}
              onChange={e => onUpdate({ dinner_date: e.target.value || null })}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <label className="text-gray-600">Time</label>
            <input
              type="text"
              value={dinner.dinner_time || ''}
              onChange={e => onUpdate({ dinner_time: e.target.value })}
              placeholder="6:30 PM"
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <label className="text-gray-600">Status</label>
            <select
              value={dinner.status}
              onChange={e => onUpdate({ status: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <label className="text-gray-600">Host</label>
            <select
              value={dinner.host_member_id || ''}
              onChange={e => onUpdate({ host_member_id: e.target.value || null })}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">—</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label className="text-gray-600">Facilitator</label>
            <select
              value={dinner.facilitator_member_id || ''}
              onChange={e => onUpdate({ facilitator_member_id: e.target.value || null })}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">—</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label className="text-gray-600">Venue</label>
            <select
              value={dinner.venue_id || ''}
              onChange={e => onUpdate({ venue_id: e.target.value || null })}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">— pick from library —</option>
              {venues
                .filter(v => v.pipeline_stage !== 'archived')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}{v.staff_rating ? ` ${'★'.repeat(v.staff_rating)}` : ''}
                  </option>
                ))}
            </select>
          </div>
          {venue && (
            <div className="text-[11px] text-gray-500 border-t border-gray-100 pt-2">
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{venue.address || 'No address on file'}</span>
              </div>
              {venue.staff_rating > 0 && (
                <div className="mt-1"><StarRating value={venue.staff_rating} readonly size="sm" /></div>
              )}
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Notes</label>
            <textarea
              value={dinner.notes || ''}
              onChange={e => onUpdate({ notes: e.target.value })}
              rows={2}
              className="mt-1 w-full text-xs rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
        </section>

        {/* Attendees + reminders */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Attendees ({attendees.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleAttendeePicker(!showAttendeePicker)}
                className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
              {attendees.length > 0 && (
                <button
                  onClick={onSendReminders}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  title="Mark reminders as sent (delivery via chapter's outbound stack)"
                >
                  <Send className="h-3 w-3" /> Remind
                </button>
              )}
            </div>
          </div>
          {dinner.reminders_sent_at && (
            <p className="text-[10px] text-emerald-700">
              Reminders last sent {formatDate(dinner.reminders_sent_at)}
            </p>
          )}
          {showAttendeePicker && (
            <div className="rounded border border-gray-200 max-h-40 overflow-y-auto">
              {pickableMembers.length === 0 ? (
                <p className="text-[11px] text-gray-500 p-2 italic">All active members are already invited.</p>
              ) : (
                pickableMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onAddAttendee(m.id)}
                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100"
                  >
                    <span>{m.name}{m.forum ? <span className="text-gray-400"> · {m.forum}</span> : null}</span>
                    <Plus className="h-3 w-3 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          )}
          {attendees.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic">No attendees yet.</p>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {attendees.map(a => {
                const m = memberById.get(a.chapter_member_id)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate flex-1">{m?.name || 'Unknown member'}</span>
                    <select
                      value={a.rsvp_status}
                      onChange={e => onUpdateAttendee(a.id, { rsvp_status: e.target.value })}
                      className="text-[10px] rounded border border-gray-200 px-1 py-0.5"
                    >
                      <option value="invited">Invited</option>
                      <option value="yes">Yes</option>
                      <option value="maybe">Maybe</option>
                      <option value="no">No</option>
                      <option value="attended">Attended</option>
                      <option value="no_show">No show</option>
                    </select>
                    {a.reminder_sent_at && <Check className="h-3 w-3 text-emerald-600" title={`Reminder sent ${formatDate(a.reminder_sent_at)}`} />}
                    <button onClick={() => onRemoveAttendee(a.id)} className="text-gray-300 hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Budget */}
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Budget
          </h3>
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-gray-100">
            {[
              { key: 'budget_amount', label: 'Budget' },
              { key: 'contracted_amount', label: 'Contracted' },
              { key: 'actual_amount', label: 'Actual' },
            ].map(o => (
              <button
                key={o.key}
                onClick={() => setActiveBudgetField(o.key)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded ${activeBudgetField === o.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="py-1.5 pr-2">Line item</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_CATEGORIES
              .filter(c => c.id !== 'speaker_fee')
              .map(cat => {
                const cellValue = getCell(cat.id)
                return (
                  <tr key={cat.id} className="border-b border-gray-50">
                    <td className="py-1 pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.label}
                      </span>
                    </td>
                    <td className="py-1 text-right">
                      <BudgetCell
                        value={cellValue}
                        onChange={(v) => onUpsertBudget(cat.id, activeBudgetField, v)}
                      />
                    </td>
                  </tr>
                )
              })}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-1.5 pr-2 font-semibold text-gray-700">Event total</td>
              <td className="py-1.5 text-right font-semibold">{formatCurrency(totalForField)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Post-dinner ratings */}
      {(dinner.status === 'completed' || dinner.host_rating || dinner.facilitator_rating) && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Post-dinner rating
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium text-gray-600 mb-1">
                Host {host ? `· ${host.name}` : ''}
              </p>
              <StarRating
                value={dinner.host_rating || 0}
                onChange={(v) => onUpdate({ host_rating: v || null })}
                size="md"
              />
              <textarea
                value={dinner.host_rating_notes || ''}
                onChange={e => onUpdate({ host_rating_notes: e.target.value })}
                rows={2}
                placeholder="What worked, what to coach"
                className="mt-2 w-full text-xs rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-600 mb-1">
                Facilitator {facilitator ? `· ${facilitator.name}` : ''}
              </p>
              <StarRating
                value={dinner.facilitator_rating || 0}
                onChange={(v) => onUpdate({ facilitator_rating: v || null })}
                size="md"
              />
              <textarea
                value={dinner.facilitator_rating_notes || ''}
                onChange={e => onUpdate({ facilitator_rating_notes: e.target.value })}
                rows={2}
                placeholder="What worked, what to coach"
                className="mt-2 w-full text-xs rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
          </div>
        </section>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={onDelete}
          className="text-[11px] text-gray-400 hover:text-rose-600 flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" /> Delete dinner
        </button>
      </div>
    </div>
  )
}

function BudgetCell({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const formatCurrency = useFormatCurrency()
  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const v = parseFloat(draft); if (!isNaN(v) && v !== value) onChange(v) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }}
        className="w-24 text-right text-xs rounded border border-primary px-1.5 py-0.5"
      />
    )
  }
  return (
    <button
      onClick={() => { setDraft(String(value || 0)); setEditing(true) }}
      className="text-right hover:bg-gray-50 rounded px-1.5 py-0.5"
    >
      {value ? formatCurrency(value) : <span className="text-gray-300">—</span>}
    </button>
  )
}

function RollupCard({ title, icon: Icon, rollup }) {
  if (rollup.length === 0) return null
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-amber-600" /> {title}
      </h3>
      <ul className="space-y-2">
        {rollup.slice(0, 5).map(r => (
          <li key={r.memberId} className="flex items-center justify-between text-xs">
            <span className="truncate">{r.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <StarRating value={Math.round(r.avg)} readonly size="sm" />
              <span className="text-gray-400 text-[10px]">{r.avg.toFixed(1)} · {r.count} dinner{r.count === 1 ? '' : 's'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function rollup(dinners, memberKey, ratingKey, memberById) {
  const acc = new Map()
  dinners.forEach(d => {
    const id = d[memberKey]
    const r = d[ratingKey]
    if (!id || !r) return
    if (!acc.has(id)) acc.set(id, { sum: 0, count: 0 })
    const e = acc.get(id)
    e.sum += r
    e.count += 1
  })
  return [...acc.entries()]
    .map(([memberId, { sum, count }]) => ({
      memberId,
      name: memberById.get(memberId)?.name || 'Unknown',
      avg: sum / count,
      count,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
}

function formatDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
