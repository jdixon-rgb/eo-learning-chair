import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import Wordmark from '@/components/Wordmark'
import BetaTermsModal from '@/components/BetaTermsModal'
import { BUILDER, APP_NAME } from '@/lib/appBranding'
import { APP_VERSION } from '@/lib/version'

// Normalize a user-entered phone string to E.164.
// Returns null if input cannot be confidently parsed.
//
// Rules:
//   - Strings starting with '+' are passed through (digits only after the +).
//   - 10-digit input is assumed US (+1 prefix).
//   - 11-digit input starting with '1' is assumed US (just add +).
//   - Anything else returns null — caller should surface an error.
function toE164(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) return null
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    if (digits.length < 8) return null
    return '+' + digits
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  return null
}

export default function LoginPage() {
  const { profile, loading, signIn, signInWithPhone, verifyPhoneOtp, signInWithGoogle, signInWithMicrosoft } = useAuth()
  const [method, setMethod] = useState('email') // 'email' | 'phone'

  // Email path
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  // Phone path
  const [phone, setPhone] = useState('')
  const [phoneE164, setPhoneE164] = useState(null) // captured at send time so re-edits don't desync
  const [code, setCode] = useState('')
  const [codeStep, setCodeStep] = useState('enter') // 'enter' | 'verify'

  // Shared
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  // Surface rejection from the post-OAuth allowlist check (set in auth.jsx
  // when a signed-in user's email/phone isn't in member_invites).
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem('oauth_rejected')
      if (msg) {
        setError(msg)
        sessionStorage.removeItem('oauth_rejected')
      }
    } catch { /* storage blocked — nothing to do */ }
  }, [])

  if (!loading && profile) {
    const home = profile.role === 'member' ? '/portal'
               : profile.role === 'sap_contact' ? '/sap-portal'
               : '/'
    return <Navigate to={home} replace />
  }

  const switchMethod = (next) => {
    setMethod(next)
    setError('')
    setSent(false)
    setCodeStep('enter')
    setCode('')
  }

  // ── Email magic link ──────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')

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

  // ── Phone OTP: send code ──────────────────────────────────────────
  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    const e164 = toE164(phone)
    if (!e164) {
      setError('Enter a valid phone number (e.g., (480) 555-0123 or +44 20 1234 5678).')
      return
    }
    setSending(true)
    setError('')

    if (isSupabaseConfigured()) {
      const { data: isInvited, error: rpcErr } = await supabase.rpc('is_invited_member', {
        check_phone: e164
      })
      if (rpcErr || !isInvited) {
        setSending(false)
        setError("This phone number isn't registered. Contact your Learning Chair to request access.")
        return
      }
    }

    const { error: err } = await signInWithPhone(e164)
    setSending(false)
    if (err) {
      setError(err.message || 'Could not send code. Please try again.')
    } else {
      setPhoneE164(e164)
      setCodeStep('verify')
    }
  }

  // ── Phone OTP: verify code ────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code.trim() || !phoneE164) return
    setVerifying(true)
    setError('')
    const { error: err } = await verifyPhoneOtp(phoneE164, code.trim())
    setVerifying(false)
    if (err) {
      setError(err.message || 'Invalid or expired code. Try again or request a new one.')
    }
    // On success, useAuth picks up the session and the redirect at the top of
    // this component fires automatically.
  }

  // ── Google OAuth ──────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!acceptedTerms) {
      setError('Please agree to the Terms and Privacy Policy before continuing.')
      return
    }
    setError('')
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setGoogleLoading(false)
      // Never surface raw Supabase error text here — it reads like debug
      // output. Provider-side errors are handled on /auth/callback.
      setError("We couldn't start Google sign-in. Please try again.")
    }
    // On success the browser redirects to Google; no further handling here.
  }

  // ── Microsoft OAuth ───────────────────────────────────────────────
  const handleMicrosoft = async () => {
    if (!acceptedTerms) {
      setError('Please agree to the Terms and Privacy Policy before continuing.')
      return
    }
    setError('')
    setMicrosoftLoading(true)
    const { error: err } = await signInWithMicrosoft()
    if (err) {
      setMicrosoftLoading(false)
      setError("We couldn't start Microsoft sign-in. Please try again.")
    }
  }

  const handleResendCode = async () => {
    if (!phoneE164) return
    setSending(true)
    setError('')
    const { error: err } = await signInWithPhone(phoneE164)
    setSending(false)
    if (err) setError(err.message || 'Could not resend code.')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Wordmark size="xl" className="block mb-2" />
          <p className="text-muted-foreground text-sm">A platform for chapter operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {sent && method === 'email' ? (
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
          ) : method === 'phone' && codeStep === 'verify' ? (
            <>
              <h2 className="text-lg font-semibold text-center mb-1">Enter your code</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                We sent a 6-digit code to <strong>{phoneE164}</strong>.
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Verification code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="mt-1 text-center text-lg tracking-widest"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    maxLength={8}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={verifying || !code.trim()}>
                  {verifying ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</>
                  ) : (
                    'Verify and Sign In'
                  )}
                </Button>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => { setCodeStep('enter'); setCode(''); setError('') }}
                    className="underline underline-offset-2 hover:text-foreground cursor-pointer"
                  >
                    Use a different number
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={sending}
                    className="underline underline-offset-2 hover:text-foreground cursor-pointer disabled:opacity-50"
                  >
                    {sending ? 'Resending…' : 'Resend code'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-center mb-1">Welcome</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {method === 'email'
                  ? 'Sign in with your email to continue'
                  : 'Sign in with a code sent to your phone'}
              </p>

              {/* OAuth buttons — fastest and most reliable path. Sidesteps
                  corporate email gateways that drop magic-link emails. */}
              <div className="mb-5 space-y-2">
                <TermsCheckbox
                  accepted={acceptedTerms}
                  onChange={setAcceptedTerms}
                  onOpenTerms={() => setTermsOpen(true)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogle}
                  disabled={googleLoading || microsoftLoading || !acceptedTerms}
                  className="w-full mt-3"
                >
                  {googleLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting to Google…</>
                  ) : (
                    <>
                      <GoogleIcon className="h-4 w-4 mr-2" />
                      Continue with Google
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMicrosoft}
                  disabled={googleLoading || microsoftLoading || !acceptedTerms}
                  className="w-full"
                >
                  {microsoftLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting to Microsoft…</>
                  ) : (
                    <>
                      <MicrosoftIcon className="h-4 w-4 mr-2" />
                      Continue with Microsoft
                    </>
                  )}
                </Button>
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mt-3">{error}</p>
                )}
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">or</span></div>
              </div>

              {method === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={sending || !email.trim() || !acceptedTerms}>
                    {sending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending magic link…</>
                    ) : (
                      'Send Magic Link'
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    No password needed. We'll email you a secure sign-in link.
                  </p>
                </form>
              ) : (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone number</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(480) 555-0123"
                        className="pl-10"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      US numbers may omit +1. International numbers must start with +.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={sending || !phone.trim() || !acceptedTerms}>
                    {sending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending code…</>
                    ) : (
                      'Send Code'
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground leading-snug">
                    By clicking "Send Code," you agree to receive a one-time SMS
                    verification code from {APP_NAME}. Message and data rates may apply.
                    Reply STOP to opt out, HELP for help.
                  </p>
                </form>
              )}

              {/* Method toggle */}
              <div className="mt-6 pt-4 border-t border-border text-center">
                <button
                  type="button"
                  onClick={() => switchMethod(method === 'email' ? 'phone' : 'email')}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                >
                  {method === 'email' ? 'Use phone instead' : 'Use email instead'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <div className="text-[11px] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground underline underline-offset-2">Privacy</Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="hover:text-foreground underline underline-offset-2">Terms</Link>
            <span className="mx-2">·</span>
            <span>v{APP_VERSION}</span>
          </div>
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

// Official Google "G" mark — plain SVG so we don't add a dep.
function GoogleIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

// Official Microsoft four-square logo — plain SVG so we don't add a dep.
function MicrosoftIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F35325" d="M1 1h10v10H1z"/>
      <path fill="#81BC06" d="M12 1h10v10H12z"/>
      <path fill="#05A6F0" d="M1 12h10v10H1z"/>
      <path fill="#FFBA08" d="M12 12h10v10H12z"/>
    </svg>
  )
}

function TermsCheckbox({ accepted, onChange, onOpenTerms }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
      <Checkbox checked={accepted} onCheckedChange={onChange} className="mt-0.5" />
      <span>
        I acknowledge this is beta software and accept the{' '}
        <button
          type="button"
          onClick={onOpenTerms}
          className="underline underline-offset-2 text-foreground hover:text-primary cursor-pointer"
        >
          Beta Terms
        </button>
        ,{' '}
        <Link to="/privacy" className="underline underline-offset-2 text-foreground hover:text-primary">
          Privacy Policy
        </Link>
        , and{' '}
        <Link to="/terms" className="underline underline-offset-2 text-foreground hover:text-primary">
          Terms of Service
        </Link>
        .
      </span>
    </div>
  )
}
