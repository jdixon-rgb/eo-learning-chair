import { supabase, isSupabaseConfigured } from './supabase'

// Thin CRUD wrappers around Supabase.
// Every function returns { data, error } or { error } to keep the store simple.

export async function fetchAll(table) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).select('*')
}

export async function insertRow(table, data) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).insert(data).select().single()
}

export async function updateRow(table, id, data) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteRow(table, id) {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
  return supabase.from(table).delete().eq('id', id)
}

export async function upsertRow(table, data, conflictColumn) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).upsert(data, { onConflict: conflictColumn }).select().single()
}
