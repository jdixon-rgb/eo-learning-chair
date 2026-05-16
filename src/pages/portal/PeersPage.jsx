import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { hasPermission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, UserPlus, Mail, Phone, Globe2, Loader2 } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'
import { saveMemberToContacts, saveMembersToContacts, isMobileDevice } from '@/lib/vcard'

// Cross-chapter peer directory for chairs / staff / regional roles.
// Backed by the `get_peer_chairs(p_fiscal_year, p_scope, p_role_filter)`
// RPC (migration 098) which is SECURITY DEFINER and enforces both the
// caller-must-be-a-chair check and the "default-on for chairs only"
// privacy posture server-side.
//
// Defaults: caller's own role track ("my_role"), caller's region. Two
// toggles flip to "all chair roles" and "global" respectively.

const SCOPE_OPTIONS = [
  { value: 'region', label: 'My region' },
  { value: 'global', label: 'Global' },
]

const ROLE_FILTER_OPTIONS = [
  { value: 'my_role', label: 'My role' },
  { value: 'all_chairs', label: 'All chairs' },
]

const STATUS_PILL = {
  active: 'bg-primary/15 text-primary',
  elect: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
}

export default function PeersPage() {
  const { effectiveRole, profile } = useAuth()
  const { activeFiscalYear } = useFiscalYear()
  const canView = hasPermission(effectiveRole, 'canViewPeerNetwork')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('region')
  const [roleFilter, setRoleFilter] = useState('my_role')

  const callerRegion = profile?.region || ''
  const onMobile = isMobileDevice()
  const bulkHelper = onMobile
    ? "Downloads one .vcf file. Open it, confirm once, and every peer appears in WhatsApp, Messages, and email autocomplete."
    : "Downloads one .vcf file. Import into Google Contacts (any browser), Apple Contacts (Mac), or the People app (Windows) — syncs to your phone."

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!canView || !isSupabaseConfigured() || !activeFiscalYear) {
        setRows([])
        return
      }
      setLoading(true)
      setError('')
      const { data, error: rpcError } = await supabase.rpc('get_peer_chairs', {
        p_fiscal_year: activeFiscalYear,
        p_scope: scope,
        p_role_filter: roleFilter,
        // Pass the effective viewAs role so super_admin / president
        // previewing as a chair sees the right peer track. The RPC
        // ignores p_view_as_role for non-impersonating roles, so this
        // is safe to always send.
        p_view_as_role: effectiveRole || null,
      })
      if (cancelled) return
      if (rpcError) {
        console.error('get_peer_chairs error', rpcError)
        setError(rpcError.message || 'Could not load peer network.')
        setRows([])
      } else {
        setRows(data || [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [canView, activeFiscalYear, scope, roleFilter, effectiveRole])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => {
        if (!q) return true
        const hay = `${r.name} ${r.email} ${r.chapter_name} ${r.role_label} ${r.region} ${r.company}`.toLowerCase()
        return hay.includes(q)
      })
      .slice()
      .sort((a, b) => {
        // Group by role_label first, then by chapter, then name
        const byRole = (a.role_label || '').localeCompare(b.role_label || '')
        if (byRole !== 0) return byRole
        const byChapter = (a.chapter_name || '').localeCompare(b.chapter_name || '')
        if (byChapter !== 0) return byChapter
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [rows, search])

  // Group rows by role_label for section rendering. The list groups
  // by role so a chair scanning "all chairs in U.S. West" can find
  // their actual counterparts at a glance instead of one flat blob.
  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of filteredRows) {
      const key = r.role_label || r.role_key
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return Array.from(map.entries())
  }, [filteredRows])

  const handleDownloadAll = () => {
    // Normalize peer rows for vCard generation — saveMembersToContacts
    // expects the standard member shape (name, email, phone, company).
    // We tag each card with the chapter + role for context in the
    // user's address book.
    const forVCard = filteredRows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company || r.chapter_name || '',
      industry: r.role_label,
    }))
    const scopeLabel = scope === 'global'
      ? 'Global'
      : (callerRegion || 'My Region')
    saveMembersToContacts(forVCard, {
      filename: `peers_${scope}_${roleFilter}`,
      chapterLabel: `EO Peers — ${scopeLabel}`,
    })
  }

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-muted-foreground/70">
        Peer network is available to board chairs and chapter staff.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peer Network"
        subtitle={scope === 'region'
          ? `Your counterparts across ${callerRegion || 'your region'} — save them to your phone's contacts.`
          : "Your counterparts across every region — save them to your phone's contacts."}
      />

      <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Save {filteredRows.length} peer{filteredRows.length === 1 ? '' : 's'} to your phone
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {bulkHelper}
            </p>
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={filteredRows.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All Peers
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, chapter, or role"
            className="pl-9"
          />
        </div>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:w-44"
          title="Geographic scope"
        >
          {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:w-40"
          title="Role scope"
        >
          {ROLE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground/70 text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading peers…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 text-sm">
          {search
            ? 'Nothing matches that search.'
            : scope === 'region' && (!callerRegion)
              ? "You don't have a region on your profile yet — switch to Global to see all peers, or ask an admin to set your region."
              : 'No peers found for the current filters.'}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([roleLabel, group]) => (
            <div key={roleLabel} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {roleLabel}
                </h2>
                <span className="text-xs text-muted-foreground/60">
                  {group.length}
                </span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-white/5">
                {group.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                        {r.status === 'elect' && (
                          <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_PILL.elect} shrink-0`}>
                            Elect
                          </span>
                        )}
                        {r.is_regional && (
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
                            <Globe2 className="h-2.5 w-2.5" /> Regional
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70 truncate">
                        {r.is_regional
                          ? `${r.chapter_name || 'Home chapter'}${r.region ? ` · ${r.region} oversight` : ''}`
                          : `${r.chapter_name}${r.region ? ` · ${r.region}` : ''}`}
                      </div>
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
                      onClick={() => saveMemberToContacts({
                        id: r.id,
                        name: r.name,
                        email: r.email,
                        phone: r.phone,
                        company: r.company || r.chapter_name || '',
                        industry: r.role_label,
                      }, {
                        chapterLabel: r.is_regional
                          ? `EO Peers — ${r.chapter_name || r.region || 'Regional'}`
                          : `EO Peers — ${r.chapter_name}`,
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
