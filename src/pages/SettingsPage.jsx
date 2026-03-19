import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { CHAIR_ROLES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { isSupabaseConfigured } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Settings, Database, Download, RotateCcw, Users2, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, UserPlus, X, DollarSign, Palette } from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-600 border-green-500/30',
  elect: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  past: 'bg-muted text-muted-foreground',
}

const FISCAL_YEAR_OPTIONS = (() => {
  const now = new Date()
  const year = now.getFullYear()
  return [`${year - 1}-${year}`, `${year}-${year + 1}`, `${year + 1}-${year + 2}`]
})()

function toRoleKey(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function SettingsPage() {
  const { chapter, updateChapter, events, speakers, venues, budgetItems, contractChecklists, resetToDefaults } = useStore()
  const {
    chapterRoles, addChapterRole, updateChapterRole, deleteChapterRole,
    roleAssignments, addRoleAssignment, updateRoleAssignment, deleteRoleAssignment,
  } = useBoardStore()

  const [newLabel, setNewLabel] = useState('')
  const [newIsStaff, setNewIsStaff] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [assigningRoleId, setAssigningRoleId] = useState(null)
  const [assignForm, setAssignForm] = useState({ member_name: '', member_email: '', fiscal_year: FISCAL_YEAR_OPTIONS[1], status: 'elect', budget: '', theme: '' })

  const sortedRoles = [...chapterRoles].sort((a, b) => a.sort_order - b.sort_order)

  function getAssignmentsForRole(roleId) {
    return roleAssignments
      .filter(a => a.chapter_role_id === roleId)
      .sort((a, b) => {
        const order = { active: 0, elect: 1, past: 2 }
        return (order[a.status] ?? 4) - (order[b.status] ?? 4)
      })
  }

  const handleExport = () => {
    const data = { chapter, events, speakers, venues, budgetItems, contractChecklists, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chapteros-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleAddRole() {
    if (!newLabel.trim()) return
    const roleKey = toRoleKey(newLabel)
    if (chapterRoles.some(r => r.role_key === roleKey)) {
      alert('A role with that key already exists.')
      return
    }
    addChapterRole({
      role_key: roleKey,
      label: newLabel.trim(),
      is_staff: newIsStaff,
      sort_order: chapterRoles.length,
    })
    setNewLabel('')
    setNewIsStaff(false)
  }

  function handleSeedDefaults() {
    if (chapterRoles.length > 0) {
      if (!window.confirm('This will add the default positions alongside any existing ones. Continue?')) return
    }
    CHAIR_ROLES.forEach((cr, i) => {
      if (!chapterRoles.some(r => r.role_key === cr.id)) {
        addChapterRole({
          role_key: cr.id,
          label: cr.label,
          is_staff: cr.isStaff || false,
          sort_order: chapterRoles.length + i,
        })
      }
    })
  }

  function handleMove(roleId, direction) {
    const idx = sortedRoles.findIndex(r => r.id === roleId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedRoles.length) return
    const current = sortedRoles[idx]
    const swap = sortedRoles[swapIdx]
    updateChapterRole(current.id, { sort_order: swap.sort_order })
    updateChapterRole(swap.id, { sort_order: current.sort_order })
  }

  function handleSaveLabel(roleId) {
    if (editLabel.trim()) {
      updateChapterRole(roleId, { label: editLabel.trim() })
    }
    setEditingId(null)
    setEditLabel('')
  }

  function handleAddAssignment(roleId) {
    if (!assignForm.member_name.trim()) return
    const role = chapterRoles.find(r => r.id === roleId)
    const isPresident = role?.role_key === 'president'
    addRoleAssignment({
      chapter_role_id: roleId,
      member_name: assignForm.member_name.trim(),
      member_email: assignForm.member_email.trim(),
      fiscal_year: assignForm.fiscal_year,
      status: assignForm.status,
      budget: isPresident ? 0 : (parseInt(assignForm.budget) || 0),
      theme: isPresident ? (assignForm.theme || '') : '',
    })
    setAssigningRoleId(null)
    setAssignForm({ member_name: '', member_email: '', fiscal_year: FISCAL_YEAR_OPTIONS[1], status: 'active', budget: '', theme: '' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Chapter configuration and data management</p>
      </div>

      {/* Chapter Config */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Chapter Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Chapter Name</label>
            <Input
              value={chapter.name}
              onChange={e => updateChapter({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Default Budget ($)</label>
            <Input
              type="number"
              value={chapter.total_budget}
              onChange={e => updateChapter({ total_budget: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Fallback if no chair budget is set in role assignments</p>
          </div>
        </div>
      </div>

      {/* Board Positions & Assignments */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users2 className="h-4 w-4" /> Board Positions & Assignments ({chapterRoles.length})
          </h3>
          {chapterRoles.length === 0 && (
            <Button size="sm" variant="outline" onClick={handleSeedDefaults}>
              <Sparkles className="h-3 w-3" /> Seed Defaults
            </Button>
          )}
        </div>

        {sortedRoles.length > 0 ? (
          <div className="space-y-2">
            {sortedRoles.map((role, idx) => {
              const assignments = getAssignmentsForRole(role.id)
              return (
                <div key={role.id} className="rounded-lg border bg-muted/30 overflow-hidden">
                  {/* Position header */}
                  <div className="flex items-center gap-2 py-2 px-3 group">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMove(role.id, 'up')}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMove(role.id, 'down')}
                        disabled={idx === sortedRoles.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === role.id ? (
                        <Input
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onBlur={() => handleSaveLabel(role.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(role.id); if (e.key === 'Escape') { setEditingId(null); setEditLabel('') } }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="text-sm font-medium cursor-pointer hover:text-eo-blue truncate block"
                          onClick={() => { setEditingId(role.id); setEditLabel(role.label) }}
                          title="Click to edit"
                        >
                          {role.label}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => updateChapterRole(role.id, { is_staff: !role.is_staff })}
                      className="shrink-0"
                    >
                      <Badge
                        variant="outline"
                        className={role.is_staff ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]' : 'bg-muted text-muted-foreground text-[10px]'}
                      >
                        {role.is_staff ? 'Staff' : 'Board'}
                      </Badge>
                    </button>

                    <button
                      onClick={() => setAssigningRoleId(assigningRoleId === role.id ? null : role.id)}
                      className="text-muted-foreground hover:text-eo-blue p-1"
                      title="Assign member"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Remove "${role.label}" from board positions?`)) {
                          deleteChapterRole(role.id)
                        }
                      }}
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Assignments for this position */}
                  {assignments.length > 0 && (
                    <div className="px-3 pb-2 pl-10 space-y-2">
                      {assignments.map(a => {
                        const isPresident = role.role_key === 'president'
                        const showBudget = !isPresident && (a.status === 'active' || a.status === 'elect')
                        const showTheme = isPresident && (a.status === 'active' || a.status === 'elect')
                        return (
                          <div key={a.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status]}`}>
                                {a.status}
                              </Badge>
                              <span className="font-medium">{a.member_name}</span>
                              {a.member_email && <span className="text-muted-foreground text-xs">{a.member_email}</span>}
                              <span className="text-muted-foreground text-xs ml-auto">FY {a.fiscal_year}</span>
                              <select
                                value={a.status}
                                onChange={e => updateRoleAssignment(a.id, { status: e.target.value })}
                                className="text-[10px] bg-transparent border rounded px-1 py-0.5"
                              >
                                <option value="active">Active</option>
                                <option value="elect">Elect</option>
                                <option value="past">Past</option>
                              </select>
                              <button
                                onClick={() => deleteRoleAssignment(a.id)}
                                className="text-muted-foreground hover:text-red-500 p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Budget field for non-president chairs */}
                            {showBudget && (
                              <div className="flex items-center gap-2 pl-6">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  placeholder="Chair budget"
                                  value={a.budget || ''}
                                  onChange={e => updateRoleAssignment(a.id, { budget: parseInt(e.target.value) || 0 })}
                                  className="h-6 text-xs w-32"
                                />
                                {a.budget > 0 && (
                                  <span className="text-[10px] text-muted-foreground">{formatCurrency(a.budget)}</span>
                                )}
                              </div>
                            )}
                            {/* Theme field for president */}
                            {showTheme && (
                              <div className="flex items-center gap-2 pl-6">
                                <Palette className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  placeholder="President's theme"
                                  value={a.theme || ''}
                                  onChange={e => updateRoleAssignment(a.id, { theme: e.target.value })}
                                  className="h-6 text-xs flex-1"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add assignment form */}
                  {assigningRoleId === role.id && (
                    <div className="px-3 pb-3 pl-10 pt-1 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Name"
                          value={assignForm.member_name}
                          onChange={e => setAssignForm(prev => ({ ...prev, member_name: e.target.value }))}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Input
                          placeholder="Email (optional)"
                          value={assignForm.member_email}
                          onChange={e => setAssignForm(prev => ({ ...prev, member_email: e.target.value }))}
                          className="h-7 text-sm flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assignForm.fiscal_year}
                          onChange={e => setAssignForm(prev => ({ ...prev, fiscal_year: e.target.value }))}
                          className="h-7 text-sm border rounded px-2 bg-background"
                        >
                          {FISCAL_YEAR_OPTIONS.map(fy => (
                            <option key={fy} value={fy}>{fy}</option>
                          ))}
                        </select>
                        <select
                          value={assignForm.status}
                          onChange={e => setAssignForm(prev => ({ ...prev, status: e.target.value }))}
                          className="h-7 text-sm border rounded px-2 bg-background"
                        >
                          <option value="active">Active</option>
                          <option value="elect">Elect</option>
                        </select>
                        {role.role_key === 'president' ? (
                          <Input
                            placeholder="Theme"
                            value={assignForm.theme}
                            onChange={e => setAssignForm(prev => ({ ...prev, theme: e.target.value }))}
                            className="h-7 text-sm w-40"
                          />
                        ) : (
                          <Input
                            type="number"
                            placeholder="Budget ($)"
                            value={assignForm.budget}
                            onChange={e => setAssignForm(prev => ({ ...prev, budget: e.target.value }))}
                            className="h-7 text-sm w-28"
                          />
                        )}
                        <Button size="sm" className="h-7" onClick={() => handleAddAssignment(role.id)} disabled={!assignForm.member_name.trim()}>
                          Assign
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setAssigningRoleId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No board positions configured. Click "Seed Defaults" to add standard positions, or add them manually below.
          </p>
        )}

        {/* Add new role */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            placeholder="Position title"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddRole() }}
            className="flex-1 h-8 text-sm"
          />
          <label className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsStaff}
              onChange={e => setNewIsStaff(e.target.checked)}
              className="rounded"
            />
            Staff
          </label>
          <Button size="sm" onClick={handleAddRole} disabled={!newLabel.trim()}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {newLabel && (
          <p className="text-[10px] text-muted-foreground -mt-2">
            Key: <span className="font-mono">{toRoleKey(newLabel)}</span>
          </p>
        )}
      </div>

      {/* Connection Status */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="h-4 w-4" /> Data Status
        </h3>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured() ? (
            <>
              <Badge variant="success">Connected</Badge>
              <span className="text-sm text-muted-foreground">Supabase database connected</span>
            </>
          ) : (
            <>
              <Badge className="bg-eo-blue/10 text-eo-blue border-eo-blue/30">Saved Locally</Badge>
              <span className="text-sm text-muted-foreground">All changes auto-save to your browser. Configure Supabase in .env.local for cloud sync.</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{events.length}</p>
            <p className="text-[11px] text-muted-foreground">Events</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{speakers.length}</p>
            <p className="text-[11px] text-muted-foreground">Speakers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{venues.length}</p>
            <p className="text-[11px] text-muted-foreground">Venues</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{budgetItems.length}</p>
            <p className="text-[11px] text-muted-foreground">Budget Items</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="h-4 w-4" /> Data Management
        </h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export All Data (JSON)
          </Button>
          <Button
            variant="outline"
            className="text-eo-pink border-eo-pink/30 hover:bg-eo-pink/10"
            onClick={() => {
              if (window.confirm('Reset all data to the original sample data? Your current changes will be lost.')) {
                resetToDefaults()
              }
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset to Defaults
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Export a complete backup, or reset all data to the original sample data.</p>
      </div>
    </div>
  )
}
