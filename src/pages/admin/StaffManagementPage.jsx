import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useChapter } from '@/lib/chapter'
import { useBoardStore } from '@/lib/boardStore'
import { useAuth } from '@/lib/auth'
import {
  UserCog, UserPlus, Trash2, Loader2, Link2, Copy, Check, Mail,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Staff are people who act on the chapter's behalf but aren't dues-paying
// members — Executive Director, Experience Coordinator, etc. They live in
// member_invites with a staff app-role but never in chapter_members.
const STAFF_ROLE_OPTIONS = [
  { value: 'chapter_executive_director',     label: 'Executive Director' },
  { value: 'chapter_experience_coordinator', label: 'Experience Coordinator' },
]
const STAFF_ROLES = STAFF_ROLE_OPTIONS.map(o => o.value)
const STAFF_ROLE_LABEL = Object.fromEntries(STAFF_ROLE_OPTIONS.map(o => [o.value, o.label]))

export default function StaffManagementPage() {
  const { activeChapterId } = useChapter()
  const { isSuperAdmin } = useAuth()
  const { upsertStaffInvite } = useBoardStore()

  const [staff, setStaff] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'chapter_executive_director' })
  const [addMsg, setAddMsg] = useState('')
  const [adding, setAdding] = useState(false)

  // Generate-magic-link state (super_admin only)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkResult, setLinkResult] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const fetchStaff = useCallback(async () => {
    if (!isSupabaseConfigured() || !activeChapterId) { setLoading(false); return }
    setLoading(true)
    const [{ data: invites }, { data: profs }] = await Promise.all([
      supabase
        .from('member_invites')
        .select('id,email,full_name,role,chapter_id,claimed_at,created_at')
        .eq('chapter_id', activeChapterId)
        .in('role', STAFF_ROLES)
        .order('full_name'),
      supabase.from('profiles').select('id,email,full_name,role'),
    ])
    setStaff(invites || [])
    setProfiles(profs || [])
    setLoading(false)
  }, [activeChapterId])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const profileByEmail = {}
  for (const p of profiles) {
    if (p.email) profileByEmail[p.email.toLowerCase()] = p
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const name = addForm.name.trim()
    const email = addForm.email.trim()
    if (!email) { setAddMsg('Email is required.'); return }
    setAddMsg('')
    setAdding(true)
    try {
      // upsertStaffInvite expects the chapter_role key, not the app role.
      // Map app role → chapter_role key for the existing helper.
      const roleKey = addForm.role === 'chapter_experience_coordinator' ? 'experience_coordinator' : 'executive_director'
      await upsertStaffInvite({ name, email, roleKey })
      setAddForm({ name: '', email: '', role: 'chapter_executive_director' })
      setAddMsg(`Added ${email}.`)
      await fetchStaff()
    } catch (err) {
      setAddMsg(err.message || 'Failed to add staff.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${row.full_name || row.email} from staff?\n\nThis removes them from the sign-in allowlist.`)) return
    const { error } = await supabase.from('member_invites').delete().eq('id', row.id)
    if (error) { alert(`Delete failed: ${error.message}`); return }
    await fetchStaff()
  }

  const generateMagicLink = async (email) => {
    setLinkModalOpen(true)
    setLinkLoading(true)
    setLinkResult(null)
    setLinkError(null)
    setLinkCopied(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) { setLinkError('Not authenticated.'); return }
      const res = await fetch('/api/admin/generate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ email, redirectTo: window.location.origin }),
      })
      const body = await res.json()
      if (!res.ok) { setLinkError(body.error || `Request failed (HTTP ${res.status})`); return }
      setLinkResult(body)
    } catch (err) {
      setLinkError(err.message || String(err))
    } finally {
      setLinkLoading(false)
    }
  }

  const copyLink = async () => {
    if (!linkResult?.url) return
    try {
      await navigator.clipboard.writeText(linkResult.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Executive Directors, Experience Coordinators, and other non-member chapter staff. Staff can sign in and act on the chapter's behalf but aren't part of the membership roster.
          </p>
        </div>
      </div>

      {/* Add staff form */}
      <div className="rounded-xl border bg-card shadow-sm p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add staff member
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_200px_auto] gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Melissa Groen"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input
              type="email"
              value={addForm.email}
              onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <Select
              value={addForm.role}
              onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
            >
              {STAFF_ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Add
          </Button>
        </form>
        {addMsg && <p className="text-xs mt-2 text-muted-foreground">{addMsg}</p>}
      </div>

      {/* Staff list */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No staff yet. Add someone above.</td></tr>
              ) : staff.map(row => {
                const signedUp = !!profileByEmail[row.email?.toLowerCase()]
                const claimed = !!row.claimed_at
                return (
                  <tr key={row.id} className="border-b last:border-0 group hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{row.full_name || <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className="text-[10px]">{STAFF_ROLE_LABEL[row.role] || row.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {signedUp || claimed ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground text-[10px]">Invited</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isSuperAdmin && (
                          <button
                            onClick={() => generateMagicLink(row.email)}
                            className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="Generate sign-in link (no email) — share OOB"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(row)}
                          className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Remove staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate-magic-link modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Sign-in link
            </DialogTitle>
          </DialogHeader>
          {linkLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating…
            </div>
          ) : linkError ? (
            <div className="rounded-lg border bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {linkError}
            </div>
          ) : linkResult ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                One-time sign-in link for <strong className="text-foreground">{linkResult.target_email}</strong>.
                Share via a secure channel (WhatsApp, SMS, Signal). Anyone who clicks this link will be signed in as that user — treat it like a password.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={linkResult.url || ''}
                  className="text-xs font-mono"
                  onFocus={e => e.target.select()}
                />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
