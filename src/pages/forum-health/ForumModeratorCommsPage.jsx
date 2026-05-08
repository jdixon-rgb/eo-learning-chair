import { Sparkles } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

// Stub for the Forum Health Chair → Moderator Comms surface. The full
// experience will be a composer for moderator-meeting alerts and a
// calendar of moderator summit events that fan out to every moderator's
// Forum view.
export default function ForumModeratorCommsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Moderator Comms"
        subtitle="Broadcast to every moderator. Summit programming. Meeting alerts."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
              From here you'll compose alerts that fan out to every forum's
              moderator (with read-state tracking), publish moderator summit
              events to a chapter-wide moderator calendar, and see who's opened
              what.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
