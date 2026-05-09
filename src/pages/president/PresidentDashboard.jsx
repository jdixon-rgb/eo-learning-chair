import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { useSAPStore } from '@/lib/sapStore'
import { useAuth } from '@/lib/auth'
import { getChairConfig } from '@/lib/chairRoles'
import TourTip from '@/components/TourTip'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import ThemeInfo from '@/components/ThemeInfo'
import ChapterWelcomeGuide from '@/components/ChapterWelcomeGuide'
import PageHeader from '@/lib/pageHeader'
import SAPRenewalControl from '@/components/SAPRenewalControl'
import { SAP_RENEWAL_STATUSES } from '@/lib/constants'
import { Link } from 'react-router-dom'
import { Wallet, Users, CalendarDays, Palette, TrendingUp, UserPlus, Briefcase, Sparkles, Handshake, ChevronRight } from 'lucide-react'

export default function PresidentDashboard() {
  const { chapter, events, pipelineSpeakers } = useStore()
  const { chapterRoles, roleAssignments, chapterMembers, activePresidentTheme, activePresidentThemeDescription, activePresidentName } = useBoardStore()
  const { partners: sapPartners } = useSAPStore()
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

  // Renewal rollup across active SAPs. Surfaces here so leadership
  // sees at-risk partner relationships early. SAP Chair sets the
  // signal on /partners; this is read-only here.
  const activeSaps = sapPartners.filter(p => (p.status || 'active') === 'active')
  const renewalCounts = SAP_RENEWAL_STATUSES.reduce((acc, s) => {
    acc[s.id] = activeSaps.filter(p => p.renewal_status === s.id).length
    return acc
  }, {})
  const renewalNotSet = activeSaps.filter(p => !p.renewal_status).length
  const atRiskSaps = activeSaps
    .filter(p => p.renewal_status === 'uncertain' || p.renewal_status === 'not_renewing')
    .sort((a, b) => {
      // Not-renewing first, then uncertain.
      if (a.renewal_status === b.renewal_status) return (a.name || '').localeCompare(b.name || '')
      return a.renewal_status === 'not_renewing' ? -1 : 1
    })

  // Brand-new chapter signal for the President's welcome guide.
  // Strict zero-state: no chair assignments, no active members, no events.
  const isEmptyChapter =
    fyAssignments.length === 0
    && activeMembers === 0
    && events.length === 0

  return (
    <div className="space-y-6">
      <TourTip />
      <ChapterWelcomeGuide
        chapterId={chapter?.id}
        chapterName={chapter?.name || 'your chapter'}
        empty={isEmptyChapter}
        actions={[
          {
            icon: Sparkles,
            label: 'Set your theme for the year',
            description: 'Announce your vision — every chair\'s dashboard will echo it back.',
            to: '/settings',
          },
          {
            icon: Briefcase,
            label: 'Assign your chairs',
            description: 'Learning, Engagement, Finance — line up who owns what for the year.',
            to: '/president',
          },
          {
            icon: Wallet,
            label: 'Allocate the chapter budget',
            description: 'Split the FY budget across chair roles so each has something to spend.',
            to: '/budget',
          },
          {
            icon: UserPlus,
            label: 'Invite your chapter',
            description: 'Get members and staff into the system so the rest of the flywheel can turn.',
            to: '/admin/members',
          },
        ]}
      />
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
            <Wallet className="h-4 w-4" />
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

      {/* SAP Renewals rollup */}
      {activeSaps.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">SAP Renewals</h2>
            <Link to="/partners" className="text-xs text-primary hover:underline ml-auto inline-flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {SAP_RENEWAL_STATUSES.map(s => (
              <div key={s.id} className="rounded-lg border border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: s.color }}>{renewalCounts[s.id]}</p>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Not set</span>
              </div>
              <p className="text-xl font-bold text-muted-foreground">{renewalNotSet}</p>
            </div>
          </div>
          {atRiskSaps.length > 0 && (
            <div className="border-t px-6 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">At-risk partners</p>
              <ul className="space-y-1.5">
                {atRiskSaps.slice(0, 6).map(p => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate">{p.name}</span>
                    <SAPRenewalControl partner={p} readOnly size="md" />
                  </li>
                ))}
                {atRiskSaps.length > 6 && (
                  <li className="text-xs text-muted-foreground italic">
                    +{atRiskSaps.length - 6} more on the partners page
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

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
