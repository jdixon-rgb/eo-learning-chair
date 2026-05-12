import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  loadCurrentMember,
  loadParkingLot,
  createParkingLotEntry,
  updateParkingLotEntry,
  deleteParkingLotEntry,
} from '@/lib/reflectionsStore'
import { Pin, Plus, Save, Trash2, X } from 'lucide-react'

// Members see only their own parking-lot items here. The forum-wide
// view (everyone's items, with the per-member filter) belongs to the
// moderator surface at /portal/moderator/parking.
export default function MyParkingLotPage() {
  const { user, profile } = useAuth()
  const email = user?.email || profile?.email

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const { data: m } = await loadCurrentMember(email)
      if (cancelled) return
      setMember(m)
      if (m?.id && m?.chapter_id && m?.forum) {
        const { data } = await loadParkingLot(m.chapter_id, m.forum)
        if (!cancelled) setEntries(data || [])
      }
      if (!cancelled) setLoading(false)
    }
    if (email) init()
    return () => { cancelled = true }
  }, [email])

  async function refresh() {
    if (!member?.chapter_id || !member?.forum) return
    const { data } = await loadParkingLot(member.chapter_id, member.forum)
    setEntries(data || [])
  }

  const myEntries = useMemo(
    () => entries.filter(e => e.author_member_id === member?.id),
    [entries, member?.id],
  )

  async function handleAdd({ name, importance, urgency }) {
    if (!member?.id) return
    await createParkingLotEntry({
      chapter_id: member.chapter_id,
      forum: member.forum,
      author_member_id: member.id,
      name, importance, urgency,
    })
    setShowAdd(false)
    refresh()
  }

  async function handleUpdate(id, patch) {
    await updateParkingLotEntry(id, patch)
    refresh()
  }

  async function handleDelete(id) {
    await deleteParkingLotEntry(id)
    refresh()
  }

  if (loading) return <div className="text-muted-foreground text-center py-12">Loading…</div>

  if (!member) {
    return (
      <EmptyShell
        title="We couldn't find your member profile"
        body="Your email doesn't match a member record yet. Reach out to your chapter's admin to get set up."
      />
    )
  }

  if (!member.forum) {
    return (
      <EmptyShell
        title="You're not currently in a forum"
        body="The parking lot is a forum tool. If you're curious about joining a forum, reach out to your Forum Chair."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl font-bold">My Parking Lot</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Topics you want to come back to in a future {member.forum} meeting.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>

      {myEntries.length === 0 ? (
        <div className="text-center py-16">
          <Pin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground/80 text-sm mb-4">
            Nothing on your parking lot yet.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary/90 text-white"
          >
            <Pin className="h-4 w-4" />
            Add to parking lot
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground/80">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-center px-3 py-3 w-24">Importance</th>
                <th className="text-center px-3 py-3 w-24">Urgency</th>
                <th className="text-center px-3 py-3 w-24">Combined</th>
                <th className="px-3 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {myEntries.map(e => (
                <tr key={e.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-foreground">{e.name}</td>
                  <td className="text-center px-3 py-3 text-foreground/80">
                    <ScoreSelect value={e.importance} onChange={v => handleUpdate(e.id, { importance: v })} />
                  </td>
                  <td className="text-center px-3 py-3 text-foreground/80">
                    <ScoreSelect value={e.urgency} onChange={v => handleUpdate(e.id, { urgency: v })} />
                  </td>
                  <td className="text-center px-3 py-3 text-foreground font-semibold">
                    {e.importance + e.urgency}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(e)} className="text-muted-foreground/70 hover:text-foreground" title="Edit name">
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="text-muted-foreground/70 hover:text-red-400" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <ItemModal
          title="Add to parking lot"
          subtitle="Your forum will see the name and scores. Nothing else."
          initial={{ name: '', importance: 5, urgency: 5 }}
          confirmLabel="Add"
          onCancel={() => setShowAdd(false)}
          onConfirm={handleAdd}
        />
      )}

      {editing && (
        <ItemModal
          title="Edit parking lot entry"
          initial={{ name: editing.name || '', importance: editing.importance ?? 5, urgency: editing.urgency ?? 5 }}
          confirmLabel="Save"
          onCancel={() => setEditing(null)}
          onConfirm={async (patch) => {
            await handleUpdate(editing.id, patch)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ScoreSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="bg-muted/40 border border-border rounded px-2 py-1 text-sm text-foreground hover:border-foreground/40 focus:border-primary focus:outline-none cursor-pointer"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <option key={n} value={n} className="bg-card">{n}</option>
      ))}
    </select>
  )
}

function ItemModal({ title, subtitle, initial, confirmLabel, onCancel, onConfirm }) {
  const [name, setName] = useState(initial.name || '')
  const [importance, setImportance] = useState(initial.importance ?? 5)
  const [urgency, setUrgency] = useState(initial.urgency ?? 5)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onCancel} className="text-muted-foreground/60 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Short name for this item"
            className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Importance: {importance}</label>
          <input type="range" min="1" max="10" value={importance} onChange={e => setImportance(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Urgency: {urgency}</label>
          <input type="range" min="1" max="10" value={urgency} onChange={e => setUrgency(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onConfirm({ name: name.trim(), importance, urgency })}
            className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyShell({ title, body }) {
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
