import { useEffect, useState } from 'react'
import { TestTube2, Send, Loader2, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  president: 'President',
  president_elect: 'President-Elect',
  learning_chair: 'Learning Chair',
  learning_chair_elect: 'Learning Chair-Elect',
  engagement_chair: 'Engagement Chair',
  finance_chair: 'Finance Chair',
  sap_chair: 'SAP Chair',
  chapter_executive_director: 'Executive Director',
  chapter_experience_coordinator: 'Experience Coordinator',
  regional_learning_chair_expert: 'Regional Learning Expert',
  member: 'Member',
}

export default function TestAccountsLegend() {
  const env = import.meta.env.VITE_APP_ENV
  const isNonProd = env === 'staging' || env === 'development'

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingTo, setSendingTo] = useState(null)
  const [sentTo, setSentTo] = useState(null)

  useEffect(() => {
    if (!isNonProd || !supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('member_invites')
        .select('email, full_name, role, region')
        .like('email', 'jdixon%@aidantaylor.com')
        .order('role', { ascending: true })
      if (!cancelled) {
        setAccounts(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isNonProd])

  if (!isNonProd) return null
  if (loading) return null
  if (accounts.length === 0) return null

  async function sendMagicLink(email) {
    if (!supabase) return
    setSendingTo(email)
    setSentTo(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setSendingTo(null)
    if (!error) {
      setSentTo(email)
      setTimeout(() => setSentTo(null), 4000)
    }
  }

  return (
    <details className="group rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm">
      <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer list-none">
        <TestTube2 className="h-5 w-5 text-amber-700" />
        <div className="flex-1">
          <span className="font-semibold text-amber-900">Test Accounts ({env})</span>
          <span className="ml-2 text-sm text-amber-800">
            {accounts.length} role{accounts.length !== 1 ? 's' : ''} — click to expand
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-amber-700 transition-transform group-open:rotate-180" />
      </summary>

      <div className="px-5 pb-5 pt-1">
        <p className="text-sm text-amber-800 mb-3">
          Magic links to these aliases route to your inbox. Use them to log in as each role
          and experience the actual auth flow per role. This panel is hidden in production.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acct => (
            <div
              key={acct.email}
              className="rounded-lg bg-white border border-amber-200 p-3 text-sm flex flex-col gap-1.5"
            >
              <div className="font-medium text-amber-950">
                {ROLE_LABEL[acct.role] ?? acct.role}
                {acct.region ? <span className="text-xs text-amber-700 font-normal"> · {acct.region}</span> : null}
              </div>
              <div className="text-xs text-muted-foreground font-mono break-all">{acct.email}</div>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-8"
                disabled={sendingTo === acct.email}
                onClick={() => sendMagicLink(acct.email)}
              >
                {sendingTo === acct.email ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                ) : sentTo === acct.email ? (
                  <><Check className="h-3.5 w-3.5" /> Sent</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Send Magic Link</>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
