// Vercel Serverless Function — Admin: Generate Magic Link Without Sending Email
//
// Lets a super_admin produce a real, signed magic-link sign-in URL for a
// specific user, without going through the email channel. Used to unblock
// users whose corporate email gateway is dropping our magic-link emails
// (delivered to the MX with 250 OK but never reaching the inbox).
//
// Flow:
//   1. Caller (super_admin) POSTs { email, redirectTo } with their bearer JWT.
//   2. We verify the bearer JWT belongs to a profile with role = 'super_admin'.
//   3. We use the service-role key to call auth.admin.generateLink() with
//      type='magiclink' and the requested email.
//   4. The returned action_link is a single-use URL valid until expiry; the
//      super_admin shares it with the user via a secure out-of-band channel
//      (WhatsApp, SMS, Signal, in-person, etc.).
//
// Required env vars (set in Vercel → Settings → Environment Variables):
//   SUPABASE_URL                 — your project URL
//   SUPABASE_ANON_KEY            — anon key (used to verify caller's JWT)
//   SUPABASE_SERVICE_ROLE_KEY    — service role key (admin operations)
//
// VITE_-prefixed variants are also accepted as fallbacks.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, redirectTo } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Server misconfigured: Supabase URL/anon key not set' })
  }
  if (!serviceKey) {
    return res.status(500).json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' })
  }

  // Verify caller's JWT and that they are super_admin.
  const authHeader = req.headers.authorization || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return res.status(401).json({ error: 'Missing Authorization header' })

  const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const supabaseService = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: profile, error: profileErr } = await supabaseService
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileErr || profile?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: super_admin only' })
  }

  // Generate the magic link without sending an email. Supabase returns the
  // action_link in data.properties.action_link.
  const generateOptions = {
    type: 'magiclink',
    email: email.trim().toLowerCase(),
  }
  if (redirectTo && typeof redirectTo === 'string') {
    generateOptions.options = { redirectTo }
  }

  const { data: linkData, error: linkErr } = await supabaseService.auth.admin.generateLink(generateOptions)

  if (linkErr) {
    console.error('admin.generateLink error:', linkErr)
    return res.status(500).json({ error: linkErr.message || 'generateLink failed' })
  }

  return res.status(200).json({
    url: linkData?.properties?.action_link,
    target_email: email.trim().toLowerCase(),
    issued_by: userData.user.email,
    issued_at: new Date().toISOString(),
  })
}
