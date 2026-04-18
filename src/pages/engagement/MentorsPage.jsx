import { useState, useMemo } from 'react'
import { useEngagementStore } from '@/lib/engagementStore'
import { useBoardStore } from '@/lib/boardStore'
import { Heart, Plus, Pencil, Archive, RotateCcw, Trash2, X } from 'lucide-react'
import TourTip from '@/components/TourTip'

export default function MentorsPage() {
  const {
    mentors, addMentor, updateMentor,
    retireMentor, restoreMentor, deleteMentor,
    activePairingsForMentor,
  } = useEngagementStore()
  const { chapterMembers } = useBoardStore()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ chapter_member_id: '', bio: '', max_concurrent_pairings: '' })

  const memberById = useMemo(() => {
    const m = new Map()
    chapterMembers.forEach(cm => m.set(cm.id, cm))
    return m
  }, [chapterMembers])

  const eligibleMembers = useMemo(() => {
    const existingIds = new Set(mentors.map(n => n.chapter_member_id))
    return chapterMembers
      .filter(cm => cm.status === 'active')
      .filter(cm => !existingIds.has(cm.id) || (editing && editing.chapter_member_id === cm.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [chapterMembers, mentors, editing])

  const sortedMentors = useMemo(() => {
    const order = { active: 0, paused: 1, retired: 2 }
    return [...mentors].sort((a, b) => {
      const so = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (so !== 0) return so
      const an = memberById.get(a.chapter_member_id)?.name || ''
      const bn = memberById.get(b.chapter_member_id)?.name || ''
      return an.localeCompare(bn)
    })
  }, [mentors, memberById])

  const openAdd = () => {
    setEditing(null)
    setForm({ chapter_member_id: '', bio: '', max_concurrent_pairings: '' })
    setShowForm(true)
  }

  const openEdit = (mentor) => {
    setEditing(mentor)
    setForm({
      chapter_member_id: mentor.chapter_member_id,
      bio: mentor.bio || '',
      max_concurrent_pairings: mentor.max_concurrent_pairings ?? '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.chapter_member_id) return
    const payload = {
      chapter_member_id: form.chapter_member_id,
      bio: form.bio.trim(),
      max_concurrent_pairings: form.max_concurrent_pairings === '' ? null : Number(form.max_concurrent_pairings),
    }
    if (editing) {
      updateMentor(editing.id, payload)
    } else {
      addMentor(payload)
    }
    closeForm()
  }

  const handleDelete = (mentor) => {
    const name = memberById.get(mentor.chapter_member_id)?.name || 'this mentor'
    if (confirm(`Permanently delete ${name}'s mentor record? This cannot be undone. To deactivate without deleting, use Retire instead.`)) {
      deleteMentor(mentor.id)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <TourTip />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mentors</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Members appointed to mentor fellow members at any tenure. Set capacity to help with assignment decisions.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Mentor
        </button>
      </header>

      {sortedMentors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No mentors yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Appoint a chapter member as a mentor. They'll be eligible to be paired with any member seeking guidance.
          </p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add the first mentor
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Mentor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active pairings</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Bio</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMentors.map(mentor => {
                const member = memberById.get(mentor.chapter_member_id)
                const activePairings = activePairingsForMentor(mentor.id)
                const cap = mentor.max_concurrent_pairings
                const capText = cap == null ? '—' : `${activePairings} / ${cap}`
                const overCap = cap != null && activePairings > cap
                return (
                  <tr key={mentor.id} className={mentor.status === 'retired' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{member?.name || 'Unknown member'}</div>
                      <div className="text-xs text-gray-500">{member?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={mentor.status} />
                    </td>
                    <td className="px-4 py-3">{activePairings}</td>
                    <td className={`px-4 py-3 ${overCap ? 'text-amber-600 font-semibold' : ''}`}>{capText}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <div className="line-clamp-2">{mentor.bio || <span className="text-gray-300">—</span>}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(mentor)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {mentor.status === 'retired' ? (
                          <button
                            onClick={() => restoreMentor(mentor.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-emerald-600"
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => retireMentor(mentor.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600"
                            title="Retire"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(mentor)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold">
                {editing ? 'Edit Mentor' : 'Add Mentor'}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chapter member
                </label>
                <select
                  value={form.chapter_member_id}
                  onChange={e => setForm(f => ({ ...f, chapter_member_id: e.target.value }))}
                  required
                  disabled={!!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50"
                >
                  <option value="">Select a member…</option>
                  {eligibleMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.forum ? ` — ${m.forum}` : ''}</option>
                  ))}
                </select>
                {editing && (
                  <p className="text-xs text-gray-500 mt-1">Member assignment can't be changed. Delete and re-add if needed.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bio (shown to paired members)
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  placeholder="Hi, I'm Reggie. I joined EO in 2018…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Max concurrent pairings (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.max_concurrent_pairings}
                  onChange={e => setForm(f => ({ ...f, max_concurrent_pairings: e.target.value }))}
                  placeholder="e.g. 3"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-gray-500 mt-1">Soft hint, not a hard limit. Helps with assignment decisions.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                >
                  {editing ? 'Save changes' : 'Add mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    retired: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${styles[status] || styles.retired}`}>
      {status}
    </span>
  )
}
