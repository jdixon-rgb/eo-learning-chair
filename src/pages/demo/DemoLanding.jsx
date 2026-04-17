// Demo landing — the single canonical page for anyone browsing in Mock Mode.
//
// A persona switcher pins at the top: click an avatar → the body re-renders as
// that persona's surface. Routes under /demo/:personaId. Default is Julie
// (Regional Learning Chair — the flagship persona this whole feature was
// scoped around).
//
// Every mutation button is disabled on purpose: this is read-only for v0.1.
// We'll upgrade to a click-through sandbox in v1.0 if the demo calls for it.

import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import {
  MOCK_PERSONAS,
  MOCK_CHAPTERS,
  MOCK_REGIONS,
  MOCK_EVENT_FEEDBACK,
  MOCK_SPEAKERS,
  HEALTH_COLOR,
} from '@/lib/mockFixtures'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell, TrendingUp, TrendingDown, DollarSign, Users, Calendar,
  AlertTriangle, Lock, Sparkles, ArrowRight,
} from 'lucide-react'

// ── Read-only mutation guard: every "Save" / "Notify" button routes through this
function showDemoToast(message) {
  // Simple alert for v0.1; replace with toast system in v1.0.
  window.alert(`DEMO MODE — ${message}\n\nIn production, this would actually happen. Nothing was persisted.`)
}

