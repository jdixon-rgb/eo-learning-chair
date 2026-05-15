import { useEffect, useMemo, useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { useChapter } from '@/lib/chapter'
import { useAuth } from '@/lib/auth'
import { useSAPStore } from '@/lib/sapStore'
import { hasPermission } from '@/lib/permissions'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, UserPlus, Mail, Phone } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'
import { saveMemberToContacts, saveMembersToContacts, isMobileDevice } from '@/lib/vcard'

// Chapter-wide directory. Default audience (regular EO members) sees
// only fellow EO members. Roles with `canViewCrossPopulationDirectory`
// (SLP Chair, chapter staff, super_admin) also see SAP contacts and
// SLPs, with a Population filter to narrow down.
//
// The asymmetric privacy boundary: EO members never see SLP info —
// SLPs are the spouses of EO members and have a smaller, more
// trust-bounded audience by design.

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

const POPULATION_PILL_CLASS = {
  eo:  'bg-primary/15 text-primary',
  sap: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  slp: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
}

export default function MemberDirectoryPage() {
  const { chapterMembers } = useBoardStore()
  const { activeChapter, activeChapterId } = useChapter()
  const { effectiveRole } = useAuth()
  const { partners: sapPartners, contacts: sapContacts } = useSAPStore()
  const canViewCrossPop = hasPermission(effectiveRole, 'canViewCrossPopulationDirectory')

  const [search, setSearch] = useState('')
  const [forumFilter, setForumFilter] = useState('all')
  const [populationFilter, setPopulationFilter] = useState('all')
  const [slps, setSlps] = useState([])

  // Fetch SLPs only for roles that can see them. Regular members never
  // trigger this query — RLS would block it anyway, but keeping the
  // request gated keeps the network tab clean and avoids confusing
  // 403s in Sentry.
  useEffect(() => {
    let cancelled = false
    async function loadSLPs() {
      if (!canViewCrossPop || !isSupabaseConfigured() || !activeChapterId) {
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
  }, [canViewCrossPop, activeChapterId])

  const chapterLabel = activeChapter?.name || 'Chapter'
  const onMobile = isMobileDevice()
  const bulkHelper = onMobile
    ? "Downloads one .vcf file. Open it, confirm once, and every contact appears in WhatsApp, Messages, and email autocomplete."
    : "Downloads one .vcf file. Import into Google Contacts (any browser), Apple Contacts (Mac), or the People app (Windows) — it'll sync to your phone, where WhatsApp, Messages, and email autocomplete pick everyone up."

  // Build the unified roster. SAP/SLP rows only included when the
  // viewer has permission. Each SAP contact pulls its parent partner's
  // company for the "ORG" line on the contact card.
  const allRows = useMemo(() => {
    const rows = []
    for (const m of (chapterMembers || [])) {
      if ((m.status || 'active') !== 'active') continue
      rows.push(toDirectoryRow(m, 'eo'))
    }
    if (canViewCrossPop) {
      const sapById = new Map((sapPartners || []).map(p => [p.id, p]))
      for (const c of (sapContacts || [])) {
        const parent = sapById.get(c.sap_id)
        // Hide contacts whose parent SAP is archived; active + prospect stay.
        if (parent && parent.status && parent.status !== 'active' && parent.status !== 'prospect') continue
        rows.push(toDirectoryRow(c, 'sap', { company: parent?.company || parent?.name || '' }))
      }
      for (const s of slps) {
        rows.push(toDirectoryRow(s, 'slp'))
      }
    }
    return rows
  }, [chapterMembers, sapContacts, sapPartners, slps, canViewCrossPop])

  // Forum options aggregated across whatever populations are loaded.
  // SLP forums and EO forums live in the same `forums` table with a
  // `population` column, but row.forum here is just the forum name
  // string the entity is tagged with — same picker works for both.
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

  // Counts for the population filter labels — gives the user a sense
  // of "what's in there" before they pick.
  const populationCounts = useMemo(() => {
    const c = { eo: 0, sap: 0, slp: 0 }
    for (const r of allRows) c[r.population] = (c[r.population] || 0) + 1
    return c
  }, [allRows])

  const handleDownloadAll = () => {
    const populationTag = populationFilter === 'all'
      ? chapterLabel
      : `${chapterLabel} — ${POPULATION_LABELS[populationFilter] || populationFilter}`
    saveMembersToContacts(visibleRows, {
      filename: `${populationTag.replace(/\s+/g, '_')}_contacts`,
      chapterLabel: populationTag,
    })
  }

  // What does the user actually see and download? Words shift slightly
  // based on whether SAPs/SLPs are in the mix.
  const noun = canViewCrossPop ? 'contacts' : 'members'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directory"
        subtitle={canViewCrossPop
          ? `Browse ${chapterLabel} members, SAPs, and SLPs — and save them to your phone's contacts.`
          : `Browse ${chapterLabel} members and save them to your phone's contacts.`}
      />

      <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Save all {visibleRows.length} {noun} to your phone
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {bulkHelper}
            </p>
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={visibleRows.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All Contacts
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={canViewCrossPop
              ? 'Search by name, company, or industry'
              : 'Search by name, company, or industry'}
            className="pl-9"
          />
        </div>
        {canViewCrossPop && (
          <select
            value={populationFilter}
            onChange={(e) => setPopulationFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm sm:w-48"
            title="Filter by population"
          >
            <option value="all">All populations</option>
            <option value="eo">EO members ({populationCounts.eo})</option>
            <option value="sap">SAP contacts ({populationCounts.sap})</option>
            <option value="slp">SLPs ({populationCounts.slp})</option>
          </select>
        )}
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
            : `No ${noun} yet.`}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-white/5">
          {visibleRows.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                  {canViewCrossPop && r.population !== 'eo' && (
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
      )}
    </div>
  )
}
