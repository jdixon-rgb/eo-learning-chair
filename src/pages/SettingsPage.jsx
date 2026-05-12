import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { CHAIR_ROLES } from '@/lib/constants'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { isSupabaseConfigured } from '@/lib/supabase'
import { BUILDER, APP_NAME } from '@/lib/appBranding'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { useFormatCurrency } from '@/lib/useFormatCurrency'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { getFiscalYearOptions } from '@/lib/fiscalYear'
import { useChapter } from '@/lib/chapter'
import { Settings, Database, Download, RotateCcw, Users2, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, UserPlus, X, Wallet, Palette, Pencil, Check, Percent } from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-600 border-green-500/30',
  elect: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  past: 'bg-muted text-muted-foreground',
}

// FISCAL_YEAR_OPTIONS is now derived from centralized utilities inside the component

function toRoleKey(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function SettingsPage() {
  const { chapter, updateChapter, events, speakers, venues, budgetItems, contractChecklists, resetToDefaults } = useStore()
  const {
    chapterRoles, addChapterRole, updateChapterRole, deleteChapterRole,
    roleAssignments, addRoleAssignment, updateRoleAssignment, deleteRoleAssignment,
    chapterMembers,
    getMemberName, getMemberEmail, upsertStaffInvite,
  } = useBoardStore()
  const { role } = useAuth()
  const formatCurrency = useFormatCurrency()
  const { activeChapter } = useChapter()
  const { activeFiscalYear } = useFiscalYear()
  const canEditChapterName = hasPermission(role, 'canEditChapterConfig')

  const FISCAL_YEAR_OPTIONS = getFiscalYearOptions(activeChapter?.fiscal_year_start ?? 8, 3)

  const [newLabel, setNewLabel] = useState('')
  const [newIsStaff, setNewIsStaff] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [assigningRoleId, setAssigningRoleId] = useState(null)
  const [assignForm, setAssignForm] = useState({ member_id: '', member_name: '', member_email: '', fiscal_year: activeFiscalYear, status: 'elect', budget: '', theme: '' })
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [editAssignment, setEditAssignment] = useState({})

  const sortedRoles = [...chapterRoles].sort((a, b) => a.sort_order - b.sort_order)
  const activeMembers = [...chapterMembers].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

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

  function startEditAssignment(a) {
    setEditingAssignmentId(a.id)
    setEditAssignment({
      member_id: a.member_id || '',
      member_name: a.member_name || '',
      member_email: a.member_email || '',
      fiscal_year: a.fiscal_year || activeFiscalYear,
    })
  }

  function saveEditAssignment(id, isStaffRole) {
    if (isStaffRole) {
      const assignment = roleAssignments.find(a => a.id === id)
      const roleObj = chapterRoles.find(r => r.id === assignment?.chapter_role_id)
      updateRoleAssignment(id, {
        member_id: null,
        member_name: editAssignment.member_name || '',
        member_email: editAssignment.member_email || '',
        fiscal_year: editAssignment.fiscal_year,
      })
      upsertStaffInvite({ name: editAssignment.member_name, email: editAssignment.member_email, roleKey: roleObj?.role_key })
    } else {
      const member = chapterMembers.find(m => m.id === editAssignment.member_id)
      updateRoleAssignment(id, {
        member_id: editAssignment.member_id || null,
        member_name: member?.name || '',
        member_email: member?.email || '',
        fiscal_year: editAssignment.fiscal_year,
      })
    }
    setEditingAssignmentId(null)
    setEditAssignment({})
  }

  function handleAddAssignment(roleId) {
    const roleObj = chapterRoles.find(r => r.id === roleId)
    const isPresident = ['president', 'president_elect', 'president_elect_elect'].includes(roleObj?.role_key)
    const isStaff = roleObj?.is_staff

    if (isStaff) {
      if (!assignForm.member_name.trim()) return
      addRoleAssignment({
        chapter_role_id: roleId,
        member_id: null,
        member_name: assignForm.member_name.trim(),
        member_email: assignForm.member_email.trim(),
        fiscal_year: assignForm.fiscal_year,
        status: assignForm.status,
        budget: 0,
        theme: '',
      })
      upsertStaffInvite({ name: assignForm.member_name.trim(), email: assignForm.member_email.trim(), roleKey: roleObj?.role_key })
    } else {
      if (!assignForm.member_id) return
      const member = chapterMembers.find(m => m.id === assignForm.member_id)
      addRoleAssignment({
        chapter_role_id: roleId,
        member_id: assignForm.member_id,
        member_name: member?.name || '',
        member_email: member?.email || '',
        fiscal_year: assignForm.fiscal_year,
        status: assignForm.status,
        budget: isPresident ? 0 : (parseInt(assignForm.budget) || 0),
        theme: isPresident ? (assignForm.theme || '') : '',
      })
    }
    setAssigningRoleId(null)
    setAssignForm({ member_id: '', member_name: '', member_email: '', fiscal_year: activeFiscalYear, status: 'active', budget: '', theme: '' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <TourTip />
      <PageHeader
        title="Settings"
        subtitle="Chapter configuration and data management"
      />

      {/* Chapter Config */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Chapter Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Chapter Name</label>
            {canEditChapterName ? (
              <Input
                value={chapter.name}
                onChange={e => updateChapter({ name: e.target.value })}
              />
            ) : (
              <p className="text-sm font-medium mt-1">{chapter.name}</p>
            )}
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
        <div>
          <label className="text-xs font-medium">Executive Director Email</label>
          <Input
            type="email"
            value={chapter.executive_director_email || ''}
            onChange={e => updateChapter({ executive_director_email: e.target.value })}
            placeholder="ed@yourchapter.org"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Default recipient when a learning chair sends a speaker payment package (contract + W-9 + payment terms) to the ED.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium flex items-center gap-1.5">
            <Percent className="h-3 w-3" /> Speaker Fee Target
          </label>
          <div className="flex items-center gap-3 mt-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={chapter.speaker_fee_target_pct ?? 50}
              onChange={e => {
                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                updateChapter({ speaker_fee_target_pct: val })
              }}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${chapter.speaker_fee_target_pct ?? 50}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Target percentage of total budget allocated to speaker fees. The Scenario Planner will show how your plan compares.
          </p>
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
                          className="text-sm font-medium cursor-pointer hover:text-primary truncate block"
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
                      className="text-muted-foreground hover:text-primary p-1"
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
                        const isPresident = ['president', 'president_elect', 'president_elect_elect'].includes(role.role_key)
                        const showBudget = !isPresident && !role.is_staff && (a.status === 'active' || a.status === 'elect')
                        const showTheme = isPresident && (a.status === 'active' || a.status === 'elect')
                        const isEditing = editingAssignmentId === a.id
                        return (
                          <div key={a.id} className="space-y-1">
                            {isEditing ? (
                              /* Inline edit mode */
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                {role.is_staff ? (
                                  <>
                                    <Input
                                      value={editAssignment.member_name || ''}
                                      onChange={e => setEditAssignment(prev => ({ ...prev, member_name: e.target.value }))}
                                      placeholder="Staff name"
                                      className="h-6 text-xs flex-1 min-w-[120px]"
                                      autoFocus
                                    />
                                    <Input
                                      value={editAssignment.member_email || ''}
                                      onChange={e => setEditAssignment(prev => ({ ...prev, member_email: e.target.value }))}
                                      placeholder="Email"
                                      className="h-6 text-xs flex-1 min-w-[120px]"
                                    />
                                  </>
                                ) : (
                                  <select
                                    value={editAssignment.member_id}
                                    onChange={e => setEditAssignment(prev => ({ ...prev, member_id: e.target.value }))}
                                    className="h-6 text-xs flex-1 border rounded px-1 bg-background"
                                    autoFocus
                                  >
                                    <option value="">Select member...</option>
                                    {activeMembers.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}{m.company ? ` (${m.company})` : ''}</option>
                                    ))}
                                  </select>
                                )}
                                {!role.is_staff && (
                                  <select
                                    value={editAssignment.fiscal_year}
                                    onChange={e => setEditAssignment(prev => ({ ...prev, fiscal_year: e.target.value }))}
                                    className="h-6 text-[10px] border rounded px-1 bg-background"
                                  >
                                    {FISCAL_YEAR_OPTIONS.map(fy => (
                                      <option key={fy} value={fy}>{fy}</option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  onClick={() => saveEditAssignment(a.id, role.is_staff)}
                                  className="text-green-600 hover:text-green-700 p-0.5"
                                  title="Save"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { setEditingAssignmentId(null); setEditAssignment({}) }}
                                  className="text-muted-foreground hover:text-foreground p-0.5"
                                  title="Cancel"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              /* Display mode */
                              <div className="flex items-center gap-2 text-sm group/assignment">
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status]}`}>
                                  {a.status}
                                </Badge>
                                <span
                                  className="font-medium cursor-pointer hover:text-primary"
                                  onClick={() => startEditAssignment(a)}
                                  title="Click to edit"
                                >
                                  {getMemberName(a)}
                                </span>
                                {getMemberEmail(a) && <span className="text-muted-foreground text-xs">{getMemberEmail(a)}</span>}
                                <button
                                  onClick={() => startEditAssignment(a)}
                                  className="text-muted-foreground hover:text-primary opacity-0 group-hover/assignment:opacity-100 transition-opacity p-0.5"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                {!role.is_staff && a.fiscal_year && (
                                  <span className="text-muted-foreground text-xs ml-auto">FY {a.fiscal_year}</span>
                                )}
                                <select
                                  value={a.status}
                                  onChange={e => updateRoleAssignment(a.id, { status: e.target.value })}
                                  className={`text-[10px] bg-transparent border rounded px-1 py-0.5${role.is_staff ? ' ml-auto' : ''}`}
                                >
                                  <option value="active">Active</option>
                                  {!role.is_staff && <option value="elect">Elect</option>}
                                  <option value="past">Past</option>
                                </select>
                                <button
                                  onClick={() => deleteRoleAssignment(a.id)}
                                  className="text-muted-foreground hover:text-red-500 p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            {/* Budget field for non-president chairs */}
                            {showBudget && (
                              <div className="flex items-center gap-2 pl-6">
                                <Wallet className="h-3 w-3 text-muted-foreground" />
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
                              <div className="space-y-1.5 pl-6">
                                <div className="flex items-center gap-2">
                                  <Palette className="h-3 w-3 text-muted-foreground" />
                                  <Input
                                    placeholder="President's theme"
                                    value={a.theme || ''}
                                    onChange={e => updateRoleAssignment(a.id, { theme: e.target.value })}
                                    className="h-6 text-xs flex-1"
                                  />
                                </div>
                                <textarea
                                  placeholder="What does this theme mean? How should chairs bring it to life?"
                                  value={a.theme_description || ''}
                                  onChange={e => updateRoleAssignment(a.id, { theme_description: e.target.value })}
                                  className="w-full text-xs border rounded px-2 py-1.5 bg-background resize-none"
                                  rows={2}
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
                      {role.is_staff ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            placeholder="Staff name"
                            value={assignForm.member_name}
                            onChange={e => setAssignForm(prev => ({ ...prev, member_name: e.target.value }))}
                            className="h-7 text-sm flex-1 min-w-[140px]"
                            autoFocus
                          />
                          <Input
                            placeholder="Email (optional)"
                            value={assignForm.member_email}
                            onChange={e => setAssignForm(prev => ({ ...prev, member_email: e.target.value }))}
                            className="h-7 text-sm flex-1 min-w-[140px]"
                          />
                          <select
                            value={assignForm.status}
                            onChange={e => setAssignForm(prev => ({ ...prev, status: e.target.value }))}
                            className="h-7 text-sm border rounded px-2 bg-background"
                          >
                            <option value="active">Active</option>
                            <option value="past">Past</option>
                          </select>
                          <Button size="sm" className="h-7" onClick={() => handleAddAssignment(role.id)} disabled={!assignForm.member_name.trim()}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setAssigningRoleId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : activeMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">Add members to the Member Directory first, then assign them to positions.</p>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={assignForm.member_id}
                            onChange={e => setAssignForm(prev => ({ ...prev, member_id: e.target.value }))}
                            className="h-7 text-sm border rounded px-2 bg-background flex-1 min-w-[140px]"
                            autoFocus
                          >
                            <option value="">Select member...</option>
                            {activeMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}{m.company ? ` (${m.company})` : ''}</option>
                            ))}
                          </select>
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
                          {['president', 'president_elect', 'president_elect_elect'].includes(role.role_key) ? (
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
                          <Button size="sm" className="h-7" onClick={() => handleAddAssignment(role.id)} disabled={!assignForm.member_id}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setAssigningRoleId(null)}>
                            Cancel
                          </Button>
                        </div>
                      )}
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
              <span className="text-sm text-muted-foreground">Cloud database connected</span>
            </>
          ) : (
            <>
              <Badge className="bg-primary/10 text-primary border-primary/30">Saved Locally</Badge>
              <span className="text-sm text-muted-foreground">All changes auto-save to your browser. Cloud database not yet configured.</span>
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
            <p className="text-[11px] text-muted-foreground">Budgets</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="h-4 w-4" /> Data Management
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="justify-center sm:justify-start" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export All Data (JSON)
          </Button>
          <Button
            variant="outline"
            className="justify-center sm:justify-start text-destructive border-destructive/30 hover:bg-destructive/10"
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

      {/* About the Builder */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">About This Platform</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              <strong>{APP_NAME}</strong> — {BUILDER.framing}. Shipped by{' '}
              {BUILDER.url ? (
                <a
                  href={BUILDER.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {BUILDER.company}
                </a>
              ) : (
                <span className="font-medium text-foreground">{BUILDER.company}</span>
              )}
              . It started as a tool for one chapter and is now used by learning chairs and regional leadership across multiple chapters and countries.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
