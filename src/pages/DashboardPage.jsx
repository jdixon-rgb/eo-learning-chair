import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { formatCurrency, daysUntil, formatDate } from '@/lib/utils'
import { FISCAL_MONTHS, STRATEGIC_MAP, PIPELINE_STAGES, EVENT_TYPES, EVENT_FORMATS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  DollarSign,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Route,
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { chapter, events, speakers, budgetItems, totalEstimated, budgetRemaining } = useStore()
  const { activePresidentTheme, getChairBudget } = useBoardStore()

  const theme = activePresidentTheme || chapter.president_theme || ''
  const learningBudget = getChairBudget('learning') || chapter.total_budget || 0
  const remaining = learningBudget - totalEstimated

  // Next upcoming event
  const upcomingEvents = events
    .filter(e => e.status !== 'completed' && e.status !== 'cancelled' && e.event_date)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  const nextEvent = upcomingEvents[0]
  const daysToNext = nextEvent ? daysUntil(nextEvent.event_date) : null

  // Pipeline counts
  const pipelineCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: speakers.filter(s => s.pipeline_stage === stage.id).length,
  }))

  // Budget health
  const budgetPercent = learningBudget > 0 ? (totalEstimated / learningBudget) * 100 : 0
  const budgetHealth = budgetPercent > 90 ? 'critical' : budgetPercent > 75 ? 'warning' : 'healthy'
  const budgetColor = { critical: 'bg-eo-pink', warning: 'bg-eo-coral', healthy: 'bg-green-500' }[budgetHealth]

  // Events by month for mini arc
  const eventsByMonth = {}
  events.forEach(e => {
    if (e.month_index != null) eventsByMonth[e.month_index] = e
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            FY 2026-2027 &middot; Theme: "{theme}"
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/speakers')}>
            <Plus className="h-4 w-4" /> Add Speaker
          </Button>
          <Button size="sm" onClick={() => navigate('/events')}>
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Health */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <DollarSign className="h-4 w-4" />
            Budget Health
          </div>
          <p className="text-2xl font-bold">{formatCurrency(remaining)}</p>
          <p className="text-xs text-muted-foreground mt-1">remaining of {formatCurrency(learningBudget)}</p>
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${budgetColor} transition-all`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{budgetPercent.toFixed(0)}% allocated</p>
        </div>

        {/* Next Event */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            Next Event
          </div>
          {nextEvent ? (
            <>
              <p className="text-lg font-semibold leading-tight">{nextEvent.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatDate(nextEvent.event_date)}</p>
              {daysToNext !== null && (
                <Badge variant={daysToNext <= 14 ? 'coral' : 'blue'} className="mt-2">
                  {daysToNext <= 0 ? 'Today!' : `${daysToNext} days away`}
                </Badge>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          )}
        </div>

        {/* Pipeline Summary */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="h-4 w-4" />
            Speaker Pipeline
          </div>
          <p className="text-2xl font-bold">{speakers.filter(s => s.pipeline_stage !== 'passed').length}</p>
          <p className="text-xs text-muted-foreground mt-1">active speakers</p>
          <div className="flex gap-1 mt-3">
            {pipelineCounts.map(stage => (
              <div key={stage.id} className="flex-1 text-center">
                <div className="text-sm font-semibold" style={{ color: stage.color }}>{stage.count}</div>
                <div className="text-[10px] text-muted-foreground truncate">{stage.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Overview */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            Events Planned
          </div>
          <p className="text-2xl font-bold">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">across 12 months</p>
          <div className="flex gap-1 mt-3">
            {EVENT_TYPES.map(type => {
              const count = events.filter(e => e.event_type === type.id).length
              return (
                <div key={type.id} className="flex-1 text-center">
                  <div className="text-sm font-semibold" style={{ color: type.color }}>{count}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{type.label.split(' ')[0]}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Year Arc Mini View */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-eo-coral" />
            <h2 className="text-sm font-semibold">Year Arc — "{theme}"</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
            View Full Calendar <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {FISCAL_MONTHS.map((month, i) => {
            const strategic = STRATEGIC_MAP[i]
            const event = eventsByMonth[i]
            return (
              <div key={i} className="text-center">
                <div className={`text-[9px] font-bold px-1 py-0.5 rounded-t ${strategic.color} ${strategic.textColor}`}>
                  {strategic.label}
                </div>
                <div
                  className={`border rounded-b px-1 py-2 text-xs cursor-pointer hover:bg-accent transition-colors ${
                    event ? 'border-eo-blue bg-blue-50' : 'border-border'
                  }`}
                  onClick={() => event ? navigate(`/events/${event.id}`) : navigate('/calendar')}
                >
                  <div className="font-medium">{month.shortName}</div>
                  {event ? (
                    <div className="mt-1 text-[10px] text-eo-blue font-medium truncate">{event.title.split(':')[0]}</div>
                  ) : (
                    <div className="mt-1 text-[10px] text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Speakers */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Speaker Pipeline Activity</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/speakers')}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {speakers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No speakers yet. Start building your pipeline.</p>
          ) : (
            <div className="space-y-2">
              {speakers.filter(s => s.pipeline_stage !== 'passed').slice(0, 4).map(speaker => (
                <div key={speaker.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{speaker.name}</p>
                    <p className="text-xs text-muted-foreground">{speaker.topic}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {speaker.fee_range_low ? (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(speaker.fee_range_low)}–{formatCurrency(speaker.fee_range_high)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">TBD</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {PIPELINE_STAGES.find(s => s.id === speaker.pipeline_stage)?.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget by Category */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Budget Allocation</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/budget')}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {budgetItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget items yet.</p>
          ) : (
            <div className="space-y-2">
              {['speaker_fee', 'food_beverage', 'venue_rental', 'av_production'].map(cat => {
                const catItems = budgetItems.filter(b => b.category === cat)
                const total = catItems.reduce((s, b) => s + (b.estimated_amount || 0), 0)
                const pct = totalEstimated > 0 ? (total / totalEstimated) * 100 : 0
                const labels = { speaker_fee: 'Speaker Fees', food_beverage: 'F&B', venue_rental: 'Venue', av_production: 'AV Production' }
                const colors = { speaker_fee: 'bg-eo-blue', food_beverage: 'bg-eo-pink', venue_rental: 'bg-eo-coral', av_production: 'bg-purple-500' }
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{labels[cat]}</span>
                      <span className="font-medium">{formatCurrency(total)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[cat]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
