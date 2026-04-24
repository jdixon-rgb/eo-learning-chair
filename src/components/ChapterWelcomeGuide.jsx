import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Sparkles, ArrowRight } from 'lucide-react'

// Welcome banner shown at the top of a chair's dashboard when the chapter
// has no data yet. First chair to sign into a brand-new chapter would
// otherwise land on an empty dashboard with no orientation — this panel
// greets them, frames the blank state as expected, and points to the
// surfaces where they'd start populating things.
//
// Props:
//   - chapterId: used for the dismissal key so each chapter can be
//     welcomed/dismissed independently. Required.
//   - chapterName: string, shown in the headline.
//   - empty: boolean — the dashboard's own emptiness check (no events,
//     no speakers, no members, whatever "brand new" means for that role).
//     Component renders null when false.
//   - actions: array of { icon, label, description, to } — role-specific
//     quick-win links. Dashboard supplies these so each chair sees the
//     actions they can actually take.
export default function ChapterWelcomeGuide({ chapterId, chapterName, empty, actions }) {
  const storageKey = `welcome-guide-dismissed-${chapterId}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  if (!empty || dismissed || !chapterId || !actions?.length) return null

  const handleDismiss = () => {
    try { localStorage.setItem(storageKey, '1') } catch { /* no-op */ }
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-warm/5 p-6 shadow-sm relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss welcome guide"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 mb-5 pr-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Welcome to {chapterName}</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            This chapter is brand new, so you're starting with a clean slate.
            Here are a few first steps to get the flywheel turning. Dismiss
            this panel anytime — it won't come back for this chapter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, description, to }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border bg-card p-4 hover:border-primary hover:shadow-sm transition-all flex items-start gap-3"
          >
            <div className="p-1.5 rounded-md bg-muted text-foreground shrink-0 mt-0.5">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm font-medium group-hover:text-primary transition-colors">
                {label}
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
