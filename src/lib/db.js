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

export async function fetchByChapter(table, chapterId) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).select('*').eq('chapter_id', chapterId)
}

export async function upsertRow(table, data, conflictColumn) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.from(table).upsert(data, { onConflict: conflictColumn }).select().single()
}

// ── Storage helpers ──

export async function uploadFile(bucket, path, file) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
}

export async function deleteFile(bucket, paths) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.storage.from(bucket).remove(Array.isArray(paths) ? paths : [paths])
}

export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' }
  return supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
}

export async function getSignedDownloadUrl(bucket, path, expiresIn = 3600) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
