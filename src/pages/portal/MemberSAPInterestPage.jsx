import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useSAPStore } from '@/lib/sapStore'
import { useBoardStore } from '@/lib/boardStore'
import { Handshake, Search, Check } from 'lucide-react'

// Chapter-wide SAP interest checklist. Members tick the partners
// they'd like to get to know. Three downstream consumers:
//   - The SAP itself (their "warm leads" view in the SAP Portal)
//   - The SAP Chair (chapter-wide pull, drives programming)
//   - Forum moderators (overlap with their forum members)
// Distinct from the forum-scoped sap_forum_interest checklist on the
// Forum Home page, which only tells the moderator about THIS forum's
// interest.

export default function MemberSAPInterestPage() {
  const { user } = useAuth()
  const { chapterMembers } = useBoardStore()
  const {
    partners,
    memberInterest,
    isMemberInterestedInSAP,
    toggleMemberInterest,
  } = useSAPStore()

  const [search, setSearch] = useState('')

  // Match the signed-in user to their chapter_members row by email,
  // mirroring the lookup pattern in VendorsPage.
  const email = user?.email
  const currentMember = useMemo(() => {
    if (!email) return null
    return chapterMembers.find(m => m.email?.toLowerCase() === email.toLowerCase()) ?? null
  }, [email, chapterMembers])

  const activePartners = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (partners || [])
      .filter(p => (p.status || 'active') === 'active')
      .filter(p => {
        if (!q) return true
        const hay = `${p.company || ''} ${p.name || ''} ${p.industry || ''} ${p.description || ''}`.toLowerCase()
        return hay.includes(q)
      })
  }, [partners, search])

  // Group by industry; "Other" bucket for partners without one.
  const grouped = useMemo(() => {
    const buckets = new Map()
    for (const p of activePartners) {
      const key = (p.industry || '').trim() || 'Other'
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(p)
    }
    // Sort each bucket alphabetically by company/name; sort categories
    // alphabetically with "Other" last.
    const cats = [...buckets.keys()].sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })
    return cats.map(cat => ({
      category: cat,
      partners: buckets.get(cat).sort((a, b) =>
        (a.company || a.name || '').localeCompare(b.company || b.name || ''),
      ),
    }))
  }, [activePartners])

  const interestCount = (sapId) =>
    memberInterest.filter(i => i.sap_id === sapId).length

  const myInterestCount = useMemo(() => {
    if (!currentMember) return 0
    return memberInterest.filter(i => i.chapter_member_id === currentMember.id).length
  }, [memberInterest, currentMember])

  if (!currentMember) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-muted-foreground">
        We couldn't find your member record in this chapter. Reach out to your
        chapter administrator if you think this is wrong.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Partners You'd Like to Meet</h1>
        </div>
        <p className="text-sm text-muted-foreground/90">
          Tick the Strategic Alliance Partners you're curious about. The
          partner sees who's interested so they can reach out to people who
          actually want to talk — no cold outreach noise. Your SAP Chair and
          forum moderator also use this to plan who to bring in.
        </p>
        <p className="text-xs text-muted-foreground/70">
          You've checked {myInterestCount} of {activePartners.length} partner{activePartners.length === 1 ? '' : 's'}.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners or industries"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {grouped.length === 0 && (
        <div className="text-sm text-muted-foreground/70 text-center py-12">
          No partners match.
        </div>
      )}

      {grouped.map(({ category, partners: ps }) => (
        <section key={category} className="space-y-2">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            {category}
          </h2>
          <ul className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {ps.map(p => {
              const interested = isMemberInterestedInSAP(currentMember.id, p.id)
              const count = interestCount(p.id)
              const displayName = p.company || p.name || 'Unknown partner'
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  <button
                    onClick={() => toggleMemberInterest(currentMember.id, p.id)}
                    aria-label={interested ? `Remove interest in ${displayName}` : `Mark interest in ${displayName}`}
                    aria-pressed={interested}
                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      interested
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {interested && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground/80 line-clamp-2">{p.description}</div>
                    )}
                  </div>
                  {count > 0 && (
                    <span
                      className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      title={`${count} member${count === 1 ? '' : 's'} interested`}
                    >
                      {count} interested
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
