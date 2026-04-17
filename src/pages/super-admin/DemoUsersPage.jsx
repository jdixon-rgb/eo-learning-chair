// Super-admin → Demo Users management.
//
// Create / revoke `demo_user` accounts. A demo_user is locked into Mock Mode
// for life — the client-side auth gate short-circuits Supabase reads/writes
// for anyone with this role, so handing out demo access is risk-free.
//
// Invites go into member_invites with role='demo_user', chapter_id=NULL
// (demo_user is platform-scoped, not chapter-scoped). The existing
// handle_new_user() trigger stamps the role onto the profile on first sign-in.

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, UserPlus, CheckCircle2, Sparkles } from 'lucide-react'

export default function DemoUsersPage() {
  const [invites, setInvites] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', note: '' })
  const [message, setMessage] = useState(null)

  const fetchData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: inv }, { data: pro }] = await Promise.all([
      supabase.from('member_invites')
        .select('id, email, full_name, role, claimed_at, created_at')
        .eq('role', 'demo_user')
        .order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('role', 'demo_user'),
    ])
    setInvites(inv || [])
    setProfiles(pro || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.name.trim()) return
    setSubmitting(true)
    setMessage(null)
    const { error } = await supabase.from('member_invites').insert({
      email: form.email.trim().toLowerCase(),
      full_name: form.name.trim() + (form.note.trim() ? ` — ${form.note.trim()}` : ''),
      role: 'demo_user',
      chapter_id: null,
    })
    if (error) {
      setMessage({
        type: 'error',
        text: error.message.includes('duplicate')
          ? 'That email is already on the allowlist.'
          : error.message,
      })
    } else {
      setMessage({ type: 'success', text: `Invite created for ${form.email}. Share the login link and they can sign in.` })
      setForm({ email: '', name: '', note: '' })
      fetchData()
    }
    setSubmitting(false)
  }

  const handleRevoke = async (row, isProfile) => {
    if (!window.confirm(`Revoke demo access for ${row.email}?`)) return
    if (isProfile) {
      // Flip their role off demo_user so next sign-in is rejected by the role check
      await supabase.from('profiles').update({ role: 'member' }).eq('id', row.id)
    } else {
      await supabase.from('member_invites').delete().eq('id', row.id)
    }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Provision read-only demo accounts for external stakeholders. Anyone with a demo_user
          role is locked into Mock Mode — they can explore the demo world but never see real chapter data.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-eo-blue" />
          <h2 className="text-sm font-semibold">Invite a Demo User</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            type="email"
            placeholder="email@domain.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={submitting}
          />
          <Input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={submitting}
          />
          <Input
            placeholder="Role / note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            disabled={submitting}
          />
          <div className="md:col-span-3">
            <Button type="submit" disabled={submitting || !form.email.trim() || !form.name.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Invite
            </Button>
          </div>
        </form>
        {message && (
          <div className={`mt-3 text-sm flex items-center gap-2 ${
            message.type === 'success' ? 'text-green-700' : 'text-eo-pink'
          }`}>
            {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Active demo accounts */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-eo-pink" />
          <h2 className="text-sm font-semibold">Active Demo Users</h2>
          <span className="text-xs text-muted-foreground">
            ({profiles.length} claimed · {invites.filter(i => !i.claimed_at).length} pending invite)
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-eo-blue" />
          </div>
        ) : profiles.length === 0 && invites.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No demo users yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y">
            {profiles.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.full_name || '(no name)'}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="success" className="text-xs">Active</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(p, true)}
                    className="text-eo-pink hover:bg-eo-pink/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
            {invites.filter(i => !i.claimed_at).map(i => (
              <div key={i.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.full_name || '(no name)'}</p>
                  <p className="text-xs text-muted-foreground truncate">{i.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="coral" className="text-xs">Pending</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(i, false)}
                    className="text-eo-pink hover:bg-eo-pink/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">How demo access works</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>You create an invite here. The email is added to the sign-in allowlist as role <code className="px-1 py-0.5 bg-muted rounded">demo_user</code>.</li>
          <li>Share the login URL with them. They enter their email and receive a magic link.</li>
          <li>First sign-in stamps their profile with role <code className="px-1 py-0.5 bg-muted rounded">demo_user</code>. They land on the /demo persona switcher and can never access real data.</li>
          <li>Revoking changes their role to <code className="px-1 py-0.5 bg-muted rounded">member</code> (if claimed) or deletes the invite (if pending).</li>
        </ol>
      </div>
    </div>
  )
}
