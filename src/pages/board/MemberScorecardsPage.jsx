import { useState, useMemo } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { FISCAL_MONTHS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, BarChart3, AlertTriangle, Trash2 } from 'lucide-react'

const emptyScorecard = {
  member_name: '',
  fiscal_month_index: 0,
  events_attended: 0,
  forum_meetings_attended: 0,
  engagement_score: 50,
  at_risk: false,
  notes: '',
}

export default function MemberScorecardsPage() {
  const { memberScorecards, forums, addScorecard, updateScorecard, deleteScorecard } = useBoardStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyScorecard })

  // Current fiscal month default
  const now = new Date()
  const month = now.getMonth() + 1
  const currentFM = FISCAL_MONTHS.find(fm => fm.calendarMonth === month)
  const [selectedMonth, setSelectedMonth] = useState(currentFM?.index ?? 0)

  const filtered = useMemo(() => {
    return memberScorecards
      .filter(s => s.fiscal_month_index === selectedMonth)
      .sort((a, b) => (a.engagement_score ?? 50) - (b.engagement_score ?? 50))
  }, [memberScorecards, selectedMonth])

  const atRiskCount = filtered.filter(s => s.at_risk).length
  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((sum, s) => sum + (s.engagement_score ?? 0), 0) / filtered.length)
    : 0

  function handleAdd() {
    if (!form.member_name.trim()) return
    addScorecard({ ...form, fiscal_month_index: selectedMonth })
    setForm({ ...emptyScorecard })
    setShowForm(false)
  }

  function toggleAtRisk(id, currentValue) {
    updateScorecard(id, { at_risk: !currentValue })
  }

  function scoreColor(score) {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  function scoreBg(score) {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Member Scorecards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track member engagement and identify at-risk members
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Month Selector + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Month:</label>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
          >
            {FISCAL_MONTHS.map(fm => (
              <option key={fm.index} value={fm.index}>{fm.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <strong>{filtered.length}</strong> members tracked
          </span>
          {avgScore > 0 && (
            <span className={scoreColor(avgScore)}>
              Avg Score: <strong>{avgScore}</strong>
            </span>
          )}
          {atRiskCount > 0 && (
            <span className="text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>{atRiskCount}</strong> at risk
            </span>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">Add Member Scorecard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Member Name</label>
              <Input className="mt-1" value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Events Attended</label>
              <Input className="mt-1" type="number" min="0" value={form.events_attended} onChange={e => setForm({ ...form, events_attended: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Forum Meetings</label>
              <Input className="mt-1" type="number" min="0" value={form.forum_meetings_attended} onChange={e => setForm({ ...form, forum_meetings_attended: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Engagement Score (0-100)</label>
              <Input className="mt-1" type="number" min="0" max="100" value={form.engagement_score} onChange={e => setForm({ ...form, engagement_score: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Forum</label>
              <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.forum_id || ''} onChange={e => setForm({ ...form, forum_id: e.target.value || null })}>
                <option value="">No forum assigned</option>
                {forums.filter(f => f.is_active).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.at_risk} onChange={e => setForm({ ...form, at_risk: e.target.checked })} className="rounded" />
              <span className="text-sm text-red-600 font-medium">Flag as At-Risk</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!form.member_name.trim()}>Add Scorecard</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Scorecards Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No scorecards for {FISCAL_MONTHS[selectedMonth]?.name}. Add members to start tracking.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Forum</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Events</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Forum Mtgs</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sc => {
                  const forum = forums.find(f => f.id === sc.forum_id)
                  return (
                    <tr key={sc.id} className={`border-b last:border-0 ${sc.at_risk ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {sc.at_risk && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span className="font-medium">{sc.member_name}</span>
                        </div>
                        {sc.notes && <p className="text-xs text-muted-foreground mt-0.5">{sc.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {forum?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">{sc.events_attended}</td>
                      <td className="px-4 py-3 text-center">{sc.forum_meetings_attended}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBg(sc.engagement_score ?? 0)}`}
                              style={{ width: `${sc.engagement_score ?? 0}%` }}
                            />
                          </div>
                          <span className={`font-bold text-xs ${scoreColor(sc.engagement_score ?? 0)}`}>
                            {sc.engagement_score ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAtRisk(sc.id, sc.at_risk)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                            sc.at_risk
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {sc.at_risk ? 'At Risk' : 'Active'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { if (confirm(`Delete scorecard for ${sc.member_name}?`)) deleteScorecard(sc.id) }}
                          className="text-muted-foreground hover:text-red-600 p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
