import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import Wordmark from '@/components/Wordmark'
import BetaTermsModal from '@/components/BetaTermsModal'
import { BUILDER, APP_NAME } from '@/lib/appBranding'

export default function LoginPage() {
  const { session, profile, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  // Already authenticated (or dev mode) — redirect to appropriate home
  if (!loading && profile) {
    const home = profile.role === 'member' ? '/portal'
               : profile.role === 'sap_contact' ? '/sap-portal'
               : '/'
    return <Navigate to={home} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')

    // Check whitelist before sending magic link
    if (isSupabaseConfigured()) {
      const { data: isInvited, error: rpcErr } = await supabase.rpc('is_invited_member', {
        check_email: email.trim()
      })
      if (rpcErr || !isInvited) {
        setSending(false)
        setError("This email isn't registered. Contact your Learning Chair to request access.")
        return
      }
    }

    const { error: err } = await signIn(email.trim())
    setSending(false)
    if (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Wordmark size="xl" className="block mb-2" />
          <p className="text-muted-foreground text-sm">A platform for chapter operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSent(false); setEmail('') }}>
                Try a different email
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-center mb-1">Welcome</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Sign in with your email to continue
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email address</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={setAcceptedTerms}
                    className="mt-0.5"
                  />
                  <span>
                    I acknowledge this is beta software and accept the{' '}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="underline underline-offset-2 text-foreground hover:text-primary cursor-pointer"
                    >
                      Beta Terms
                    </button>
                    .
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={sending || !email.trim() || !acceptedTerms}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  No password needed. We'll email you a secure sign-in link.
                </p>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground/80 text-[11px]">
            {BUILDER.framing}
            {' · '}
            {BUILDER.url ? (
              <a
                href={BUILDER.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {BUILDER.company}
              </a>
            ) : (
              <span className="text-muted-foreground">{BUILDER.company}</span>
            )}
          </p>
        </div>
      </div>
      <BetaTermsModal open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  )
}
