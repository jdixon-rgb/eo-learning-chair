import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChapter } from '@/lib/chapter'
import { Building2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/lib/pageHeader'
import ActivityIndicator from '@/components/ActivityIndicator'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Roles we surface on the chapter card. Everyone here is a chair-style
// assignment whose sign-in cadence actually tells us something about
// the chapter's health. Ordered deliberately: leadership first, then
// chair roles, then chapter staff.
const CARD_ROLES = [
  { id: 'president', label: 'President' },
  { id: 'learning_chair', label: 'Learning Chair' },
  { id: 'engagement_chair', label: 'Engagement Chair' },
  { id: 'sap_chair', label: 'SAP Chair' },
  { id: 'finance_chair', label: 'Finance Chair' },
  { id: 'chapter_executive_director', label: 'Executive Director' },
  { id: 'chapter_experience_coordinator', label: 'Experience Coordinator' },
]
const CARD_ROLE_IDS = CARD_ROLES.map(r => r.id)
const CARD_ROLE_ORDER = new Map(CARD_ROLES.map((r, i) => [r.id, i]))

export default function SuperAdminDashboard() {
  const { allChapters } = useChapter()
  const [chairsByChapter, setChairsByChapter] = useState({})

  useEffect(() => {
    if (!isSupabaseConfigured() || allChapters.length === 0) return
    let cancelled = false
    async function load() {
      const ids = allChapters.map(c => c.id)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, chapter_id, last_sign_in_at')
        .in('chapter_id', ids)
        .in('role', CARD_ROLE_IDS)
      if (cancelled) return
      const grouped = {}
      for (const p of data || []) {
        if (!grouped[p.chapter_id]) grouped[p.chapter_id] = []
        grouped[p.chapter_id].push(p)
      }
      for (const arr of Object.values(grouped)) {
        arr.sort((a, b) => (CARD_ROLE_ORDER.get(a.role) ?? 99) - (CARD_ROLE_ORDER.get(b.role) ?? 99))
      }
      setChairsByChapter(grouped)
    }
    load()
    return () => { cancelled = true }
  }, [allChapters])

  // Group chapters by region, alphabetically within each group.
  // Untagged chapters cluster under a sentinel so the super-admin can
  // see at a glance which chapters still need a region.
  const regionGroups = useMemo(() => {
    const groups = new Map()
    for (const ch of allChapters) {
      const key = ch.region || '— No region set —'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(ch)
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      // "No region set" always last
      if (a === '— No region set —') return 1
      if (b === '— No region set —') return -1
      return a.localeCompare(b)
    })
    return sortedKeys.map(k => ({ region: k, chapters: groups.get(k) }))
  }, [allChapters])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Platform Administration"
          subtitle={`${allChapters.length} chapter${allChapters.length !== 1 ? 's' : ''} on the platform`}
        />
        <Link to="/super-admin/chapters/new" className="ml-auto">
          <Button>
            <Plus className="h-4 w-4" />
            Create Chapter
          </Button>
        </Link>
      </div>

      {allChapters.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No chapters yet. Create one to get started.</p>
        </div>
      )}

      {regionGroups.map(({ region, chapters }) => (
        <section key={region} className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {region}
            </h2>
            <span className="text-xs text-muted-foreground">
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map((chapter) => {
              const chairs = chairsByChapter[chapter.id] || []
              return (
                <Link
                  key={chapter.id}
                  to={`/super-admin/chapters/${chapter.id}`}
                  className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                        {chapter.name}
                      </h3>
                      {chapter.president_theme && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {chapter.president_theme}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="text-sm font-bold">
                        {MONTH_NAMES[chapter.fiscal_year_start] || 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">FY Start</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="text-sm font-bold">{chairs.length}</p>
                      <p className="text-[10px] text-muted-foreground">Chair{chairs.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  {chairs.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {chairs.map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{c.full_name || c.email}</p>
                            <p className="text-muted-foreground truncate">
                              {CARD_ROLES.find(r => r.id === c.role)?.label || c.role}
                            </p>
                          </div>
                          <ActivityIndicator lastSignInAt={c.last_sign_in_at} />
                        </div>
                      ))}
                    </div>
                  )}

                  {chairs.length === 0 && (
                    <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      No chairs assigned yet
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
