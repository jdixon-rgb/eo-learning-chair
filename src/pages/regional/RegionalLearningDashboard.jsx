import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe2, Calendar, Users, Mic, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/lib/pageHeader'

// Dashboard for a Regional Learning Chair Expert. She oversees every
// Learning Chair in chapters tagged with her region — her "feed" is
// one card per chapter showing who the chair is, what events they've
// got lined up, and how deep their speaker pipeline runs.
//
// V1 is read-only and information-dense rather than interactive:
// the purpose of the surface is to make her feel like she's watching
// a region in motion. Later versions can add comment threads, peer
// comparison overlays, and broadcasts.
export default function RegionalLearningDashboard() {
  const { profile } = useAuth()
  const region = profile?.region || null

  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured() || !region) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)

      // All chapters in the region.
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, name, president_name, president_theme, region')
        .eq('region', region)
        .order('name')

      if (cancelled) return
      const chapterRows = chaptersData || []

      if (chapterRows.length === 0) {
        setChapters([])
        setLoading(false)
        return
      }

      const chapterIds = chapterRows.map(c => c.id)

      // Learning Chairs in those chapters (one per chapter, usually).
      const { data: chairs } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, chapter_id')
        .in('chapter_id', chapterIds)
        .eq('role', 'learning_chair')

      // Upcoming events across all those chapters.
      const today = new Date().toISOString().slice(0, 10)
      const { data: events } = await supabase
        .from('events')
        .select('id, title, event_date, status, chapter_id')
        .in('chapter_id', chapterIds)
        .gte('event_date', today)
        .order('event_date', { ascending: true })

      // Speaker pipeline across all those chapters (count only for V1).
      const { data: speakers } = await supabase
        .from('speakers')
        .select('id, chapter_id')
        .in('chapter_id', chapterIds)

      // Roll everything up into a per-chapter shape.
      const hydrated = chapterRows.map(ch => ({
        ...ch,
        learningChair: (chairs || []).find(c => c.chapter_id === ch.id) || null,
        upcomingEvents: (events || [])
          .filter(e => e.chapter_id === ch.id && e.status !== 'cancelled')
          .slice(0, 3),
        speakerCount: (speakers || []).filter(s => s.chapter_id === ch.id).length,
      }))

      if (!cancelled) {
        setChapters(hydrated)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [region])

  if (!region) {
    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader title="Regional Learning" subtitle="Setup pending" />
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Your account hasn't been assigned a region yet. Ask a super-admin
            to set your <code className="text-xs bg-muted px-1 rounded">region</code> field
            so your peer chapters can appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${region} — Learning`}
        subtitle={
          chapters.length === 0
            ? 'No chapters tagged with your region yet'
            : `${chapters.length} chapter${chapters.length === 1 ? '' : 's'} in your region`
        }
      />

      {loading && (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Loading regional view…
        </div>
      )}

      {!loading && chapters.length === 0 && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-warm/5 p-8 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">You're early, and that's a good thing</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                No chapters have been tagged with <strong>{region}</strong> yet, so
                your regional view is empty. As chapters get tagged with your region,
                this page will fill in automatically with each chapter's Learning Chair,
                their next planned events, and a read on their speaker pipeline. You'll
                be watching the region's Learning function in one place.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 mt-4">
            <p className="text-xs font-medium mb-2 text-muted-foreground">WHAT YOU'LL SEE HERE</p>
            <ul className="text-sm space-y-1.5">
              <li className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" />The Learning Chair for every chapter in {region}</li>
              <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" />Their next 3 upcoming events, at a glance</li>
              <li className="flex items-center gap-2"><Mic className="h-3.5 w-3.5 text-primary" />How deep each chapter's speaker pipeline runs</li>
            </ul>
          </div>
        </div>
      )}

      {!loading && chapters.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chapters.map(ch => (
            <div key={ch.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="font-semibold">{ch.name}</h3>
                  {ch.president_theme && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic truncate">
                      "{ch.president_theme}"
                    </p>
                  )}
                </div>
                <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                  <Globe2 className="h-4 w-4" />
                </div>
              </div>

              {/* Learning Chair */}
              <div className="rounded-lg bg-muted/50 p-3 mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Learning Chair</p>
                {ch.learningChair ? (
                  <div>
                    <p className="text-sm font-medium">{ch.learningChair.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{ch.learningChair.email}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No Learning Chair assigned yet</p>
                )}
              </div>

              {/* Speaker pipeline */}
              <div className="flex items-center gap-2 mb-4">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{ch.speakerCount}</strong> speaker{ch.speakerCount === 1 ? '' : 's'} in pipeline
                </span>
              </div>

              {/* Upcoming events */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Upcoming events</span>
                </div>
                {ch.upcomingEvents.length > 0 ? (
                  <ul className="space-y-1.5">
                    {ch.upcomingEvents.map(e => (
                      <li key={e.id} className="text-sm flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{formatDate(e.event_date)}</span>
                        <span className="truncate">{e.title || 'Untitled'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic pl-6">Nothing on the calendar yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
