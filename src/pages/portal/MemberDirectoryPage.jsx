import { useMemo, useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { useChapter } from '@/lib/chapter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, UserPlus, Mail, Phone } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'
import { saveMemberToContacts, saveMembersToContacts, isMobileDevice } from '@/lib/vcard'

// Chapter-wide member directory. Lets any signed-in member browse the
// roster, search by name / company / industry, and pull contact cards
// into their device address book either one at a time or as a bulk
// .vcf bundle — once imported, WhatsApp / Messages / Mail all
// auto-resolve these members because they share the system address
// book.

export default function MemberDirectoryPage() {
  const { chapterMembers } = useBoardStore()
  const { activeChapter } = useChapter()
  const [search, setSearch] = useState('')
  const [forumFilter, setForumFilter] = useState('all')

  const chapterLabel = activeChapter?.name || 'Chapter'
  // Helper copy differs by platform: phones get the "open it, confirm
  // once" native-sheet flow; desktops get the "import + iCloud/Google
  // syncs to your phone" flow. Both end in the same place — the
  // device address book that WhatsApp / Messages / Mail read from.
  const onMobile = isMobileDevice()
  const bulkHelper = onMobile
    ? "Downloads one .vcf file. Open it, confirm once, and every member appears in WhatsApp, Messages, and email autocomplete."
    : "Downloads one .vcf file. Import into Google Contacts (any browser), Apple Contacts (Mac), or the People app (Windows) — it'll sync to your phone, where WhatsApp, Messages, and email autocomplete pick everyone up."

  // Unique forum names across the active roster, plus "Unassigned" if
  // any active members have no forum string. Drives the filter dropdown.
  const forumOptions = useMemo(() => {
    const set = new Set()
    let hasUnassigned = false
    for (const m of chapterMembers || []) {
      if ((m.status || 'active') !== 'active') continue
      const f = (m.forum || '').trim()
      if (f) set.add(f); else hasUnassigned = true
    }
    const list = [...set].sort((a, b) => a.localeCompare(b))
    if (hasUnassigned) list.push('__unassigned__')
    return list
  }, [chapterMembers])

  // Active roster only — soft-deleted / departed members shouldn't
  // appear in the directory or land in someone's address book.
  // Sort by first name (then last name as tiebreaker).
  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (chapterMembers || [])
      .filter(m => (m.status || 'active') === 'active')
      .filter(m => {
        if (forumFilter === 'all') return true
        const f = (m.forum || '').trim()
        if (forumFilter === '__unassigned__') return !f
        return f.toLowerCase() === forumFilter.toLowerCase()
      })
      .filter(m => {
        if (!q) return true
        const hay = `${m.first_name || ''} ${m.last_name || ''} ${m.name || ''} ${m.company || ''} ${m.industry || ''} ${m.email || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        // First-name sort. Fall back to first word of the combined
        // `name` field when first_name isn't populated.
        const aFirst = (a.first_name || (a.name || '').split(' ')[0] || '').toLowerCase()
        const bFirst = (b.first_name || (b.name || '').split(' ')[0] || '').toLowerCase()
        const byFirst = aFirst.localeCompare(bFirst)
        if (byFirst !== 0) return byFirst
        const aLast = (a.last_name || '').toLowerCase()
        const bLast = (b.last_name || '').toLowerCase()
        return aLast.localeCompare(bLast)
      })
  }, [chapterMembers, search, forumFilter])

  const handleDownloadAll = () => {
    saveMembersToContacts(visibleMembers, {
      filename: `${chapterLabel.replace(/\s+/g, '_')}_members`,
      chapterLabel,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Directory"
        subtitle={`Browse ${chapterLabel} members and save them to your phone's contacts.`}
      />

      {/* Bulk action — the headline feature. One tap pulls every visible
          member into your phone's address book in a single confirmation,
          which is what makes them discoverable from WhatsApp, Messages,
          and Mail without per-person work. */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Save all {visibleMembers.length} members to your phone
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {bulkHelper}
            </p>
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={visibleMembers.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All Contacts
          </Button>
        </div>
      </div>

      {/* Search + Forum filter */}
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
        {forumOptions.length > 0 && (
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
        )}
      </div>

      {/* Roster */}
      {visibleMembers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 text-sm">
          {search ? 'No members match that search.' : 'No members yet.'}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-white/5">
          {visibleMembers.map(m => {
            const displayName = m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown'
            return (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                  {m.company && (
                    <div className="text-xs text-muted-foreground/70 truncate">{m.company}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground/70">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:text-foreground/90">
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-foreground/90">
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveMemberToContacts(m, { chapterLabel })}
                  className="shrink-0"
                  title="Add this person to your phone's contacts"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
