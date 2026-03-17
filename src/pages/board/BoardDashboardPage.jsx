import { Link } from 'react-router-dom'
import { useBoardStore } from '@/lib/boardStore'
import { useStore } from '@/lib/store'
import { FISCAL_MONTHS, CHAIR_ROLES, REPORT_STATUSES, FORUM_HEALTH } from '@/lib/constants'
import {
  Briefcase,
  FileText,
  Mail,
  Users2,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'

function getHealthColor(score) {
  const level = FORUM_HEALTH.find(h => score >= h.min && score <= h.max)
  return level?.color ?? '#64648c'
}

function getHealthLabel(score) {
  const level = FORUM_HEALTH.find(h => score >= h.min && score <= h.max)
  return level?.label ?? 'No Score'
}

export default function BoardDashboardPage() {
  const { chairReports, communications, forums, memberScorecards, loading } = useBoardStore()
  const { events, speakers } = useStore()

  // Computed stats
  const activeForums = forums.filter(f => f.is_active)
  const avgHealthScore = activeForums.length > 0
    ? Math.round(activeForums.reduce((sum, f) => sum + (f.health_score || 0), 0) / activeForums.length)
    : 0
  const atRiskMembers = memberScorecards.filter(s => s.at_risk)
  const pendingReports = chairReports.filter(r => r.status === 'submitted')
  const recentComms = [...communications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const confirmedEvents = events.filter(e => e.status === 'fully_confirmed' || e.status === 'completed')

  // Current fiscal month (approximate)
  const now = new Date()
  const month = now.getMonth() + 1
  const currentFM = FISCAL_MONTHS.find(fm => fm.calendarMonth === month)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-eo-blue border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Board Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chapter health overview
          {currentFM && <> - {currentFM.name} (FY Month {currentFM.index + 1})</>}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/board/forums" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600 shrink-0">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeForums.length}</p>
              <p className="text-xs text-muted-foreground">Active Forums</p>
            </div>
          </div>
          {avgHealthScore > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getHealthColor(avgHealthScore) }}
              />
              <span className="text-xs text-muted-foreground">
                Avg Health: {avgHealthScore}/10 - {getHealthLabel(avgHealthScore)}
              </span>
            </div>
          )}
        </Link>

        <Link to="/board/reports" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-eo-blue/10 text-eo-blue shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReports.length}</p>
              <p className="text-xs text-muted-foreground">Pending Reviews</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {chairReports.length} total reports
          </p>
        </Link>

        <Link to="/board/scorecards" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${atRiskMembers.length > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
              {atRiskMembers.length > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-2xl font-bold">{atRiskMembers.length}</p>
              <p className="text-xs text-muted-foreground">At-Risk Members</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {memberScorecards.length} tracked this month
          </p>
        </Link>

        <Link to="/board/communications" className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{communications.filter(c => c.status === 'sent').length}</p>
              <p className="text-xs text-muted-foreground">Comms Sent</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {communications.filter(c => c.status === 'draft').length} drafts
          </p>
        </Link>
      </div>

      {/* Two Column: Chair Reports + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chair Reports by Role */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Chair Report Status</h2>
            <Link to="/board/reports" className="text-xs text-eo-blue hover:underline">View All</Link>
          </div>
          <div className="space-y-2">
            {CHAIR_ROLES.map(cr => {
              const latest = chairReports
                .filter(r => r.chair_role === cr.id)
                .sort((a, b) => b.fiscal_month_index - a.fiscal_month_index)[0]
              const statusDef = REPORT_STATUSES.find(s => s.id === latest?.status)
              return (
                <div key={cr.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <span className="text-sm">{cr.label}</span>
                  {latest ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                      style={{ backgroundColor: statusDef?.color ?? '#64648c' }}
                    >
                      {statusDef?.label ?? latest.status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No report</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Learning Calendar Quick Stats */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-sm mb-4">Learning Calendar Snapshot</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xl font-bold">{events.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Events</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xl font-bold">{confirmedEvents.length}</p>
              <p className="text-[10px] text-muted-foreground">Confirmed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xl font-bold">{speakers.length}</p>
              <p className="text-[10px] text-muted-foreground">Speakers in Pipeline</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xl font-bold">{speakers.filter(s => s.stage === 'confirmed').length}</p>
              <p className="text-[10px] text-muted-foreground">Speakers Confirmed</p>
            </div>
          </div>

          {/* Recent communications */}
          {recentComms.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Recent Communications</h3>
              <div className="space-y-1.5">
                {recentComms.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{c.subject}</span>
                    <span
                      className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium text-white shrink-0"
                      style={{ backgroundColor: c.status === 'sent' ? '#22c55e' : c.status === 'draft' ? '#64648c' : '#3d46f2' }}
                    >
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forum Health Grid */}
      {activeForums.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Forum Health</h2>
            <Link to="/board/forums" className="text-xs text-eo-blue hover:underline">Manage Forums</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeForums.map(f => (
              <div key={f.id} className="p-3 rounded-lg bg-muted/50 text-center">
                <div
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full text-white font-bold text-sm mb-2"
                  style={{ backgroundColor: getHealthColor(f.health_score || 0) }}
                >
                  {f.health_score ?? '-'}
                </div>
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {f.member_count} members - {getHealthLabel(f.health_score || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
