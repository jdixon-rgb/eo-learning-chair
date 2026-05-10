import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ScrollText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useBoardStore } from '@/lib/boardStore'
import { useForumStore } from '@/lib/forumStore'
import PageHeader from '@/lib/pageHeader'

// Read-only viewer for the Forum Health Chair. Shows the latest stable
// constitution version (proposed if pending, else adopted) with each
// clause's review activity inline: who marked it reviewed and what
// annotations members raised. The chair never edits this surface — they
// just need to see that the per-clause review activity happened.
export default function ForumConstitutionReviewPage() {
  const { forumId } = useParams()
  const { forums, chapterMembers } = useBoardStore()
  const { constitutions, constitutionVersions, clauseReviews } = useForumStore()

  const forum = useMemo(() => forums.find(f => f.id === forumId), [forums, forumId])
  const constitution = useMemo(
    () => constitutions.find(c => c.forum_id === forumId),
    [constitutions, forumId]
  )
  const versions = useMemo(
    () => (constitution ? constitutionVersions.filter(v => v.constitution_id === constitution.id) : []),
    [constitutionVersions, constitution]
  )
  const adopted = versions.find(v => v.status === 'adopted')
  const proposed = versions.find(v => v.status === 'proposed')
  const target = proposed || adopted || null

  const forumMembers = useMemo(
    () => chapterMembers.filter(
      m => (m.forum || '').toLowerCase() === (forum?.name || '').toLowerCase() && m.status === 'active'
    ),
    [chapterMembers, forum]
  )
  const memberName = useMemo(() => {
    const m = new Map()
    for (const x of chapterMembers) m.set(x.id, x.name)
    return m
  }, [chapterMembers])

  const reviewsForVersion = useMemo(
    () => (target ? (clauseReviews || []).filter(r => r.version_id === target.id) : []),
    [clauseReviews, target]
  )
  const reviewsBySection = useMemo(() => {
    const m = new Map()
    for (const r of reviewsForVersion) {
      if (!m.has(r.section_id)) m.set(r.section_id, [])
      m.get(r.section_id).push(r)
    }
    return m
  }, [reviewsForVersion])

  const totalReviewers = useMemo(() => {
    const set = new Set()
    for (const r of reviewsForVersion) if (r.reviewed || (r.annotation || '').trim()) set.add(r.member_id)
    return set.size
  }, [reviewsForVersion])
  const totalAnnotations = reviewsForVersion.filter(r => (r.annotation || '').trim().length > 0).length

  if (!forum) {
    return (
      <div className="space-y-4">
        <PageHeader title="Constitution review" />
        <BackLink />
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Forum not found.
        </div>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="space-y-4">
        <PageHeader title={`${forum.name} — constitution review`} />
        <BackLink />
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          This forum has no proposed or adopted constitution yet.
        </div>
      </div>
    )
  }

  const sections = Array.isArray(target.sections) ? target.sections : []

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${forum.name} — constitution review`}
        subtitle="Read-only view. Per-clause review activity is owned by the moderator."
      />
      <BackLink />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile label="Status" value={target.status === 'proposed' ? 'Proposed' : 'Adopted'} />
        <Tile label="Members reviewing" value={`${totalReviewers}/${forumMembers.length}`} />
        <Tile
          label="Discussion items"
          value={String(totalAnnotations)}
          tone={totalAnnotations > 0 ? 'text-amber-700' : 'text-muted-foreground'}
        />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{target.title || 'Forum Constitution'}</h2>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border bg-muted text-muted-foreground">
              v{target.version_number}
            </span>
          </div>
          {target.preamble && (
            <p className="text-sm text-foreground/80 italic mt-2 whitespace-pre-wrap">{target.preamble}</p>
          )}
        </div>

        {sections.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No sections yet.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section, idx) => {
              const all = reviewsBySection.get(section.id) || []
              const reviewedRows = all.filter(r => r.reviewed)
              const annotated = all.filter(r => (r.annotation || '').trim().length > 0)
              return (
                <div key={section.id} className="rounded-lg border bg-background p-3">
                  <h3 className="text-sm font-semibold mb-1">
                    {idx + 1}. {section.heading || <span className="italic text-muted-foreground">Untitled section</span>}
                  </h3>
                  {section.body && (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap mb-2">{section.body}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {reviewedRows.length}/{forumMembers.length} reviewed
                    </span>
                    {annotated.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {annotated.length} flagged for discussion
                      </span>
                    )}
                  </div>
                  {annotated.length > 0 && (
                    <ul className="mt-2 space-y-1.5 border-t pt-2">
                      {annotated.map(r => (
                        <li key={r.id} className="text-xs text-foreground/85">
                          <span className="font-medium text-amber-800">{memberName.get(r.member_id) || 'Member'}:</span>{' '}
                          <span className="whitespace-pre-wrap">{r.annotation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/forum-health"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3 w-3" />
      Back to Forum Health
    </Link>
  )
}

function Tile({ label, value, tone }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className={`text-xl font-semibold leading-none ${tone || 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
