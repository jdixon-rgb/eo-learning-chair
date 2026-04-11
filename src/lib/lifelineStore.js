// Lifeline store — thin wrappers over Supabase for the Lifeline module.
// Pattern matches src/lib/reflectionsStore.js.
//
// Both member_private (birth_year) and life_events are protected by
// author-only RLS from migration 031_lifeline.sql, so every call here runs
// in the caller's member context — RLS does the ownership filtering.

import { supabase, isSupabaseConfigured } from './supabase'

// ── Shared helpers (ported from lifeline/lib/utils.ts) ───────
// Keep these inline rather than importing from another file so this store
// is self-contained and easy to lift out later if we ever extract a
// lifeline package.

export const CURRENT_YEAR = new Date().getFullYear()

// Resolve the absolute year an event occurred in. Year events are literal;
// age events are resolved against the member's birth_year.
export function computeYear(timeType, timeValue, birthYear) {
  if (timeType === 'year') return timeValue
  if (birthYear == null) {
    throw new Error('Birth year required for age-based events')
  }
  return birthYear + timeValue
}

// Display label for the event's time axis.
export function formatTimeLabel(timeType, timeValue) {
  if (timeType === 'year') return String(timeValue)
  return `Age ${timeValue}`
}

// Signed score used by the chart: +intensity for positive events,
// -intensity for negative events.
export function eventScore(valence, intensity) {
  return valence === 'positive' ? intensity : -intensity
}

// ── Validation ───────────────────────────────────────────────
// Friendly client-side checks. Postgres enforces the hard constraints
// (enum membership, intensity range, NOT NULL title) as a backstop.

function validateEventPayload(payload) {
  const { title, valence, intensity, timeType, timeValue } = payload
  if (!title || !title.trim()) return 'Title required'
  if (!['positive', 'negative'].includes(valence)) return 'Invalid valence'
  if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) {
    return 'Intensity must be 1–5'
  }
  if (!['year', 'age'].includes(timeType)) return 'Invalid time type'
  if (!Number.isInteger(timeValue)) return 'Time value required'
  return null
}

function validateBirthYear(birthYear) {
  if (!Number.isInteger(birthYear)) return 'Birth year must be a whole number'
  if (birthYear < 1900 || birthYear > CURRENT_YEAR) {
    return `Birth year must be between 1900 and ${CURRENT_YEAR}`
  }
  return null
}

// ── member_private (birth_year and future owner-only fields) ─
// 1:1 with chapter_members. Row may not exist until the member sets a
// value, so loadMemberPrivate returns { data: null } cleanly.

export async function loadMemberPrivate(memberId) {
  if (!isSupabaseConfigured() || !memberId) return { data: null, error: null }
  const { data, error } = await supabase
    .from('member_private')
    .select('member_id, birth_year, updated_at')
    .eq('member_id', memberId)
    .maybeSingle()
  return { data, error }
}

// Upsert the member's birth_year. Safe to call whether the row exists or
// not. RLS guarantees the member can only touch their own row.
export async function setBirthYear(memberId, birthYear) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' }
  }
  if (!memberId) return { data: null, error: 'Member id required' }

  const validation = validateBirthYear(birthYear)
  if (validation) return { data: null, error: validation }

  const { data, error } = await supabase
    .from('member_private')
    .upsert(
      {
        member_id: memberId,
        birth_year: birthYear,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' }
    )
    .select()
    .single()
  return { data, error }
}

// ── life_events ──────────────────────────────────────────────

// Load the caller's events, ordered timeline-first:
//   computed_year asc, sort_order asc, created_at asc
// RLS filters to the caller's events regardless of what we pass.
export async function loadLifeEvents(memberId) {
  if (!isSupabaseConfigured() || !memberId) return { data: [], error: null }
  const { data, error } = await supabase
    .from('life_events')
    .select('*')
    .eq('member_id', memberId)
    .order('computed_year', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return { data: data || [], error }
}

// Create a new event. Caller passes the raw form values; this function
// computes computed_year and sort_order before insert.
//
// For age-based events we need the member's birth_year. Caller must pass
// it (typically read from loadMemberPrivate ahead of time) — the store
// does not fetch it implicitly to keep round-trips predictable.
export async function createLifeEvent(memberId, payload, birthYear) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' }
  }
  if (!memberId) return { data: null, error: 'Member id required' }

  const validation = validateEventPayload(payload)
  if (validation) return { data: null, error: validation }

  const { title, summary, valence, intensity, timeType, timeValue, brief } =
    payload

  if (timeType === 'age' && birthYear == null) {
    return {
      data: null,
      error: 'Set your birth year before adding age-based events',
    }
  }

  let computedYear
  try {
    computedYear = computeYear(timeType, timeValue, birthYear)
  } catch (err) {
    return { data: null, error: err.message }
  }

  // sort_order = count of existing events in this year (append to end).
  // RLS already scopes this count to the caller.
  const { count: yearCount, error: countErr } = await supabase
    .from('life_events')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('computed_year', computedYear)
  if (countErr) return { data: null, error: countErr }

  const { data, error } = await supabase
    .from('life_events')
    .insert({
      member_id: memberId,
      title: title.trim(),
      summary: (summary || '').trim(),
      valence,
      intensity,
      time_type: timeType,
      time_value: timeValue,
      computed_year: computedYear,
      sort_order: yearCount ?? 0,
      brief: brief === true,
    })
    .select()
    .single()
  return { data, error }
}

