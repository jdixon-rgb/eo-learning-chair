import { supabase, isSupabaseConfigured } from './supabase'

// Fetch the currently in-effect terms version (latest with effective_date <= today).
// Returns { id, version, effective_date, content_md, summary } or null if Supabase
// isn't configured (dev mode without backend).
export async function fetchCurrentBetaTerms() {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.rpc('current_beta_terms_version')
  if (error || !data || data.length === 0) return null
  return data[0]
}

// Has the current authenticated user acknowledged the current terms version?
// Returns true / false. Returns true in dev mode (no backend) so the gate
// doesn't block local development.
export async function hasAckedCurrentBetaTerms() {
  if (!isSupabaseConfigured()) return true
  const { data, error } = await supabase.rpc('has_acked_current_beta_terms')
  if (error) return false
  return !!data
}

// Record that the current authenticated user accepted the given terms version.
// versionId comes from fetchCurrentBetaTerms().id.
export async function acknowledgeBetaTerms(versionId) {
  if (!isSupabaseConfigured()) return { error: null }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { message: 'Not authenticated' } }
  const { error } = await supabase
    .from('beta_terms_acknowledgments')
    .insert({
      user_id: user.id,
      version_id: versionId,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
  return { error }
}
