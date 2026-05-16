import { useEffect, useMemo, useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { useChapter } from '@/lib/chapter'
import { useAuth } from '@/lib/auth'
import { useSAPStore } from '@/lib/sapStore'
import { hasPermission } from '@/lib/permissions'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, UserPlus, Mail, Phone, Sparkles } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'
import { saveMemberToContacts, saveMembersToContacts, isMobileDevice } from '@/lib/vcard'

// Chapter-wide directory.
//
// Audience matrix:
//   - Every viewer sees EO members + SAP contacts (SAPs are chapter
//     partners; their info is public-to-members like a phone book).
//   - SLPs (spouses / significant life partners) only render for
//     viewers with `canViewSLPsInDirectory` (SLP Chair, chapter staff,
//     super_admin). EO members never see SLP info — see
//     [[slp-privacy-boundary]].
//   - SAP-role users (sap_contact) don't access this directory at
//     all; they have their own portal and will get a separate
//     opted-in-only directory later.
//
// FUTURE: Key Executives are coming as a fourth population, likely
// under Engagement Chair scope. Not yet scoped in this page.

// Normalize different population row shapes into a single object the
// directory + vCard builder can consume uniformly.
function toDirectoryRow(raw, population, extras = {}) {
  // SLPs and SAP contacts only store the combined `name`. Split for
  // first-name sort and for vCard's structured N field.
  const fullName = (raw.name || '').trim()
  const nameParts = fullName.split(/\s+/)
  const first = raw.first_name || (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0]) || ''
  const last = raw.last_name || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '') || ''
  return {
    id: `${population}:${raw.id}`,
    population,
    name: fullName || `${first} ${last}`.trim() || 'Unknown',
    first_name: first,
    last_name: last,
    email: raw.email || '',
    phone: raw.phone || '',
    company: raw.company || extras.company || '',
    industry: raw.industry || '',
    forum: raw.forum || '',
    notes: raw.notes || '',
  }
}

const POPULATION_LABELS = {
  eo: 'EO Member',
  sap: 'SAP Contact',
  slp: 'SLP',
}

const POPULATION_SECTION_HEADINGS = {
  eo: 'EO Members',
  sap: 'SAPs',
  slp: 'SLPs',
}

const POPULATION_PILL_CLASS = {
  eo:  'bg-primary/15 text-primary',
  sap: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  slp: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
}

// Order sections render in when multiple populations are visible.
const POPULATION_ORDER = ['eo', 'sap', 'slp']

