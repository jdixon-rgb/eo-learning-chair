import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENT_YEAR, setBirthYear } from '@/lib/lifelineStore'

// First-run prompt for the Lifeline page: asks the member to set their
// birth year before any events can be plotted. Simpler than the original
// lifeline.ourchapteros.com onboarding because chapter_members already
// has first/last name — we only need birth_year.
//
// Props:
//   memberId   — chapter_members.id for the current user
//   onComplete — callback fired with the new birth_year once it saves
//                successfully

export function BirthYearOnboarding({ memberId, onComplete }) {
  const [birthYearInput, setBirthYearInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const by = parseInt(birthYearInput, 10)
    if (Number.isNaN(by) || by < 1900 || by > CURRENT_YEAR - 1) {
      setError(`Enter a valid birth year between 1900 and ${CURRENT_YEAR - 1}.`)
      return
    }

    setSaving(true)
    const { data, error: saveErr } = await setBirthYear(memberId, by)
    if (saveErr) {
      setError(typeof saveErr === 'string' ? saveErr : 'Failed to save.')
      setSaving(false)
      return
    }
    onComplete(data?.birthYear ?? by)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-lifeline-mono text-xs text-lifeline-ink-muted tracking-widest uppercase mb-3">
            Welcome
          </p>
          <h2 className="font-lifeline-display text-3xl text-lifeline-ink">
            Before we begin
          </h2>
          <p className="font-lifeline-body text-lifeline-ink-muted mt-2 text-sm leading-relaxed">
            We need your birth year to place events correctly on your lifeline.
            This is private — only you can see it.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-lifeline-card border border-lifeline-border rounded-lg p-6 shadow-lifeline-card"
        >
          <div className="space-y-1.5">
            <Label htmlFor="lifeline-birth-year" className="text-lifeline-ink-muted">
              Birth year
            </Label>
            <Input
              id="lifeline-birth-year"
              type="number"
              placeholder={`e.g. ${CURRENT_YEAR - 40}`}
              value={birthYearInput}
              onChange={(e) => setBirthYearInput(e.target.value)}
              min={1900}
              max={CURRENT_YEAR - 1}
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-lifeline-negative bg-lifeline-negative-bg rounded px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full" size="lg">
            {saving ? 'Saving…' : 'Start my Lifeline →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
