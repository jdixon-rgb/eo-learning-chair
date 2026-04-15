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
    <div className="rounded-xl border-2 border-sky-400 bg-sky-50 p-4 mb-4 flex items-start gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
        <Lightbulb className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-sky-900">{tip.title}</h3>
        <p className="text-sm text-sky-900/80 mt-1 leading-relaxed">{tip.body}</p>
        <button
          onClick={() => dismiss(tipId)}
          className="mt-3 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer underline"
        >
          Got it
        </button>
      </div>
      <button
        onClick={() => dismiss(tipId)}
        className="text-sky-600 hover:text-sky-900 p-0.5 cursor-pointer shrink-0"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
