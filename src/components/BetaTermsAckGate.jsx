import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import BetaTermsModal from '@/components/BetaTermsModal'
import { Button } from '@/components/ui/button'

/**
 * Wraps the authenticated app. When the active user has not acknowledged the
 * current beta terms version, renders a blocking acknowledgment modal in front
 * of the app shell. The modal cannot be dismissed without acknowledging or
 * signing out.
 */
export default function BetaTermsAckGate({ children }) {
  const { session, requiresTermsAck, acknowledgeTerms, signOut } = useAuth()
  const [error, setError] = useState('')

  const handleAck = async () => {
    setError('')
    const { error: ackErr } = await acknowledgeTerms()
    if (ackErr) setError(ackErr.message || 'Failed to record acknowledgment.')
  }

  // Only gate authenticated users; unauthenticated requests reach LoginPage as normal.
  const showGate = !!session && requiresTermsAck

  return (
    <>
      {children}
      <BetaTermsModal open={showGate} blocking onAcknowledge={handleAck} />
      {showGate && error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-destructive text-destructive-foreground rounded-lg px-4 py-3 shadow-lg max-w-md">
          <p className="text-sm mb-2">{error}</p>
          <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      )}
      {showGate && (
        <button
          type="button"
          onClick={signOut}
          className="fixed top-4 right-4 z-[60] text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          Sign out instead
        </button>
      )}
    </>
  )
}
