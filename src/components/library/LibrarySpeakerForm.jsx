import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Shared form fields for creating or editing a public speaker library
// row. Used by AddLibrarySpeakerDialog and EditLibrarySpeakerDialog.
// Lifts state into the parent so the parent owns the submit/save flow.
export default function LibrarySpeakerForm({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lib-name">Name *</Label>
          <Input
            id="lib-name"
            value={value.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="Speaker name"
            required
          />
        </div>
        <div>
          <Label htmlFor="lib-eo-chapter">Home EO chapter</Label>
          <Input
            id="lib-eo-chapter"
            value={value.eo_chapter}
            onChange={e => set({ eo_chapter: e.target.value })}
            placeholder="EO Las Vegas"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="lib-topic">Topic / talk title</Label>
        <Input
          id="lib-topic"
          value={value.topic}
          onChange={e => set({ topic: e.target.value })}
          placeholder="The headline talk this speaker is known for"
        />
      </div>

      <div>
        <Label htmlFor="lib-bio">Bio</Label>
        <Textarea
          id="lib-bio"
          value={value.bio}
          onChange={e => set({ bio: e.target.value })}
          rows={4}
          placeholder="Background, expertise, what makes them compelling on stage."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lib-photo">Photo URL</Label>
          <Input
            id="lib-photo"
            type="url"
            value={value.photo_url}
            onChange={e => set({ photo_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="lib-source-url">Source URL</Label>
          <Input
            id="lib-source-url"
            type="url"
            value={value.source_url}
            onChange={e => set({ source_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lib-honorarium">Honorarium ($)</Label>
          <Input
            id="lib-honorarium"
            type="number"
            min="0"
            step="100"
            value={value.honorarium_amount ?? ''}
            onChange={e => set({ honorarium_amount: e.target.value })}
            placeholder="e.g. 7500"
          />
        </div>
        <div>
          <Label htmlFor="lib-honorarium-notes">Honorarium notes</Label>
          <Input
            id="lib-honorarium-notes"
            value={value.honorarium_notes}
            onChange={e => set({ honorarium_notes: e.target.value })}
            placeholder="e.g. negotiable, varies by format"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lib-travel">Travel cost ($)</Label>
          <Input
            id="lib-travel"
            type="number"
            min="0"
            step="100"
            value={value.travel_amount ?? ''}
            onChange={e => set({ travel_amount: e.target.value })}
            placeholder="e.g. 1500"
          />
        </div>
        <div>
          <Label htmlFor="lib-travel-notes">Travel notes</Label>
          <Input
            id="lib-travel-notes"
            value={value.travel_notes}
            onChange={e => set({ travel_notes: e.target.value })}
            placeholder="e.g. based in Phoenix, bills actuals"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lib-class-year">Class year</Label>
          <Input
            id="lib-class-year"
            value={value.class_year}
            onChange={e => set({ class_year: e.target.value })}
            placeholder="e.g. Fall 2022"
          />
        </div>
        <div>
          <Label htmlFor="lib-source">Source</Label>
          <Input
            id="lib-source"
            value={value.source}
            onChange={e => set({ source: e.target.value })}
            placeholder="e.g. EO Global Speakers Academy, Direct contact"
          />
        </div>
      </div>
    </div>
  )
}

// Initial empty form value
export const emptyLibrarySpeaker = {
  name: '',
  topic: '',
  eo_chapter: '',
  class_year: '',
  source: '',
  source_url: '',
  bio: '',
  photo_url: '',
  honorarium_amount: '',
  honorarium_notes: '',
  travel_amount: '',
  travel_notes: '',
}

// Shape a form value for DB insert/update (convert empty strings on numeric fields to null).
export function librarySpeakerToDb(form) {
  const numOrNull = (v) => {
    if (v === '' || v == null) return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return {
    name: form.name.trim(),
    topic: form.topic.trim(),
    eo_chapter: form.eo_chapter.trim(),
    class_year: form.class_year.trim(),
    source: form.source.trim(),
    source_url: form.source_url.trim(),
    bio: form.bio.trim(),
    photo_url: form.photo_url.trim(),
    honorarium_amount: numOrNull(form.honorarium_amount),
    honorarium_notes: form.honorarium_notes.trim(),
    travel_amount: numOrNull(form.travel_amount),
    travel_notes: form.travel_notes.trim(),
  }
}

// Shape a DB row for the form (convert nulls to '' on string fields).
export function dbToLibrarySpeaker(row) {
  return {
    name: row.name || '',
    topic: row.topic || '',
    eo_chapter: row.eo_chapter || '',
    class_year: row.class_year || '',
    source: row.source || '',
    source_url: row.source_url || '',
    bio: row.bio || '',
    photo_url: row.photo_url || '',
    honorarium_amount: row.honorarium_amount ?? '',
    honorarium_notes: row.honorarium_notes || '',
    travel_amount: row.travel_amount ?? '',
    travel_notes: row.travel_notes || '',
  }
}
