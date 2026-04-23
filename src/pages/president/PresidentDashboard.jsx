import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { useAuth } from '@/lib/auth'
import { getChairConfig } from '@/lib/chairRoles'
import TourTip from '@/components/TourTip'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import ThemeInfo from '@/components/ThemeInfo'
import PageHeader from '@/lib/pageHeader'
import { DollarSign, Users, CalendarDays, Palette, TrendingUp } from 'lucide-react'

export default function PresidentDashboard() {
  const { chapter, events, pipelineSpeakers } = useStore()
  const { chapterRoles, roleAssignments, chapterMembers, activePresidentTheme, activePresidentThemeDescription, activePresidentName } = useBoardStore()
  const { activeFiscalYear } = useFiscalYear()
  const { effectiveRole } = useAuth()

  // Heading adapts to viewer's role — CED/CEC see "Chapter Dashboard", President sees "President Dashboard"
  const isChapterStaff = effectiveRole === 'chapter_executive_director' || effectiveRole === 'chapter_experience_coordinator'
  const headingTitle = isChapterStaff ? 'Chapter Dashboard' : 'President Dashboard'

  const theme = activePresidentTheme || ''

  // Get all chair assignments for this FY
  const fyAssignments = roleAssignments.filter(a => a.fiscal_year === activeFiscalYear)

  // Build chair summary from role assignments
  const chairSummary = chapterRoles
    .filter(r => !r.is_staff)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(role => {
      const assignment = fyAssignments.find(a => a.chapter_role_id === role.id && (a.status === 'active' || a.status === 'elect'))
      const memberName = assignment
        ? (assignment.member_id
            ? chapterMembers.find(m => m.id === assignment.member_id)?.name || assignment.member_name
            : assignment.member_name)
        : null
      return {
        ...role,
        assignment,
        memberName,
        budget: assignment?.budget ?? 0,
      }
    })

  const totalAllocated = chairSummary.reduce((sum, c) => sum + c.budget, 0)
  const totalBudget = chapter.total_budget || 0
  const budgetPct = totalBudget > 0 ? Math.round((totalAllocated / totalBudget) * 100) : 0
  const activeMembers = chapterMembers.filter(m => m.status === 'active').length
  const plannedEvents = events.filter(e => e.status !== 'cancelled').length
  const activeSpeakers = pipelineSpeakers.filter(s => s.pipeline_stage !== 'passed').length

  return (
    <div className="space-y-6">
      <TourTip />
      <PageHeader
        title={headingTitle}
        subtitle={
          <>
            {formatFiscalYear(activeFiscalYear)}
            {theme && <> · <ThemeInfo theme={theme} description={activePresidentThemeDescription} /></>}
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Budget Allocated</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}<span className="text-base font-normal text-muted-foreground"> / {formatCurrency(totalBudget)}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{budgetPct}% allocated across {chairSummary.filter(c => c.budget > 0).length} chairs</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Active Members</span>
          </div>
          <p className="text-2xl font-bold">{activeMembers}</p>
          <p className="text-xs text-muted-foreground mt-1">chapter roster</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-medium">Events Planned</span>
          </div>
          <p className="text-2xl font-bold">{plannedEvents}</p>
          <p className="text-xs text-muted-foreground mt-1">learning calendar</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Speaker Pipeline</span>
          </div>
          <p className="text-2xl font-bold">{activeSpeakers}</p>
          <p className="text-xs text-muted-foreground mt-1">active speakers</p>
        </div>
      </div>

      {/* Board & Chair Assignments */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Board & Chair Assignments</h2>
          <span className="text-xs text-muted-foreground ml-auto">{formatFiscalYear(activeFiscalYear)}</span>
        </div>
        <div className="divide-y">
          {chairSummary.map(chair => (
            <div key={chair.id} className="px-6 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{chair.label}</span>
                  {chair.assignment?.status === 'elect' && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Elect</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chair.memberName || <span className="italic">Not assigned</span>}
                  {chair.assignment?.theme && <span className="ml-2 text-primary">"{chair.assignment.theme}"</span>}
                </p>
              </div>
              {chair.budget > 0 && (
                <span className="text-sm font-medium text-muted-foreground">{formatCurrency(chair.budget)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions hint */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Quick Tip</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Use the <strong>Switch Role</strong> dropdown in the sidebar to view any chair's surface.
          You'll see exactly what they see — their events, speakers, budget, and more.
        </p>
      </div>
    </div>
  )
}
