import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Send a notification to a specific user.
 */
export async function sendNotificationToUser(recipientId, { type = 'general', title, body, eventId = null }) {
  if (!isSupabaseConfigured()) return { error: null, data: null }
  return supabase.from('notifications').insert({
    recipient_id: recipientId,
    type,
    title,
    body,
    event_id: eventId,
  })
}

/**
 * Send a notification to all active members (or a filtered subset).
 * roles: array of role strings to filter recipients (default: all active users).
 */
export async function sendNotificationToMembers({ type = 'announcement', title, body, eventId = null, roles = null }) {
  if (!isSupabaseConfigured()) return { error: null, data: null }

  // Fetch active member IDs
  let query = supabase.from('profiles').select('id').eq('is_active', true)
  if (roles && roles.length > 0) {
    query = query.in('role', roles)
  }
  const { data: profiles, error: fetchErr } = await query
  if (fetchErr || !profiles?.length) return { error: fetchErr, data: null }

  // Insert a notification row for each recipient
  const rows = profiles.map(p => ({
    recipient_id: p.id,
    type,
    title,
    body,
    event_id: eventId,
  }))

  return supabase.from('notifications').insert(rows)
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId) {
  if (!isSupabaseConfigured()) return { error: null }
  return supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId) {
  if (!isSupabaseConfigured()) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return count || 0
}