// Update an event. Recomputes computed_year if time_type/time_value
// changed. If the computed year changed, appends to the end of the new
// year's group (same behavior as the original Lifeline API).
export async function updateLifeEvent(id, memberId, payload, birthYear) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' }
  }
  if (!id) return { data: null, error: 'Event id required' }
  if (!memberId) return { data: null, error: 'Member id required' }

  const validation = validateEventPayload(payload)
  if (validation) return { data: null, error: validation }

  const { title, summary, valence, intensity, timeType, timeValue, brief } =
    payload

  if (timeType === 'age' && birthYear == null) {
    return { data: null, error: 'Birth year required for age-based events' }
  }

  // Need the existing row to know whether computed_year changed.
  // RLS ensures we can only read our own row.
  const { data: existing, error: loadErr } = await supabase
    .from('life_events')
    .select('computed_year, sort_order')
    .eq('id', id)
    .eq('member_id', memberId)
    .maybeSingle()
  if (loadErr) return { data: null, error: loadErr }
  if (!existing) return { data: null, error: 'Event not found' }

  let computedYear
  try {
    computedYear = computeYear(timeType, timeValue, birthYear)
  } catch (err) {
    return { data: null, error: err.message }
  }

  let sortOrder = existing.sort_order
  if (computedYear !== existing.computed_year) {
    const { count: yearCount, error: countErr } = await supabase
      .from('life_events')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('computed_year', computedYear)
    if (countErr) return { data: null, error: countErr }
    sortOrder = yearCount ?? 0
  }

  const { data, error } = await supabase
    .from('life_events')
    .update({
      title: title.trim(),
      summary: (summary || '').trim(),
      valence,
      intensity,
      time_type: timeType,
      time_value: timeValue,
      computed_year: computedYear,
      sort_order: sortOrder,
      brief: brief === true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Delete an event. RLS scopes to the caller.
export async function deleteLifeEvent(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  if (!id) return { error: 'Event id required' }
  const { error } = await supabase.from('life_events').delete().eq('id', id)
  return { error }
}

// Toggle an event's brief flag. Split out from updateLifeEvent so the UI
// can flip it without re-sending the whole payload.
export async function toggleLifeEventBrief(id, brief) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' }
  }
  if (!id) return { data: null, error: 'Event id required' }
  const { data, error } = await supabase
    .from('life_events')
    .update({ brief: brief === true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Reorder an event within its year group, one step up or down.
//
// Mirrors the original /api/events/reorder behavior:
//   1. fetch all siblings in the same computed_year
//   2. normalize sort_order to 0..n (compact any gaps)
//   3. swap the target with its neighbor in the chosen direction
//
// Returns { error: 'Cannot move in that direction' } if the event is
// already at the edge.
export async function reorderLifeEvent(id, direction, memberId) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  if (!id) return { error: 'Event id required' }
  if (!memberId) return { error: 'Member id required' }
  if (!['up', 'down'].includes(direction)) return { error: 'Invalid direction' }

  // Load the target event to learn its year.
  const { data: event, error: loadErr } = await supabase
    .from('life_events')
    .select('id, computed_year')
    .eq('id', id)
    .eq('member_id', memberId)
    .maybeSingle()
  if (loadErr) return { error: loadErr }
  if (!event) return { error: 'Event not found' }

  // Siblings in the same year, ordered the same way the UI sees them.
  const { data: siblings, error: sibErr } = await supabase
    .from('life_events')
    .select('id, sort_order, created_at')
    .eq('member_id', memberId)
    .eq('computed_year', event.computed_year)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (sibErr) return { error: sibErr }
  if (!siblings || siblings.length < 2) {
    return { error: 'Cannot move in that direction' }
  }

  // Normalize sort_order so the slots are 0..n with no gaps or ties.
  // Do this sequentially rather than in parallel — Supabase's JS client
  // doesn't batch, and we want predictable error surfaces.
  for (let i = 0; i < siblings.length; i += 1) {
    if (siblings[i].sort_order !== i) {
      const { error: normErr } = await supabase
        .from('life_events')
        .update({ sort_order: i })
        .eq('id', siblings[i].id)
      if (normErr) return { error: normErr }
      siblings[i].sort_order = i
    }
  }

  const idx = siblings.findIndex((s) => s.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return { error: 'Cannot move in that direction' }
  }

  // Swap the two sort_order values.
  const { error: err1 } = await supabase
    .from('life_events')
    .update({ sort_order: swapIdx })
    .eq('id', siblings[idx].id)
  if (err1) return { error: err1 }

  const { error: err2 } = await supabase
    .from('life_events')
    .update({ sort_order: idx })
    .eq('id', siblings[swapIdx].id)
  if (err2) return { error: err2 }

  return { error: null }
}
