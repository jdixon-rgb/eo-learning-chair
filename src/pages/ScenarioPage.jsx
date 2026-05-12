import { useState, useMemo, Fragment } from 'react'
import { useStore } from '@/lib/store'
import { useBoardStore } from '@/lib/boardStore'
import { FISCAL_MONTHS, STRATEGIC_MAP, BUDGET_CATEGORIES } from '@/lib/constants'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'
import { useFormatCurrency } from '@/lib/useFormatCurrency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Shuffle, Plus, Trash2, Wallet, Target, TrendingUp,
  Star, Check, X, Copy, ChevronDown,
} from 'lucide-react'

const STRATEGIC_WEIGHT = {
  kickoff: 3,
  momentum: 2,
  renewal_critical: 3,
  sustain: 2,
  strong_close: 3,
}

export default function ScenarioPage() {
  const {
    chapter, events, speakers, pipelineSpeakers, venues, budgetItems,
    scenarios, addScenario, updateScenario, deleteScenario, updateEvent,
  } = useStore()
  const { getChairBudget } = useBoardStore()
  const formatCurrency = useFormatCurrency()

  // Scenario Planner is a Learning Chair tool — budget anchors to the
  // chair's FY allocation, not the chapter total.
  const chairBudget = getChairBudget('learning')

  const [activeTab, setActiveTab] = useState('baseline')
  const [editingName, setEditingName] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [expandedEventId, setExpandedEventId] = useState(null)

  // Events sorted by month
  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99)),
    [events]
  )

  // Active speakers (exclude passed) — from current FY pipeline
  const activeSpeakers = useMemo(() =>
    pipelineSpeakers.filter(s => s.pipeline_stage !== 'passed'),
    [pipelineSpeakers]
  )

  // Venues sorted by name
  const sortedVenues = useMemo(() =>
    [...venues].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [venues]
  )

  // Get speaker fee estimate — prefer fee_estimated, fall back to midpoint of range
  const getSpeakerFee = (speaker) => {
    if (!speaker) return 0
    if (speaker.fee_estimated) return speaker.fee_estimated
    if (speaker.fee_range_low && speaker.fee_range_high) {
      return (speaker.fee_range_low + speaker.fee_range_high) / 2
    }
    return speaker.fee_range_low || speaker.fee_range_high || 0
  }

  // Calculate metrics for a set of overrides
  const calculateMetrics = (overrides = []) => {
    let totalSpeakerFee = 0
    let totalValue = 0
    let fitScoreSum = 0
    let fitScoreCount = 0
    const perEvent = []

    sortedEvents.forEach(event => {
      const override = overrides.find(o => o.event_id === event.id)
      const speakerId = override ? (override.speaker_id !== undefined ? override.speaker_id : event.speaker_id) : event.speaker_id
      const venueId = override ? (override.venue_id !== undefined ? override.venue_id : event.venue_id) : event.venue_id
      const speaker = speakerId ? (pipelineSpeakers.find(s => s.id === speakerId) || speakers.find(s => s.id === speakerId)) : null
      const venue = venueId ? venues.find(v => v.id === venueId) : null

      const fee = speaker ? getSpeakerFee(speaker) : 0
      const fitScore = speaker ? (speaker.fit_score || 0) : 0
      const weight = STRATEGIC_WEIGHT[event.strategic_importance] || 2
      const value = fitScore * weight
      const isSpeakerOverridden = override && override.speaker_id !== undefined && override.speaker_id !== event.speaker_id
      const isVenueOverridden = override && override.venue_id !== undefined && override.venue_id !== event.venue_id
      const isOverridden = isSpeakerOverridden || isVenueOverridden

      // Per-event line items (non-speaker costs)
      const eventLineItems = budgetItems.filter(b => b.event_id === event.id && b.category !== 'speaker_fee')
      const eventNonSpeakerCost = eventLineItems.reduce((sum, b) => sum + (b.budget_amount || 0), 0)
      const eventTotalCost = fee + eventNonSpeakerCost

      totalSpeakerFee += fee
      totalValue += value
      if (speaker && fitScore > 0) {
        fitScoreSum += fitScore
        fitScoreCount++
      }

      perEvent.push({ event, speaker, speakerId, venue, venueId, fee, fitScore, weight, value, isOverridden, isSpeakerOverridden, isVenueOverridden, eventLineItems, eventNonSpeakerCost, eventTotalCost })
    })

    const nonSpeakerCosts = budgetItems
      .filter(b => b.category !== 'speaker_fee')
      .reduce((sum, b) => sum + (b.budget_amount || 0), 0)

    const totalCost = totalSpeakerFee + nonSpeakerCosts
    const budgetRemaining = chairBudget - totalCost
    const avgFitScore = fitScoreCount > 0 ? (fitScoreSum / fitScoreCount) : 0
    const valueIndex = totalSpeakerFee > 0 ? Math.round((totalValue / totalSpeakerFee) * 10000) : 0

    return { totalSpeakerFee, nonSpeakerCosts, totalCost, budgetRemaining, avgFitScore, totalValue, valueIndex, perEvent }
  }

  const baselineMetrics = calculateMetrics([])
  const activeScenario = activeTab !== 'baseline' ? scenarios.find(s => s.id === activeTab) : null
  const activeMetrics = activeScenario ? calculateMetrics(activeScenario.overrides || []) : null
  const currentMetrics = activeMetrics || baselineMetrics

  const handleCreateScenario = () => {
    const newScenario = addScenario({
      name: `Scenario ${scenarios.length + 1}`,
      overrides: [],
    })
    setActiveTab(newScenario.id)
  }

  const handleDuplicateScenario = (scenario) => {
    const newScenario = addScenario({
      name: `${scenario.name} (copy)`,
      overrides: [...(scenario.overrides || [])],
    })
    setActiveTab(newScenario.id)
  }

  const handleOverride = (eventId, field, value) => {
    if (!activeScenario) return
    const overrides = [...(activeScenario.overrides || [])]
    const existing = overrides.findIndex(o => o.event_id === eventId)
    const baseEvent = events.find(e => e.id === eventId)

    const current = existing >= 0 ? { ...overrides[existing] } : { event_id: eventId }
    current[field] = value || null

    // If both fields are back to baseline, remove the override entirely
    const speakerBack = (current.speaker_id ?? null) === (baseEvent?.speaker_id ?? null)
    const venueBack = (current.venue_id ?? null) === (baseEvent?.venue_id ?? null)
    const speakerUntouched = current.speaker_id === undefined
    const venueUntouched = current.venue_id === undefined

    if ((speakerBack || speakerUntouched) && (venueBack || venueUntouched)) {
      if (existing >= 0) overrides.splice(existing, 1)
    } else {
      if (existing >= 0) overrides[existing] = current
      else overrides.push(current)
    }

    updateScenario(activeScenario.id, { overrides })
  }

  const handleApplyScenario = () => {
    if (!activeScenario || !activeScenario.overrides?.length) return
    if (!window.confirm(`Apply "${activeScenario.name}" to your live plan? This will update speaker assignments for ${activeScenario.overrides.length} event(s).`)) return

    activeScenario.overrides.forEach(({ event_id, speaker_id, venue_id }) => {
      const updates = {}
      if (speaker_id !== undefined) updates.speaker_id = speaker_id || null
      if (venue_id !== undefined) updates.venue_id = venue_id || null
      if (Object.keys(updates).length > 0) updateEvent(event_id, updates)
    })
  }

  const handleDeleteScenario = (scenarioId) => {
    if (!window.confirm('Delete this scenario?')) return
    if (activeTab === scenarioId) setActiveTab('baseline')
    deleteScenario(scenarioId)
  }

  return (
    <div className="space-y-6">
      <TourTip />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <PageHeader
          title="Scenario Planner"
          subtitle={`Model different speaker combinations to maximize value within your ${formatCurrency(chairBudget)} budget.`}
        />
        <Button onClick={handleCreateScenario} size="sm" className="sm:ml-auto">
          <Plus className="h-4 w-4 mr-1" /> New Scenario
        </Button>
      </div>

      {/* Scenario Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('baseline')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'baseline'
              ? 'bg-ink text-white'
              : 'bg-secondary text-foreground hover:bg-accent'
          }`}
        >
          Current Plan
        </button>
        {scenarios.map(scenario => (
          <div key={scenario.id} className="flex items-center gap-0.5">
            {editingName === scenario.id ? (
              <input
                className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-primary bg-white outline-none w-40"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onBlur={() => {
                  if (nameDraft.trim()) updateScenario(scenario.id, { name: nameDraft.trim() })
                  setEditingName(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.target.blur()
                  if (e.key === 'Escape') setEditingName(null)
                }}
                autoFocus
              />
            ) : (
              <button
                onClick={() => setActiveTab(scenario.id)}
                onDoubleClick={() => { setEditingName(scenario.id); setNameDraft(scenario.name) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === scenario.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                {scenario.name}
                {(scenario.overrides || []).length > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({scenario.overrides.length} change{scenario.overrides.length !== 1 ? 's' : ''})
                  </span>
                )}
              </button>
            )}
            {activeTab === scenario.id && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleDuplicateScenario(scenario)}
                  className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                  title="Duplicate scenario"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteScenario(scenario.id)}
                  className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                  title="Delete scenario"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {scenarios.length === 0 && (
          <p className="text-xs text-muted-foreground italic ml-2">
            Create a scenario to model alternative speaker combinations
          </p>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Costs"
          value={formatCurrency(currentMetrics.totalCost)}
          subtitle={`${formatCurrency(currentMetrics.totalSpeakerFee)} speakers + ${formatCurrency(currentMetrics.nonSpeakerCosts)} other`}
          icon={<Wallet className="h-4 w-4" />}
          diff={activeMetrics ? currentMetrics.totalCost - baselineMetrics.totalCost : null}
          diffFormat="currency"
          diffInverted
        />
        <MetricCard
          label="Budget Remaining"
          value={formatCurrency(currentMetrics.budgetRemaining)}
          subtitle={`${formatCurrency(currentMetrics.totalCost)} allocated`}
          icon={<Target className="h-4 w-4" />}
          color={currentMetrics.budgetRemaining < 0 ? 'text-destructive' : currentMetrics.budgetRemaining < 50000 ? 'text-warm' : 'text-green-600'}
          diff={activeMetrics ? currentMetrics.budgetRemaining - baselineMetrics.budgetRemaining : null}
          diffFormat="currency"
        />
        <MetricCard
          label="Avg Fit Score"
          value={currentMetrics.avgFitScore.toFixed(1)}
          subtitle={`${currentMetrics.totalValue} total value points`}
          icon={<Star className="h-4 w-4" />}
          diff={activeMetrics ? currentMetrics.avgFitScore - baselineMetrics.avgFitScore : null}
          diffFormat="number"
        />
        <MetricCard
          label="Value Index"
          value={currentMetrics.valueIndex.toLocaleString()}
          subtitle="value pts per $10K speaker spend"
          icon={<TrendingUp className="h-4 w-4" />}
          diff={activeMetrics ? currentMetrics.valueIndex - baselineMetrics.valueIndex : null}
          diffFormat="number"
        />
      </div>

      {/* Speaker Fee Ratio vs Target */}
      {chairBudget > 0 && (() => {
        const targetPct = chapter.speaker_fee_target_pct ?? 50
        const actualPct = Math.round((currentMetrics.totalSpeakerFee / chairBudget) * 100)
        const diff = actualPct - targetPct
        const isOver = diff > 0
        const isClose = Math.abs(diff) <= 5
        const barColor = isClose ? 'bg-green-500' : isOver ? 'bg-destructive' : 'bg-primary'
        const targetLeft = `${Math.min(targetPct, 100)}%`

        return (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Speaker Fee Ratio</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={`font-bold ${isClose ? 'text-green-600' : isOver ? 'text-destructive' : 'text-primary'}`}>
                  {actualPct}%
                </span>
                <span className="text-muted-foreground">
                  of {formatCurrency(chairBudget)} budget
                </span>
              </div>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${Math.min(actualPct, 100)}%` }}
              />
              {/* Target marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/70"
                style={{ left: targetLeft }}
                title={`Target: ${targetPct}%`}
              />
              <div
                className="absolute -top-5 text-[10px] font-medium text-foreground/70 -translate-x-1/2"
                style={{ left: targetLeft }}
              >
                {targetPct}%
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(currentMetrics.totalSpeakerFee)} in speaker fees</span>
              <span className={isClose ? 'text-green-600' : isOver ? 'text-destructive' : 'text-primary'}>
                {isClose ? 'On target' : isOver ? `${diff}pp over target` : `${Math.abs(diff)}pp under target`}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Event Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Month</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Event</th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground">Audience</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground min-w-[200px]">Speaker</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground min-w-[180px]">Venue</th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground">Est. Cost</th>
                <th className="p-3 text-center text-xs font-medium text-muted-foreground">Fit</th>
                <th className="p-3 text-center text-xs font-medium text-muted-foreground">Wt</th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {currentMetrics.perEvent.map(({ event, speaker, speakerId, venue, venueId, fee, fitScore, weight, value, isOverridden, isSpeakerOverridden, isVenueOverridden, eventLineItems, eventTotalCost }) => {
                const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
                const strategic = event.month_index != null ? STRATEGIC_MAP[event.month_index] : null
                const isExpanded = expandedEventId === event.id
                const hasLineItems = eventLineItems.length > 0

                return (
                  <Fragment key={event.id}>
                  <tr
                    className={`border-b last:border-0 transition-colors ${isOverridden ? 'bg-primary/5' : ''}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{month?.shortName || '—'}</span>
                        {strategic && strategic.label !== 'NO EVENT' && (
                          <Badge className={`${strategic.color} ${strategic.textColor} text-[8px] px-1 py-0 leading-tight`}>
                            {strategic.label}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm truncate block max-w-[180px]">{event.title}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`text-sm ${event.expected_attendance ? '' : 'text-muted-foreground'}`}>
                        {event.expected_attendance ?? '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      {activeScenario ? (
                        <Select
                          value={speakerId || ''}
                          onChange={e => handleOverride(event.id, 'speaker_id', e.target.value || null)}
                          className={`text-xs h-8 ${isSpeakerOverridden ? 'border-primary bg-primary/10 font-medium' : ''}`}
                        >
                          <option value="">No speaker</option>
                          {activeSpeakers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.fee_range_low ? formatCurrency(getSpeakerFee(s)) : 'TBD'}) {s.fit_score ? `★${s.fit_score}` : ''}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className={`text-sm ${speaker ? '' : 'text-muted-foreground italic'}`}>
                          {speaker ? speaker.name : 'No speaker'}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {activeScenario ? (
                        <Select
                          value={venueId || ''}
                          onChange={e => handleOverride(event.id, 'venue_id', e.target.value || null)}
                          className={`text-xs h-8 ${isVenueOverridden ? 'border-primary bg-primary/10 font-medium' : ''}`}
                        >
                          <option value="">No venue</option>
                          {sortedVenues.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}{v.capacity ? ` (cap. ${v.capacity})` : ''}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className={`text-sm ${venue ? '' : 'text-muted-foreground italic'}`}>
                          {venue ? venue.name : 'No venue'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className={`inline-flex items-center gap-1 text-sm font-medium cursor-pointer hover:text-primary transition-colors ${isOverridden ? 'text-primary' : ''}`}
                      >
                        {eventTotalCost > 0 ? formatCurrency(eventTotalCost) : '—'}
                        {(hasLineItems || fee > 0) && eventTotalCost > 0 && (
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      {fitScore > 0 ? (
                        <span className={`text-sm ${fitScore >= 9 ? 'text-green-600 font-semibold' : fitScore >= 7 ? '' : 'text-warm'}`}>
                          {fitScore}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-xs text-muted-foreground">&times;{weight}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm font-medium">{value > 0 ? value : '—'}</span>
                    </td>
                  </tr>
                  {isExpanded && eventTotalCost > 0 && (
                    <tr key={`${event.id}-details`} className="border-b bg-muted/20">
                      <td colSpan={9} className="px-6 py-3">
                        <div className="space-y-1.5">
                          {fee > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3d46f2' }} />
                                <span>Speaker Fee</span>
                              </div>
                              <span className="font-medium">{formatCurrency(fee)}</span>
                            </div>
                          )}
                          {eventLineItems.map(item => {
                            const cat = BUDGET_CATEGORIES.find(c => c.id === item.category)
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color || '#a3a3c2' }} />
                                  <span>{item.description || cat?.label || item.category}</span>
                                </div>
                                <span className="font-medium">{formatCurrency(item.budget_amount || 0)}</span>
                              </div>
                            )
                          })}
                          <div className="flex items-center justify-between text-xs font-semibold pt-1.5 border-t border-border/50">
                            <span>Event Total</span>
                            <span>{formatCurrency(eventTotalCost)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={5} className="p-3 text-sm">
                  Totals
                  <span className="font-normal text-xs text-muted-foreground ml-2">
                    ({currentMetrics.perEvent.filter(e => e.speaker).length} speakers across {sortedEvents.length} events)
                  </span>
                </td>
                <td className="p-3 text-right text-sm">{formatCurrency(currentMetrics.totalCost)}</td>
                <td className="p-3 text-center text-sm">{currentMetrics.avgFitScore.toFixed(1)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-sm">{currentMetrics.totalValue}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Apply Scenario */}
      {activeScenario && (activeScenario.overrides || []).length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div>
            <p className="text-sm font-semibold">Ready to apply &ldquo;{activeScenario.name}&rdquo;?</p>
            <p className="text-xs text-muted-foreground">
              This will update {activeScenario.overrides.length} event(s) with the scenario&rsquo;s speaker assignments.
            </p>
          </div>
          <Button onClick={handleApplyScenario} size="sm" className="shrink-0">
            <Check className="h-4 w-4 mr-1" /> Apply to Live Plan
          </Button>
        </div>
      )}

      {/* Comparison vs Baseline */}
      {activeMetrics && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Comparison vs Current Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <ComparisonItem
              label="Total Costs"
              baseline={baselineMetrics.totalCost}
              scenario={activeMetrics.totalCost}
              format="currency"
              inverted
            />
            <ComparisonItem
              label="Budget Remaining"
              baseline={baselineMetrics.budgetRemaining}
              scenario={activeMetrics.budgetRemaining}
              format="currency"
            />
            <ComparisonItem
              label="Avg Fit Score"
              baseline={baselineMetrics.avgFitScore}
              scenario={activeMetrics.avgFitScore}
              format="decimal"
            />
            <ComparisonItem
              label="Value Index"
              baseline={baselineMetrics.valueIndex}
              scenario={activeMetrics.valueIndex}
              format="number"
            />
            {chairBudget > 0 && (
              <ComparisonItem
                label="Speaker Fee %"
                baseline={Math.round((baselineMetrics.totalSpeakerFee / chairBudget) * 100)}
                scenario={Math.round((activeMetrics.totalSpeakerFee / chairBudget) * 100)}
                format="pct"
                target={chapter.speaker_fee_target_pct ?? 50}
                inverted
              />
            )}
          </div>
        </div>
      )}

      {/* How It Works */}
      {scenarios.length === 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">How the Scenario Planner Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">1</div>
              <div>
                <p className="font-medium text-foreground">Create a scenario</p>
                <p className="text-xs mt-0.5">Click &ldquo;New Scenario&rdquo; to start modeling an alternative lineup.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">2</div>
              <div>
                <p className="font-medium text-foreground">Swap speakers</p>
                <p className="text-xs mt-0.5">Use the dropdowns to try different speakers for each event slot.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">3</div>
              <div>
                <p className="font-medium text-foreground">Compare & apply</p>
                <p className="text-xs mt-0.5">See how costs, fit scores, and value change. Apply the best scenario to your live plan.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
            <strong className="text-foreground">Value scoring:</strong> Each event has a strategic weight (Kickoff/Renewal &times;3, Momentum/Sustain &times;2).
            Value = Fit Score &times; Weight. The <strong className="text-foreground">Value Index</strong> measures value points per $10K of speaker spend - higher is better.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper Components ────────────────────────────────

function MetricCard({ label, value, subtitle, icon, color, diff, diffFormat, diffInverted }) {
  const getDiffText = () => {
    if (diff === null || diff === undefined) return null
    const abs = Math.abs(diff)
    if (abs < 0.01) return null

    let text = ''
    if (diffFormat === 'currency') text = formatCurrency(abs)
    else if (diffFormat === 'number') text = abs.toFixed(abs < 10 ? 1 : 0)
    else text = abs.toString()

    const isGood = diffInverted ? diff < 0 : diff > 0
    const isBad = diffInverted ? diff > 0 : diff < 0

    return (
      <span className={`text-[10px] font-medium ${isGood ? 'text-green-600' : isBad ? 'text-destructive' : 'text-muted-foreground'}`}>
        {diff > 0 ? '\u25B2' : '\u25BC'} {text}
      </span>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
        {getDiffText()}
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

function ComparisonItem({ label, baseline, scenario, format, inverted, target }) {
  const diff = scenario - baseline

  const formatVal = (v) => {
    if (format === 'currency') return formatCurrency(v)
    if (format === 'decimal') return v.toFixed(1)
    if (format === 'pct') return `${v}%`
    return v.toLocaleString()
  }

  const isGood = inverted ? diff < 0 : diff > 0
  const isBad = inverted ? diff > 0 : diff < 0

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">{formatVal(baseline)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className={`text-sm font-semibold ${isGood ? 'text-green-600' : isBad ? 'text-destructive' : ''}`}>
          {formatVal(scenario)}
        </span>
      </div>
      {Math.abs(diff) > 0.01 && (
        <p className={`text-[10px] mt-0.5 ${isGood ? 'text-green-600' : isBad ? 'text-destructive' : 'text-muted-foreground'}`}>
          {diff > 0 ? '+' : ''}{formatVal(diff)}
        </p>
      )}
      {target != null && (
        <p className="text-[10px] mt-0.5 text-muted-foreground">
          target: {target}%
        </p>
      )}
    </div>
  )
}