export default function MemberDirectoryPage() {
  const { chapterMembers } = useBoardStore()
  const { activeChapter, activeChapterId } = useChapter()
  const { effectiveRole } = useAuth()
  const { partners: sapPartners, contacts: sapContacts } = useSAPStore()
  const canSeeSLPs = hasPermission(effectiveRole, 'canViewSLPsInDirectory')

  const [search, setSearch] = useState('')
  const [forumFilter, setForumFilter] = useState('all')
  const [populationFilter, setPopulationFilter] = useState('all')
  const [slps, setSlps] = useState([])

  // Per-chapter "last sync" timestamp, kept in localStorage so the
  // banner can quietly nudge the user when N new members have joined
  // since they last refreshed their phone contacts. Per-device only
  // — no server table — which is fine for v1; if you sync on your
  // laptop and then open the page on your phone, the phone will
  // still pester you to re-sync there.
  const syncKey = activeChapterId ? `directory:lastSyncedAt:${activeChapterId}` : null
  const [lastSyncedAt, setLastSyncedAt] = useState(() => {
    if (typeof window === 'undefined' || !syncKey) return null
    try { return localStorage.getItem(syncKey) } catch { return null }
  })
  // Reload the stored timestamp when the active chapter changes (e.g.
  // a super_admin switching chapter context shouldn't carry one
  // chapter's sync time into another).
  useEffect(() => {
    if (typeof window === 'undefined' || !syncKey) { setLastSyncedAt(null); return }
    try { setLastSyncedAt(localStorage.getItem(syncKey)) } catch { setLastSyncedAt(null) }
  }, [syncKey])

  // Fetch SLPs only for roles that can see them. Regular members never
  // trigger this query — RLS would block it anyway, but keeping the
  // request gated keeps the network tab clean and avoids confusing
  // 403s in Sentry.
  useEffect(() => {
    let cancelled = false
    async function loadSLPs() {
      if (!canSeeSLPs || !isSupabaseConfigured() || !activeChapterId) {
        setSlps([])
        return
      }
      const { data, error } = await supabase
        .from('slps')
        .select('id, name, email, phone, forum, notes')
        .eq('chapter_id', activeChapterId)
      if (!cancelled) {
        if (error) console.error('Directory: load SLPs error', error)
        setSlps(data || [])
      }
    }
    loadSLPs()
    return () => { cancelled = true }
  }, [canSeeSLPs, activeChapterId])

  const chapterLabel = activeChapter?.name || 'Chapter'
  const onMobile = isMobileDevice()
  const bulkHelper = onMobile
    ? "Downloads one .vcf file. Open it, confirm once, and every contact appears in WhatsApp, Messages, and email autocomplete."
    : "Downloads one .vcf file. Import into Google Contacts (any browser), Apple Contacts (Mac), or the People app (Windows) — it'll sync to your phone, where WhatsApp, Messages, and email autocomplete pick everyone up."

  // Build the unified roster. EO + SAPs flow to everyone; SLPs only
  // to permitted viewers. Each SAP contact pulls its parent partner's
  // company for the contact card's ORG line.
  const allRows = useMemo(() => {
    const rows = []
    for (const m of (chapterMembers || [])) {
      if ((m.status || 'active') !== 'active') continue
      rows.push(toDirectoryRow(m, 'eo'))
    }
    const sapById = new Map((sapPartners || []).map(p => [p.id, p]))
    for (const c of (sapContacts || [])) {
      const parent = sapById.get(c.sap_id)
      // Hide contacts whose parent SAP is archived; active + prospect stay.
      if (parent && parent.status && parent.status !== 'active' && parent.status !== 'prospect') continue
      rows.push(toDirectoryRow(c, 'sap', { company: parent?.company || parent?.name || '' }))
    }
    if (canSeeSLPs) {
      for (const s of slps) {
        rows.push(toDirectoryRow(s, 'slp'))
      }
    }
    return rows
  }, [chapterMembers, sapContacts, sapPartners, slps, canSeeSLPs])

  // Forum options aggregated across whatever populations are loaded.
  const forumOptions = useMemo(() => {
    const set = new Set()
    let hasUnassigned = false
    for (const r of allRows) {
      const f = (r.forum || '').trim()
      if (f) set.add(f); else hasUnassigned = true
    }
    const list = [...set].sort((a, b) => a.localeCompare(b))
    if (hasUnassigned) list.push('__unassigned__')
    return list
  }, [allRows])

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows
      .filter(r => populationFilter === 'all' || r.population === populationFilter)
      .filter(r => {
        if (forumFilter === 'all') return true
        const f = (r.forum || '').trim()
        if (forumFilter === '__unassigned__') return !f
        return f.toLowerCase() === forumFilter.toLowerCase()
      })
      .filter(r => {
        if (!q) return true
        const hay = `${r.first_name} ${r.last_name} ${r.name} ${r.company} ${r.industry} ${r.email}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const aFirst = (a.first_name || a.name.split(' ')[0] || '').toLowerCase()
        const bFirst = (b.first_name || b.name.split(' ')[0] || '').toLowerCase()
        const byFirst = aFirst.localeCompare(bFirst)
        if (byFirst !== 0) return byFirst
        return (a.last_name || '').toLowerCase().localeCompare((b.last_name || '').toLowerCase())
      })
  }, [allRows, search, forumFilter, populationFilter])

  // Group visible rows by population so we can render section headers.
  const grouped = useMemo(() => {
    const buckets = { eo: [], sap: [], slp: [] }
    for (const r of visibleRows) buckets[r.population]?.push(r)
    return buckets
  }, [visibleRows])

  const populationCounts = useMemo(() => {
    const c = { eo: 0, sap: 0, slp: 0 }
    for (const r of allRows) c[r.population] = (c[r.population] || 0) + 1
    return c
  }, [allRows])

  // What populations are actually represented in the current visible
  // set? Drives the bulk-button label and the section-header logic.
  const visiblePopulations = POPULATION_ORDER.filter(p => grouped[p].length > 0)

  // Smart bulk-button label: tell the user exactly what they're about
  // to download. "Download All Contacts" is the default; if SAPs
  // and/or SLPs are part of the mix, the label spells that out.
  const downloadLabel = (() => {
    if (visibleRows.length === 0) return 'Download All Contacts'
    if (visiblePopulations.length === 1) {
      const only = visiblePopulations[0]
      if (only === 'eo') return 'Download All Members'
      if (only === 'sap') return 'Download All SAPs'
      if (only === 'slp') return 'Download All SLPs'
    }
    const extras = visiblePopulations.filter(p => p !== 'eo')
    if (extras.length === 0) return 'Download All Contacts'
    if (extras.length === 1) {
      const which = extras[0] === 'sap' ? 'all SAPs' : 'all SLPs'
      return `Download All Contacts (includes ${which})`
    }
    return 'Download All Contacts (includes SAPs and SLPs)'
  })()

  // EO members that joined since the user last synced. Drives the
  // "X new members" banner. SAPs and SLPs are out of scope for the
  // banner — the typical re-sync trigger is "someone joined the
  // chapter," not "a partner was added." Easy to extend later.
  const newMembersSinceSync = useMemo(() => {
    if (!lastSyncedAt) return []
    const cutoff = new Date(lastSyncedAt).getTime()
    if (Number.isNaN(cutoff)) return []
    return (chapterMembers || [])
      .filter(m => (m.status || 'active') === 'active')
      .filter(m => {
        const created = m.created_at ? new Date(m.created_at).getTime() : 0
        return created > cutoff
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [chapterMembers, lastSyncedAt])

  const markSyncedNow = () => {
    if (typeof window === 'undefined' || !syncKey) return
    const now = new Date().toISOString()
    try { localStorage.setItem(syncKey, now) } catch { /* ignore */ }
    setLastSyncedAt(now)
  }

  const handleDownloadAll = () => {
    const tag = populationFilter === 'all'
      ? chapterLabel
      : `${chapterLabel} — ${POPULATION_LABELS[populationFilter] || populationFilter}`
    saveMembersToContacts(visibleRows, {
      filename: `${tag.replace(/\s+/g, '_')}_contacts`,
      chapterLabel: tag,
    })
    markSyncedNow()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directory"
        subtitle={canSeeSLPs
          ? `Browse ${chapterLabel} members, SAPs, and SLPs — and save them to your phone's contacts.`
          : `Browse ${chapterLabel} members and SAPs — and save them to your phone's contacts.`}
      />

      {/* "X new members since your last download" nudge. Only renders
          when the user has previously synced AND new members have
          joined since. Tapping Download All Contacts (below) clears
          it. */}
      {newMembersSinceSync.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {newMembersSinceSync.length} new {newMembersSinceSync.length === 1 ? 'member' : 'members'} since your last download
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                {newMembersSinceSync.slice(0, 5).map(m => m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim()).filter(Boolean).join(', ')}
                {newMembersSinceSync.length > 5 ? `, and ${newMembersSinceSync.length - 5} more` : ''}.
                {' '}Tap <strong>{downloadLabel}</strong> below to refresh your phone contacts.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Save {visibleRows.length} contact{visibleRows.length === 1 ? '' : 's'} to your phone
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {bulkHelper}
            </p>
            {lastSyncedAt && (
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                Last synced {new Date(lastSyncedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={visibleRows.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or industry"
            className="pl-9"
          />
        </div>
        <select
          value={populationFilter}
          onChange={(e) => setPopulationFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:w-48"
          title="Filter by population"
        >
          <option value="all">All populations</option>
          <option value="eo">EO members ({populationCounts.eo})</option>
          <option value="sap">SAPs ({populationCounts.sap})</option>
          {canSeeSLPs && (
            <option value="slp">SLPs ({populationCounts.slp})</option>
          )}
        </select>
        <select
          value={forumFilter}
          onChange={(e) => setForumFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:w-56"
          title="Filter by forum"
        >
          <option value="all">All forums</option>
          {forumOptions.map(f => (
            <option key={f} value={f}>
              {f === '__unassigned__' ? 'No forum assigned' : f}
            </option>
          ))}
        </select>
      </div>

      {visibleRows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 text-sm">
          {search || forumFilter !== 'all' || populationFilter !== 'all'
            ? 'Nothing matches the current filters.'
            : 'No contacts yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {visiblePopulations.map(pop => (
            <div key={pop} className="space-y-2">
              {/* Section header — only renders when more than one
                  population is visible. Single-population view stays
                  clean and headerless. */}
              {visiblePopulations.length > 1 && (
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {POPULATION_SECTION_HEADINGS[pop]}
                  </h2>
                  <span className="text-xs text-muted-foreground/60">
                    {grouped[pop].length}
                  </span>
                </div>
              )}
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-white/5">
                {grouped[pop].map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                        {/* Pill only on non-EO rows in single-section view; in
                            multi-section view the section header already tells
                            you which population you're in. */}
                        {visiblePopulations.length === 1 && r.population !== 'eo' && (
                          <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${POPULATION_PILL_CLASS[r.population]} shrink-0`}>
                            {POPULATION_LABELS[r.population]}
                          </span>
                        )}
                      </div>
                      {r.company && (
                        <div className="text-xs text-muted-foreground/70 truncate">{r.company}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground/70">
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-foreground/90">
                            <Mail className="h-3 w-3" /> Email
                          </a>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-foreground/90">
                            <Phone className="h-3 w-3" /> Call
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveMemberToContacts(r, {
                        chapterLabel: r.population === 'eo'
                          ? chapterLabel
                          : `${chapterLabel} — ${POPULATION_LABELS[r.population]}`,
                      })}
                      className="shrink-0"
                      title="Add to your phone's contacts"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
