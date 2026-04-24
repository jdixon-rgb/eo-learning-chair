// Green/yellow/gray status dot + relative-time label for a chair
// based on their last_sign_in_at timestamp.
//
// Thresholds:
//   < 7 days   → green  (active)
//   7–30 days  → yellow (recent but not current)
//   > 30 days  → gray   (dormant)
//   null       → gray   ("never signed in")
//
// Keep the thresholds conservative — we want "green" to mean
// "someone is actually present in the app," not just "they
// existed in the last month."

function relativeLabel(iso) {
  if (!iso) return 'never signed in'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const day = 1000 * 60 * 60 * 24

  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diffMs / day)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function statusColor(iso) {
  if (!iso) return 'bg-muted-foreground/30'
  const diffDays = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 7) return 'bg-green-500'
  if (diffDays < 30) return 'bg-amber-500'
  return 'bg-muted-foreground/40'
}

export default function ActivityIndicator({ lastSignInAt, showLabel = true, size = 'sm' }) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`${dotSize} rounded-full shrink-0 ${statusColor(lastSignInAt)}`}
        aria-label={lastSignInAt ? `Last sign-in ${relativeLabel(lastSignInAt)}` : 'Never signed in'}
      />
      {showLabel && <span>{relativeLabel(lastSignInAt)}</span>}
    </span>
  )
}
