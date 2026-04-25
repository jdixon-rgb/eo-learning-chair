import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import Wordmark from '@/components/Wordmark'
import { APP_VERSION } from '@/lib/version'

// Standalone "we don't recognize that email" page. Shown when an OAuth
// or magic-link sign-in succeeds at the provider but the email isn't on
// the chapter's allowlist (member_invites + domain wildcards).
export default function AccessNeededPage() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const e = params.get('email')
    if (e) setEmail(e)
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Wordmark size="xl" className="block mb-2" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-center mb-3">
            We don't recognize that email
          </h1>

          {email && (
            <p className="text-center mb-5">
              <span className="inline-block bg-muted text-foreground px-3 py-1.5 rounded-md text-sm break-all max-w-full">
                {email}
              </span>
            </p>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Your sign-in worked, but this address isn't on your chapter's roster.
            A few possibilities — you might have signed in with a personal account
            by mistake instead of your chapter email, or there's a typo somewhere
            we can sort out.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            If you should have access, your Learning Chair can add you from the
            chapter admin in under a minute. Reach out to them and they'll get
            you in.
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link to="/login">Try a different account</Link>
            </Button>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-muted-foreground">
          v{APP_VERSION}
        </div>
      </div>
    </div>
  )
}
