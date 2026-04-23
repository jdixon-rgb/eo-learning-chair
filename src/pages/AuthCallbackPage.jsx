import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Wordmark from '@/components/Wordmark'

// Dedicated landing page for OAuth (Google, etc.) redirects.
// Without this, users briefly land on "/" with the raw Supabase token
// hash in the address bar (#access_token=eyJ…&refresh_token=…) and a
// generic "Loading…" spinner — which looks like debug output, not a
// product. This page strips the hash, surfaces any provider error
// humanely, and shows a branded "Signing you in…" state while Supabase
// establishes the session.
export default function AuthCallbackPage() {
  const { session, profile, loading } = useAuth()
  const [providerError, setProviderError] = useState(null)

  useEffect(() => {
    // Capture any OAuth provider error (?error=access_denied&error_description=…).
    // Supabase-JS v2 parses the token hash asynchronously during its own init
    // and cleans the URL itself once tokens are saved — we must NOT strip the
    // hash here, or we race Supabase and destroy the tokens before they're read.
    try {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      const desc = params.get('error_description')
      if (err) {
        const msg = humanizeOAuthError(err, desc)
        try { sessionStorage.setItem('oauth_rejected', msg) } catch { /* no-op */ }
        setProviderError(msg)
      }
    } catch { /* no-op */ }
  }, [])

  if (providerError) return <Navigate to="/login" replace />

  // Auth resolved with a profile — route to the role's home.
  if (!loading && profile) {
    const home =
      profile.role === 'member' ? '/portal'
      : profile.role === 'sap_contact' ? '/sap-portal'
      : '/'
    return <Navigate to={home} replace />
  }

  // Auth resolved with no session or profile — allowlist rejected us.
  // auth.jsx already wrote the rejection message to sessionStorage;
  // LoginPage will display it.
  if (!loading && !session && !profile) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <Wordmark size="xl" className="block mb-6" />
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-lg font-semibold mb-1">Signing you in…</h1>
        <p className="text-sm text-muted-foreground">
          Just a moment while we confirm your account.
        </p>
      </div>
    </div>
  )
}

function humanizeOAuthError(code, description) {
  const c = (code || '').toLowerCase()
  const d = (description || '').toLowerCase()
  if (c === 'access_denied' || d.includes('cancel')) {
    return 'Sign-in was cancelled. You can try again whenever you’re ready.'
  }
  if (d.includes('network') || d.includes('timeout')) {
    return 'We couldn’t reach Google. Check your connection and try again.'
  }
  return 'Google sign-in didn’t complete. Please try again.'
}
