import { useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { FORUM_HEALTH } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Users2, Edit2, Trash2, X, ChevronDown, ChevronUp, Star } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

function getHealthColor(score) {
  const level = FORUM_HEALTH.find(h => score >= h.min && score <= h.max)
  return level?.color ?? '#64648c'
}

function getHealthLabel(score) {
  const level = FORUM_HEALTH.find(h => score >= h.min && score <= h.max)
  return level?.label ?? 'No Score'
}

const emptyForum = {
  name: '',
  moderator_name: '',
  moderator_email: '',
  meeting_cadence: 'monthly',
  member_count: 0,
  health_score: 7,
  health_notes: '',
  is_active: true,
  population: 'member',
}

export default function ForumsPage() {
  const { forums, addForum, updateForum, deleteForum, chapterMembers } = useBoardStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForum })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [expandedForum, setExpandedForum] = useState(null)

  const active = forums.filter(f => f.is_active)
  const inactive = forums.filter(f => !f.is_active)

  // Derive forum membership from chapter_members
  function getForumMembers(forumName) {
    return chapterMembers.filter(m => m.forum && m.forum.toLowerCase() === forumName.toLowerCase())
  }

  function getForumModerators(forumName) {
    return chapterMembers.filter(m => m.forum && m.forum.toLowerCase() === forumName.toLowerCase() && m.is_forum_moderator)
  }

  const totalMembers = active.reduce((sum, f) => {
    const derived = getForumMembers(f.name).length
    return sum + (derived || f.member_count || 0)
  }, 0)

  function handleAdd() {
    if (!form.name.trim()) return
    addForum(form)
    setForm({ ...emptyForum })
    setShowForm(false)
  }

  function startEdit(forum) {
    setEditingId(forum.id)
    setEditForm({ ...forum })
  }

  function saveEdit() {
    if (!editingId) return
    const { id, created_at, updated_at, chapter_id, ...updates } = editForm
    updateForum(editingId, updates)
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Forums"
          subtitle={`${active.length} active forum${active.length !== 1 ? 's' : ''} · ${totalMembers} total members`}
        />
        <Button onClick={() => setShowForm(!showForm)} className="ml-auto">
          <Plus className="h-4 w-4" />
          Add Forum
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">New Forum</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Forum Name</label>
              <Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Forum Alpha" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Population</label>
              <div className="mt-1 flex rounded-md border bg-background p-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, population: 'member' })}
                  className={`flex-1 px-3 py-1.5 rounded ${form.population === 'member' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, population: 'slp' })}
                  className={`flex-1 px-3 py-1.5 rounded ${form.population === 'slp' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  SLP
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Moderator</label>
              <Input className="mt-1" value={form.moderator_name} onChange={e => setForm({ ...form, moderator_name: e.target.value })} placeholder="Moderator name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Moderator Email</label>
              <Input className="mt-1" type="email" value={form.moderator_email} onChange={e => setForm({ ...form, moderator_email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Meeting Cadence</label>
              <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.meeting_cadence} onChange={e => setForm({ ...form, meeting_cadence: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Health Score (1-10)</label>
              <Input className="mt-1" type="number" min="1" max="10" value={form.health_score} onChange={e => setForm({ ...form, health_score: parseInt(e.target.value) || 7 })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Health Notes</label>
            <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]" value={form.health_notes} onChange={e => setForm({ ...form, health_notes: e.target.value })} placeholder="Notes on forum health..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Forum</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Forum Cards */}
      {active.length === 0 && inactive.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No forums yet. Add one to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map(forum => {
          const isEditing = editingId === forum.id
          const members = getForumMembers(forum.name)
          const moderators = getForumModerators(forum.name)
          const memberCount = members.length || forum.member_count || 0
          const isExpanded = expandedForum === forum.id

          if (isEditing) {
            return (
              <div key={forum.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Edit Forum</h3>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Forum name" />
                <Input value={editForm.moderator_name} onChange={e => setEditForm({ ...editForm, moderator_name: e.target.value })} placeholder="Moderator" />
                <Input type="email" value={editForm.moderator_email} onChange={e => setEditForm({ ...editForm, moderator_email: e.target.value })} placeholder="Email" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Health Score</label>
                    <Input type="number" min="1" max="10" value={editForm.health_score} onChange={e => setEditForm({ ...editForm, health_score: parseInt(e.target.value) || 7 })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Cadence</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={editForm.meeting_cadence} onChange={e => setEditForm({ ...editForm, meeting_cadence: e.target.value })}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]" value={editForm.health_notes} onChange={e => setEditForm({ ...editForm, health_notes: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => updateForum(forum.id, { is_active: false })}>Deactivate</Button>
                </div>
              </div>
            )
          }

          return (
            <div key={forum.id} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center h-11 w-11 rounded-full text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: getHealthColor(forum.health_score || 0) }}
                  >
                    {forum.health_score ?? '-'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm">{forum.name}</h3>
                      {forum.population === 'slp' && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-pink-300 text-pink-700 bg-pink-50">SLP</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{getHealthLabel(forum.health_score || 0)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(forum)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${forum.name}?`)) deleteForum(forum.id) }}
                    className="text-muted-foreground hover:text-red-600 p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-sm font-bold">{memberCount}</p>
                  <p className="text-[10px] text-muted-foreground">Members</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-sm font-bold capitalize">{forum.meeting_cadence}</p>
                  <p className="text-[10px] text-muted-foreground">Cadence</p>
                </div>
              </div>

              {/* Moderator(s) - derived from chapter_members */}
              {moderators.length > 0 ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{moderators.map(m => m.name).join(', ')}</span>
                </div>
              ) : forum.moderator_name ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Moderator: {forum.moderator_name}
                </p>
              ) : null}

              {forum.health_notes && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{forum.health_notes}</p>
              )}

              {/* Expandable member list */}
              {members.length > 0 && (
                <div className="mt-3 border-t border-border pt-2">
                  <button
                    onClick={() => setExpandedForum(isExpanded ? null : forum.id)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 text-xs py-0.5">
                          {m.is_forum_moderator && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />}
                          <span className={m.is_forum_moderator ? 'font-medium' : ''}>{m.name}</span>
                          {m.company && <span className="text-muted-foreground truncate">{m.company}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inactive Forums */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Inactive ({inactive.length})</h2>
          <div className="space-y-2">
            {inactive.map(f => (
              <div key={f.id} className="rounded-xl border bg-card px-5 py-3 shadow-sm flex items-center justify-between opacity-60">
                <span className="text-sm">{f.name} - {getForumMembers(f.name).length || f.member_count} members</span>
                <Button size="sm" variant="outline" onClick={() => updateForum(f.id, { is_active: true })}>
                  Reactivate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
