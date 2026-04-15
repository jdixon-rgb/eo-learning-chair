import { useLocation } from 'react-router-dom'
import { useTourTips } from '@/lib/useTourTips'
import { Lightbulb, X } from 'lucide-react'

/**
 * Contextual first-visit tour tip banner.
 * Renders null when: no content for this route+role, or user has dismissed it.
 *
 * Usage:
 *   <TourTip id="partners-intro" />
 *
 * The `id` must be unique per tip — it's used as the dismissal key.
 * Defaults to the current pathname if not provided.
 */
export default function TourTip({ id }) {
  const { pathname } = useLocation()
  const { getTip, isDismissed, dismiss } = useTourTips()

  const tipId = id || pathname
  const tip = getTip(pathname)

  if (!tip) return null
  if (isDismissed(tipId)) return null

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 mb-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
        <Lightbulb className="h-4 w-4 text-sky-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">{tip.title}</h3>
        <p className="text-xs text-sky-800/80 dark:text-sky-200/70 mt-1 leading-relaxed">{tip.body}</p>
        <button
          onClick={() => dismiss(tipId)}
          className="mt-2 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer"
        >
          Got it
        </button>
      </div>
      <button
        onClick={() => dismiss(tipId)}
        className="text-sky-500/60 hover:text-sky-600 dark:text-sky-400/60 dark:hover:text-sky-300 p-0.5 cursor-pointer shrink-0"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
