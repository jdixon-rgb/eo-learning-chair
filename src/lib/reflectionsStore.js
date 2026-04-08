// Reflections store — thin wrappers over Supabase.
// Pattern matches src/lib/db.js; kept self-contained to avoid touching shared files.

import { supabase, isSupabaseConfigured } from './supabase'

// ── Current member resolution ───────────────────────────────
// The auth user's email is matched against chapter_members.email to
// find their chapter_members row and forum assignment. RLS also uses
// this linkage server-side via current_chapter_member_id().
export async function loadCurrentMember(userEmail) {
  if (!isSupabaseConfigured() || !userEmail) return { data: null, error: null }
  const { data, error } = await supabase
    .from('chapter_members')
    .select('id, chapter_id, first_name, last_name, name, email, forum')
    .ilike('email', userEmail)
    .maybeSingle()
  return { data, error }
}

// ── Templates ───────────────────────────────────────────────
export async function loadTemplates() {
  if (!isSupabaseConfigured()) return { data: [], error: null }
  const { data, error } = await supabase
    .from('reflection_templates')
    .select('*')
    .order('sort_order')
  return { data: data || [], error }
}

// ── Feelings library ────────────────────────────────────────
export async function loadFeelings() {
  if (!isSupabaseConfigured()) return { data: [], error: null }
  const { data, error } = await supabase
    .from('reflection_feelings')
    .select('*')
    .order('word')
  return { data: data || [], error }
}

export async function addFeeling(word) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  const clean = word.trim()
  if (!clean) return { data: null, error: 'Empty word' }
  // Case-insensitive duplicate check handled by unique index on word.
  const { data, error } = await supabase
    .from('reflection_feelings')
    .insert({ word: clean, source: 'user' })
    .select()
    .single()
  return { data, error }
}

// ── Reflections ─────────────────────────────────────────────
export async function loadMyReflections(memberId) {
  if (!isSupabaseConfigured() || !memberId) return { data: [], error: null }
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('member_id', memberId)
    .order('updated_at', { ascending: false })
  return { data: data || [], error }
}

export async function createReflection(payload) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  const { data, error } = await supabase
    .from('reflections')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function updateReflection(id, patch) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  const { data, error } = await supabase
    .from('reflections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteReflection(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  return supabase.from('reflections').delete().eq('id', id)
}

export async function clearAllReflections(memberId, forum) {
  if (!isSupabaseConfigured() || !memberId) return { error: 'Supabase not configured' }
  return supabase
    .from('reflections')
    .delete()
    .eq('member_id', memberId)
    .eq('forum', forum)
}

// ── Parking lot ─────────────────────────────────────────────
export async function loadParkingLot(chapterId, forum) {
  if (!isSupabaseConfigured() || !chapterId || !forum) return { data: [], error: null }
  const { data, error } = await supabase
    .from('parking_lot_entries')
    .select('*')
    .eq('chapter_id', chapterId)
    .eq('forum', forum)
  if (error) return { data: [], error }
  // Sort by combined (importance + urgency) desc, client-side.
  const sorted = (data || [])
    .slice()
    .sort((a, b) => (b.importance + b.urgency) - (a.importance + a.urgency))
  return { data: sorted, error: null }
}

export async function createParkingLotEntry(payload) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  const { data, error } = await supabase
    .from('parking_lot_entries')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function updateParkingLotEntry(id, patch) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  const { data, error } = await supabase
    .from('parking_lot_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteParkingLotEntry(id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  return supabase.from('parking_lot_entries').delete().eq('id', id)
}
