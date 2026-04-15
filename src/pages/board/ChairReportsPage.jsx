import { useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { FISCAL_MONTHS, REPORT_STATUSES } from '@/lib/constants'
import TourTip from '@/components/TourTip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

const emptyReport = {
  chair_role: '',
  chair_name: '',
  fiscal_month_index: 0,
  status: 'draft',
  highlights: '',
  challenges: '',
  next_month_plan: '',
  board_notes: '',
}

export default function ChairReportsPage() {
  const { chairReports, addChairReport, updateChairReport, deleteChairReport, getChairRoles } = useBoardStore()
  const chairRoles = getChairRoles()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyReport })
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const sorted = [...chairReports].sort((a, b) => b.fiscal_month_index - a.fiscal_month_index || a.chair_role.localeCompare(b.chair_role))

  function handleAdd() {
    if (!form.chair_role) return
    addChairReport(form)
    setForm({ ...emptyReport })
    setShowForm(false)
  }

  function handleStatusChange(id, newStatus) {
    const updates = { status: newStatus }
    if (newStatus === 'submitted') updates.submitted_at = new Date().toISOString()
    if (newStatus === 'reviewed') updates.reviewed_at = new Date().toISOString()
    updateChairReport(id, updates)
  }

  function startEdit(report) {
    setEditingId(report.id)
    setEditForm({ ...report })
  }

  function saveEdit() {
    if (!editingId) return
    const { id, created_at, updated_at, ...updates } = editForm
    updateChairReport(editingId, updates)
    setEditingId(null)
    setEditForm({})
  }

  return (
    <div className="space-y-6">
      <TourTip />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chair Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly reports from each chair to the board
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">New Chair Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chair Role</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.chair_role}
                onChange={e => setForm({ ...form, chair_role: e.target.value })}
              >
                <option value="">Select chair...</option>
                {chairRoles.map(cr => (
                  <option key={cr.id} value={cr.id}>{cr.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chair Name</label>
              <Input
                className="mt-1"
                value={form.chair_name}
                onChange={e => setForm({ ...form, chair_name: e.target.value })}
                placeholder="Name of the chair"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fiscal Month</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.fiscal_month_index}
                onChange={e => setForm({ ...form, fiscal_month_index: parseInt(e.target.value) })}
              >
                {FISCAL_MONTHS.map(fm => (
                  <option key={fm.index} value={fm.index}>{fm.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Highlights</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              value={form.highlights}
              onChange={e => setForm({ ...form, highlights: e.target.value })}
              placeholder="What went well this month?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Challenges</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              value={form.challenges}
              onChange={e => setForm({ ...form, challenges: e.target.value })}
              placeholder="Any issues or blockers?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Next Month Plan</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
              value={form.next_month_plan}
              onChange={e => setForm({ ...form, next_month_plan: e.target.value })}
              placeholder="What's planned for next month?"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!form.chair_role}>Save Report</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No chair reports yet. Create one to get started.</p>
          </div>
        )}

        {sorted.map(report => {
          const chairLabel = chairRoles.find(cr => cr.id === report.chair_role)?.label ?? report.chair_role
          const monthLabel = FISCAL_MONTHS[report.fiscal_month_index]?.name ?? ''
          const statusDef = REPORT_STATUSES.find(s => s.id === report.status)
          const isExpanded = expandedId === report.id
          const isEditing = editingId === report.id

          return (
            <div key={report.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{chairLabel}</span>
                  {report.chair_name && (
                    <span className="text-xs text-muted-foreground ml-2">({report.chair_name})</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{monthLabel}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium text-white shrink-0"
                  style={{ backgroundColor: statusDef?.color ?? '#64648c' }}
                >
                  {statusDef?.label ?? report.status}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>

              {isExpanded && !isEditing && (
                <div className="px-5 pb-5 border-t space-y-4">
                  {report.highlights && (
                    <div className="pt-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Highlights</h4>
                      <p className="text-sm whitespace-pre-wrap">{report.highlights}</p>
                    </div>
                  )}
                  {report.challenges && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Challenges</h4>
                      <p className="text-sm whitespace-pre-wrap">{report.challenges}</p>
                    </div>
                  )}
                  {report.next_month_plan && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Next Month Plan</h4>
                      <p className="text-sm whitespace-pre-wrap">{report.next_month_plan}</p>
                    </div>
                  )}
                  {report.board_notes && (
                    <div className="p-3 rounded-lg bg-eo-blue/5 border border-eo-blue/20">
                      <h4 className="text-xs font-semibold text-eo-blue mb-1">Board Notes</h4>
                      <p className="text-sm whitespace-pre-wrap">{report.board_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {report.status === 'draft' && (
                      <Button size="sm" onClick={() => handleStatusChange(report.id, 'submitted')}>
                        Mark Submitted
                      </Button>
                    )}
                    {report.status === 'submitted' && (
                      <Button size="sm" onClick={() => handleStatusChange(report.id, 'reviewed')}>
                        Mark Reviewed
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEdit(report)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 ml-auto"
                      onClick={() => { if (confirm('Delete this report?')) deleteChairReport(report.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {isExpanded && isEditing && (
                <div className="px-5 pb-5 border-t space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Chair Role</label>
                      <select
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={editForm.chair_role}
                        onChange={e => setEditForm({ ...editForm, chair_role: e.target.value })}
                      >
                        {chairRoles.map(cr => (
                          <option key={cr.id} value={cr.id}>{cr.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Chair Name</label>
                      <Input
                        className="mt-1"
                        value={editForm.chair_name}
                        onChange={e => setEditForm({ ...editForm, chair_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <select
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={editForm.status}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        {REPORT_STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Highlights</label>
                    <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]" value={editForm.highlights} onChange={e => setEditForm({ ...editForm, highlights: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Challenges</label>
                    <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]" value={editForm.challenges} onChange={e => setEditForm({ ...editForm, challenges: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Next Month Plan</label>
                    <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]" value={editForm.next_month_plan} onChange={e => setEditForm({ ...editForm, next_month_plan: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Board Notes</label>
                    <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]" value={editForm.board_notes} onChange={e => setEditForm({ ...editForm, board_notes: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Save Changes</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