// ── Persona switcher ─────────────────────────────────────────────────
function PersonaSwitcher({ activeId }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-eo-pink" />
        <h2 className="text-sm font-semibold">Demo Personas</h2>
        <span className="text-xs text-muted-foreground">— click any to switch into their view</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {MOCK_PERSONAS.map(p => {
          const isActive = p.id === activeId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/demo/${p.id}`)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                isActive
                  ? 'border-eo-blue bg-eo-blue/5 shadow-sm ring-1 ring-eo-blue'
                  : 'border-border bg-background hover:border-eo-blue/40 hover:bg-accent'
              }`}
            >
              <span className="text-2xl leading-none">{p.avatar_emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.role_label}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Global tier (Marcus) ─────────────────────────────────────────────
function GlobalBody() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Learning Chair Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Three regions · 45 chapters total · v0.1 shows US West rolled up; other regions coming in v1.0
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOCK_REGIONS.map(region => (
          <div key={region.id} className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">{region.name}</h3>
            <p className="text-2xl font-bold mt-2">{region.chapter_count}</p>
            <p className="text-xs text-muted-foreground">chapters</p>
            {region.id === 'region-us-west' && (
              <Badge variant="coral" className="mt-3 text-xs">
                1 chapter needs attention
              </Badge>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Demo placeholder</p>
            <p className="mt-1">The polished v1.0 Global view will show cross-region NPS trends, top/bottom chapters across all regions, and which Regional Learning Chairs are actively coaching. For today's demo, click the <strong>Julie Broad</strong> persona above to see the regional rollup in full detail.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Regional tier (Julie) — the flagship view ────────────────────────
function RegionalBody() {
  const handleNotify = useCallback((chapterName, chairName) => {
    showDemoToast(`Would send an in-app notification to ${chairName} (Learning Chair, ${chapterName}) with your coaching note.`)
  }, [])

  const strugglingCount = MOCK_CHAPTERS.filter(c => c.health === 'struggling').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Regional Learning Chair — US West</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Coaching 15 chapters across the region · FY 2026–2027
          </p>
        </div>
        {strugglingCount > 0 && (
          <Badge variant="destructive" className="self-start">
            <AlertTriangle className="h-3 w-3" />
            {strugglingCount} chapter{strugglingCount !== 1 ? 's' : ''} need attention
          </Badge>
        )}
      </div>

      {/* Region-wide summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            Region NPS Avg
          </div>
          <p className="text-2xl font-bold">49</p>
          <p className="text-xs text-muted-foreground mt-1">across 15 chapters · trending down</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            Regional Budget Utilization
          </div>
          <p className="text-2xl font-bold">71%</p>
          <p className="text-xs text-muted-foreground mt-1">of FY budget allocated</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            Active Learning Chairs
          </div>
          <p className="text-2xl font-bold">15</p>
          <p className="text-xs text-muted-foreground mt-1">1 role transition in progress</p>
        </div>
      </div>

      {/* Chapter cards — the core coaching surface */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Chapters · sorted by need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...MOCK_CHAPTERS].sort((a, b) => a.nps_avg - b.nps_avg).map(chapter => {
            const colors = HEALTH_COLOR[chapter.health]
            const feedback = MOCK_EVENT_FEEDBACK[chapter.id] || []
            const worstFeedback = feedback.reduce(
              (acc, f) => (!acc || f.nps_score < acc.nps_score) ? f : acc,
              null,
            )
            const privateSpeaker = MOCK_SPEAKERS.find(s => s.chapter_id === chapter.id && s.fee_private)
            return (
              <div key={chapter.id} className={`rounded-xl border shadow-sm ${colors.bg}`}>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{chapter.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {chapter.learning_chair_name}
                      </p>
                    </div>
                    <Badge className={`text-xs ${colors.badge}`}>
                      {chapter.health === 'healthy' ? 'Healthy' : chapter.health === 'mid' ? 'Watch' : 'Needs Help'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">NPS Avg</p>
                      <p className={`text-xl font-bold ${colors.text}`}>{chapter.nps_avg}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget Used</p>
                      <p className={`text-xl font-bold ${colors.text}`}>{chapter.budget_used_pct}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pipeline</p>
                      <p className="text-sm font-semibold">{chapter.pipeline_count} speakers</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Events</p>
                      <p className="text-sm font-semibold">{chapter.events_planned} planned</p>
                    </div>
                  </div>

                  {worstFeedback && (
                    <div className="rounded-lg bg-white/70 p-3 border border-white">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Standout quote</p>
                      <p className="text-xs italic leading-snug">"{worstFeedback.highlight_quote}"</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {worstFeedback.event_title} · NPS {worstFeedback.nps_score}
                      </p>
                    </div>
                  )}

                  {privateSpeaker && (
                    <div className="flex items-center gap-2 text-xs bg-eo-navy/5 rounded-lg px-3 py-2 border border-eo-navy/10">
                      <Lock className="h-3 w-3 text-eo-navy shrink-0" />
                      <span className="text-eo-navy">
                        Private fee visible to you: <strong>{privateSpeaker.name}</strong> —{' '}
                        {formatCurrency(privateSpeaker.actual_fee)}
                      </span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNotify(chapter.name, chapter.learning_chair_name)}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Notify {chapter.learning_chair_name.split(' ')[0]}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Chapter tier (Karl — President, Sarah — Learning Chair) ──────────
function ChapterBody({ persona }) {
  const navigate = useNavigate()
  const { setViewAsRole } = useAuth()
  const chapter = MOCK_CHAPTERS.find(c => c.id === persona.chapter_id) || MOCK_CHAPTERS[0]
  const feedback = MOCK_EVENT_FEEDBACK[chapter.id] || []
  const colors = HEALTH_COLOR[chapter.health]
  const speakers = MOCK_SPEAKERS.filter(s => s.chapter_id === chapter.id)

  const isPresident = persona.viewAsRole === 'president'
  const isPhoenix = chapter.id === 'mock-chapter-phoenix'

  const handleEnterChapter = () => {
    // Swap the super-admin's viewAsRole so the sidebar renders the correct
    // chair nav (president surface vs learning chair surface). Mock store
    // handles the data injection.
    setViewAsRole(persona.viewAsRole)
    navigate('/')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isPresident ? 'Chapter President Dashboard' : 'Chapter Learning Chair Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {chapter.name} · Theme: "{chapter.president_theme}" · President: {chapter.president_name}
          </p>
        </div>
        {isPhoenix && (
          <button
            type="button"
            onClick={handleEnterChapter}
            className="self-start inline-flex items-center gap-2 bg-eo-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-eo-blue/90 transition-colors shadow-sm"
          >
            Enter Full Chapter Surface
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={`rounded-xl border p-5 shadow-sm ${colors.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Chapter Health</h3>
          <Badge className={`text-xs ${colors.badge}`}>
            {chapter.health === 'healthy' ? 'Healthy' : chapter.health === 'mid' ? 'Watch' : 'Needs Help'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">NPS Avg</p>
            <p className={`text-2xl font-bold ${colors.text}`}>{chapter.nps_avg}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget Used</p>
            <p className={`text-2xl font-bold ${colors.text}`}>{chapter.budget_used_pct}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Speaker Pipeline</p>
            <p className="text-2xl font-bold">{chapter.pipeline_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Events Planned</p>
            <p className="text-2xl font-bold">{chapter.events_planned}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Events · Feedback</h3>
          </div>
          <div className="space-y-3">
            {feedback.map(f => (
              <div key={f.event_title} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{f.event_title}</p>
                  <Badge
                    variant={f.nps_score >= 60 ? 'success' : f.nps_score >= 40 ? 'coral' : 'destructive'}
                    className="text-xs shrink-0"
                  >
                    NPS {f.nps_score}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{f.event_date}</p>
                <p className="text-xs italic mt-2 text-foreground">"{f.highlight_quote}"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-semibold">Takeaway:</span> {f.takeaway}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Confirmed Speakers</h3>
          </div>
          <div className="space-y-2">
            {speakers.map(s => (
              <div key={s.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.topic}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(s.actual_fee)}</p>
                  {s.fee_private && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-eo-navy mt-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      Private
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Demo placeholder</p>
            <p className="mt-1">
              The polished v1.0 version will hand this persona the full chapter surface — Year Arc,
              full speaker pipeline, budget grid, and event detail pages — with mock data throughout.
              For the walkthrough today, focus on how chapter-level data connects to what Julie sees
              at the regional level when you click back to her persona.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function DemoLanding() {
  const { personaId } = useParams()
  const { setMockPersonaId } = useAuth()
  const persona = MOCK_PERSONAS.find(p => p.id === personaId)

  // Keep the auth-context persona in sync with whatever is in the URL. The
  // store watches this to know which chapter fixtures to inject.
  useEffect(() => {
    if (persona) setMockPersonaId(persona.id)
  }, [persona, setMockPersonaId])

  // If no persona slug or an unknown one, redirect to Julie (the default demo entry)
  if (!persona) {
    return <Navigate to="/demo/persona-julie" replace />
  }

  return (
    <div>
      <PersonaSwitcher activeId={persona.id} />
      {persona.tier === 'global' && <GlobalBody />}
      {persona.tier === 'regional' && <RegionalBody />}
      {persona.tier === 'chapter' && <ChapterBody persona={persona} />}
    </div>
  )
}
