import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTimeLabel, eventScore } from '@/lib/lifelineStore'
import { useLifelinePhotoUrl } from './useLifelinePhotoUrl'

const INTENSITY_LABELS = {
  1: 'Mild',
  2: 'Notable',
  3: 'Significant',
  4: 'Major',
  5: 'Life-changing',
}

// Read-only view of a single life event, with edit/delete actions.
// Ported from lifeline.ourchapteros.com. Edit and delete are delegated
// to the parent via callbacks so the parent can coordinate the form
// modal state and any optimistic UI.
//
// Props:
//   event    — a LifeEvent domain object (camelCase, from the store)
//   onClose  — called when the user dismisses the modal
//   onEdit   — called with the event when the user clicks Edit
//   onDelete — called with the event when the user confirms Delete

export function EventDetailModal({ event, onClose, onEdit, onDelete }) {
  const score = eventScore(event.valence, event.intensity)
  const isPositive = event.valence === 'positive'
  const photoUrl = useLifelinePhotoUrl(event.photoStoragePath)
  const [zoomed, setZoomed] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-lifeline-card border-lifeline-border">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            {/* Score badge */}
            <div
              className={`shrink-0 w-12 h-12 rounded flex items-center justify-center font-lifeline-mono text-lg font-bold ${
                isPositive
                  ? 'bg-lifeline-positive-bg text-lifeline-positive'
                  : 'bg-lifeline-negative-bg text-lifeline-negative'
              }`}
            >
              {score > 0 ? `+${score}` : score}
            </div>
            <div className="min-w-0">
              <p className="font-lifeline-mono text-xs text-lifeline-ink-muted mb-1">
                {formatTimeLabel(event.timeType, event.timeValue)}
                {' · '}
                {event.computedYear}
              </p>
              <DialogTitle className="font-lifeline-display text-lg leading-tight text-lifeline-ink">
                {event.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Valence + intensity chips */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={isPositive ? 'positive' : 'negative'}>
            {isPositive ? '↑ Positive' : '↓ Negative'}
          </Badge>
          <Badge variant="neutral">
            {INTENSITY_LABELS[event.intensity]} (intensity {event.intensity})
          </Badge>
        </div>

        {/* Photo */}
        {event.photoStoragePath && (
          <div className="mt-3">
            {photoUrl ? (
              <button
                type="button"
                onClick={() => setZoomed(true)}
                className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-lifeline-accent rounded"
                title="Click to enlarge"
              >
                <img
                  src={photoUrl}
                  alt={event.photoFileName || event.title}
                  className="w-full max-h-72 object-cover rounded border border-lifeline-border bg-lifeline-paper"
                />
              </button>
            ) : (
              <div className="w-full h-32 rounded border border-lifeline-border bg-lifeline-paper animate-pulse" />
            )}
          </div>
        )}

        {/* Summary */}
        {event.summary ? (
          <p className="font-lifeline-body text-sm text-lifeline-ink leading-relaxed mt-3 whitespace-pre-wrap">
            {event.summary}
          </p>
        ) : (
          <p className="font-lifeline-body text-sm text-lifeline-ink-faint italic mt-3">
            No summary written.
          </p>
        )}

        {/* Zoom overlay */}
        {zoomed && photoUrl && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setZoomed(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') setZoomed(false)
            }}
            className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <img
              src={photoUrl}
              alt={event.photoFileName || event.title}
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-lifeline-border">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              onClose()
              onEdit(event)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`Delete "${event.title}"?`)) {
                onDelete(event)
                onClose()
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
