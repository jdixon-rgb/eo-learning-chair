import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CURRENT_YEAR,
  createLifeEvent,
  updateLifeEvent,
} from '@/lib/lifelineStore'

// Create/edit modal for a life event. Called from the Lifeline page.
// Ported from lifeline.ourchapteros.com with the fetch-based API calls
// swapped for store functions.
//
// Props:
//   event     — the LifeEvent to edit, or null/undefined for a new one
//   memberId  — chapter_members.id for the current user
//   birthYear — current member's birth year (required for age events)
//   onClose   — called when the user dismisses the modal
//   onSaved   — called with the new/updated LifeEvent after a successful save
//
// NOTE: intensity picker uses a plain <input type="range"> as a
// placeholder. Step 9 upgrades this to a Radix slider if desired —
// everything else in this component stays the same.

export function EventForm({ event, memberId, birthYear, onClose, onSaved }) {
  const isEdit = !!event

  const [title, setTitle] = useState(event?.title ?? '')
  const [summary, setSummary] = useState(event?.summary ?? '')
  const [valence, setValence] = useState(event?.valence ?? 'positive')
  const [intensity, setIntensity] = useState(event?.intensity ?? 3)
  const [timeType, setTimeType] = useState(event?.timeType ?? 'year')
  const [timeValue, setTimeValue] = useState(
    event ? String(event.timeValue) : ''
  )
  const [brief, setBrief] = useState(event?.brief ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const computedPreview =
    timeType === 'age' && timeValue && birthYear != null
      ? `≈ ${birthYear + Number(timeValue)}`
      : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const tv = parseInt(timeValue, 10)
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!timeValue || Number.isNaN(tv)) {
      setError('Enter a valid year or age.')
      return
    }
    if (timeType === 'year' && (tv < 1900 || tv > CURRENT_YEAR + 1)) {
      setError(`Year must be between 1900 and ${CURRENT_YEAR + 1}.`)
      return
    }
    if (timeType === 'age' && (tv < 0 || tv > 120)) {
      setError('Age must be between 0 and 120.')
      return
    }

    setSaving(true)
    const payload = {
      title,
      summary,
      valence,
      intensity,
      timeType,
      timeValue: tv,
      brief,
    }
    const { data, error: saveErr } = isEdit
      ? await updateLifeEvent(event.id, memberId, payload, birthYear)
      : await createLifeEvent(memberId, payload, birthYear)

    if (saveErr) {
      setError(typeof saveErr === 'string' ? saveErr : 'Something went wrong.')
      setSaving(false)
      return
    }
    onSaved(data)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-lifeline-card border-lifeline-border">
        <DialogHeader>
          <DialogTitle className="font-lifeline-display text-lifeline-ink">
            {isEdit ? 'Edit Event' : 'Add Life Event'}
          </DialogTitle>
          <DialogDescription className="text-lifeline-ink-muted">
            {isEdit
              ? 'Update this moment in your lifeline.'
              : 'Record a moment that shaped your journey.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="lifeline-event-title" className="text-lifeline-ink-muted">
              Title
            </Label>
            <Input
              id="lifeline-event-title"
              placeholder="e.g. Started my first company"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-lifeline-ink-faint text-right">
              {title.length}/100
            </p>
          </div>

          {/* Valence */}
          <div className="space-y-1.5">
            <Label className="text-lifeline-ink-muted">Tone</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValence('positive')}
                className={`rounded border-2 py-3 text-sm font-lifeline-body transition-all ${
                  valence === 'positive'
                    ? 'border-lifeline-positive bg-lifeline-positive-bg text-lifeline-positive font-medium'
                    : 'border-lifeline-border text-lifeline-ink-muted hover:border-lifeline-positive/40 hover:text-lifeline-positive'
                }`}
              >
                ↑ Positive
              </button>
              <button
                type="button"
                onClick={() => setValence('negative')}
                className={`rounded border-2 py-3 text-sm font-lifeline-body transition-all ${
                  valence === 'negative'
                    ? 'border-lifeline-negative bg-lifeline-negative-bg text-lifeline-negative font-medium'
                    : 'border-lifeline-border text-lifeline-ink-muted hover:border-lifeline-negative/40 hover:text-lifeline-negative'
                }`}
              >
                ↓ Negative
              </button>
            </div>
          </div>

          {/* Intensity (range input placeholder — step 9 upgrades to Radix) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-lifeline-ink-muted">Intensity</Label>
              <span
                className={`font-lifeline-mono text-sm font-semibold ${
                  valence === 'positive'
                    ? 'text-lifeline-positive'
                    : 'text-lifeline-negative'
                }`}
              >
                {valence === 'positive' ? '+' : '-'}
                {intensity} / 5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-lifeline-accent"
              aria-label="Intensity"
            />
            <div className="flex justify-between text-xs text-lifeline-ink-faint font-lifeline-mono">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Life-changing</span>
            </div>
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label className="text-lifeline-ink-muted">When</Label>
            <div className="flex gap-2 mb-2">
              {['year', 'age'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTimeType(t)
                    setTimeValue('')
                  }}
                  className={`flex-1 rounded border py-1.5 text-sm font-lifeline-body transition-all ${
                    timeType === t
                      ? 'border-lifeline-accent bg-lifeline-accent-bg text-lifeline-accent font-medium'
                      : 'border-lifeline-border text-lifeline-ink-muted hover:border-lifeline-accent/40'
                  }`}
                >
                  {t === 'year' ? 'Specific year' : 'Age at time'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder={
                  timeType === 'year' ? `e.g. ${CURRENT_YEAR - 10}` : 'e.g. 11'
                }
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                min={timeType === 'year' ? 1900 : 0}
                max={timeType === 'year' ? CURRENT_YEAR + 1 : 120}
              />
              {computedPreview && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-lifeline-ink-faint font-lifeline-mono">
                  {computedPreview}
                </span>
              )}
            </div>
          </div>

          {/* Brief presentation toggle */}
          <button
            type="button"
            onClick={() => setBrief((b) => !b)}
            className={`w-full flex items-center gap-3 rounded border px-3 py-2.5 text-left transition-all ${
              brief
                ? 'border-lifeline-accent bg-lifeline-accent-bg'
                : 'border-lifeline-border hover:border-lifeline-accent/40'
            }`}
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                brief
                  ? 'border-lifeline-accent bg-lifeline-accent'
                  : 'border-lifeline-border'
              }`}
            >
              {brief && (
                <svg viewBox="0 0 10 8" width="10" height="8" fill="none">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <p
                className={`font-lifeline-body text-sm font-medium ${
                  brief ? 'text-lifeline-accent' : 'text-lifeline-ink-muted'
                }`}
              >
                Include in brief presentation
              </p>
              <p className="font-lifeline-body text-xs text-lifeline-ink-faint">
                Show this event when Brief mode is active
              </p>
            </div>
          </button>

          {/* Summary */}
          <div className="space-y-1.5">
            <Label htmlFor="lifeline-event-summary" className="text-lifeline-ink-muted">
              Summary{' '}
              <span className="text-lifeline-ink-faint">(optional)</span>
            </Label>
            <Textarea
              id="lifeline-event-summary"
              placeholder="A brief note about this event — what happened, what you felt..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-lifeline-ink-faint text-right">
              {summary.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-lifeline-negative bg-lifeline-negative-bg rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Lifeline'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
