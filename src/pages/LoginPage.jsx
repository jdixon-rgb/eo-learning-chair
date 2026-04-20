import { useState } from 'react'
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
  const { profile, loading, signIn, signInWithPhone, verifyPhoneOtp } = useAuth()
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
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

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
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <TermsCheckbox
                    accepted={acceptedTerms}
                    onChange={setAcceptedTerms}
                    onOpenTerms={() => setTermsOpen(true)}
                  />

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
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      US numbers may omit +1. International numbers must start with +.
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <TermsCheckbox
                    accepted={acceptedTerms}
                    onChange={setAcceptedTerms}
                    onOpenTerms={() => setTermsOpen(true)}
                  />

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
