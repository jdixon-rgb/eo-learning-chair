import { Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'

// Thin banner that surfaces at the top of the admin layout when the
// current viewer has no write access on the chapter they're looking
// at. Two cases today:
//   1. Regional Learning Chair Expert — she spans multiple chapters
//      in her region and only has read access across them.
//   2. (Future) other regional oversight roles, easily added here.
//
// Kept deliberately calm in tone — no warning colors — because this
// is an expected state for regional viewers, not an error condition.
export default function ReadOnlyBanner() {
  const { effectiveRole } = useAuth()
  const { activeChapter } = useChapter()

  const isRegionalReadOnly = effectiveRole === 'regional_learning_chair_expert'

  if (!isRegionalReadOnly || !activeChapter) return null

  return (
    <div className="mx-4 mt-2 md:mx-6 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-foreground">
      <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
      <span>
        <strong>Regional view · read-only.</strong> You're viewing{' '}
        <strong>{activeChapter.name}</strong> as a Regional Learning Chair Expert.
        Editing is disabled; member-private areas (forum, reflections, lifeline) are not accessible.
      </span>
    </div>
  )
}
