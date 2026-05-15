import { useMemo, useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { useChapter } from '@/lib/chapter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, UserPlus, Mail, Phone } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'
import { saveMemberToContacts, saveMembersToContacts } from '@/lib/vcard'

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

  const chapterLabel = activeChapter?.name || 'Chapter'

  // Active roster only — soft-deleted / departed members shouldn't
  // appear in the directory or land in someone's address book.
  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (chapterMembers || [])
      .filter(m => (m.status || 'active') === 'active')
      .filter(m => {
        if (!q) return true
        const hay = `${m.first_name || ''} ${m.last_name || ''} ${m.name || ''} ${m.company || ''} ${m.industry || ''} ${m.email || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const an = (a.last_name || a.name || '').toLowerCase()
        const bn = (b.last_name || b.name || '').toLowerCase()
        return an.localeCompare(bn)
      })
  }, [chapterMembers, search])

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
              Downloads one .vcf file. Open it on your phone, confirm
              once, and every member appears in WhatsApp, Messages, and
              email autocomplete.
            </p>
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={visibleMembers.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Download .vcf
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or industry"
          className="pl-9"
        />
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
