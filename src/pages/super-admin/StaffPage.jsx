import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { EO_REGIONS } from '@/lib/constants'
import {
  UserPlus, Trash2, Loader2, Link2, Copy, Check, UserCog,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/lib/pageHeader'

// Staff roles are non-member positions paid by EO Global or by the
// chapter. Regional Managers span multiple chapters (region-scoped, no
// chapter_id). Executive Directors and Experience Coordinators are
// chapter-bound (chapter_id set, no region).
//
// Distinct from Regional Experts (regional_learning_chair_expert et al.):
// those are EO MEMBERS volunteering in a cross-chapter oversight capacity.
// This page is non-members only.
const STAFF_ROLE_OPTIONS = [
  { value: 'regional_manager',               label: 'Regional Manager',          scope: 'region'  },
  { value: 'chapter_executive_director',     label: 'Executive Director',        scope: 'chapter' },
  { value: 'chapter_experience_coordinator', label: 'Experience Coordinator',    scope: 'chapter' },
]
const STAFF_ROLES = STAFF_ROLE_OPTIONS.map(o => o.value)
const STAFF_ROLE_LABEL = Object.fromEntries(STAFF_ROLE_OPTIONS.map(o => [o.value, o.label]))
const STAFF_ROLE_SCOPE = Object.fromEntries(STAFF_ROLE_OPTIONS.map(o => [o.value, o.scope]))

export default function StaffPage() {
  const { isSuperAdmin } = useAuth()
  const { allChapters } = useChapter()

  const [rows, setRows] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'regional_manager',
    region: '',
    chapterId: '',
  })
  const [addMsg, setAddMsg] = useState('')
  const [adding, setAdding] = useState(false)

  // Generate-magic-link state
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkResult, setLinkResult] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const [{ data: invites }, { data: profs }] = await Promise.all([
      supabase
        .from('member_invites')
        .select('id,email,full_name,role,region,chapter_id,claimed_at,created_at')
        .in('role', STAFF_ROLES)
        .order('role')
        .order('full_name'),
      supabase.from('profiles').select('id,email,full_name,role,region,chapter_id'),
    ])
    setRows(invites || [])
    setProfiles(profs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  const profileByEmail = {}
  for (const p of profiles) {
    if (p.email) profileByEmail[p.email.toLowerCase()] = p
  }

  const chapterById = useMemo(() => {
    const m = new Map()
    for (const c of allChapters) m.set(c.id, c)
    return m
  }, [allChapters])

  const sortedChapters = useMemo(() => {
    return [...allChapters].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [allChapters])

  // Region suggestions mirror Regional Experts: canonical EO_REGIONS plus
  // any regions already tagged on chapters.
  const regionSuggestions = useMemo(() => {
    const fromCanonical = EO_REGIONS
      .map(r => r.label)
      .filter(l => l !== 'Other (not yet classified)')
    const fromChapters = allChapters
      .map(c => (c.region || '').trim())
      .filter(Boolean)
    return [...new Set([...fromCanonical, ...fromChapters])]
      .sort((a, b) => a.localeCompare(b))
  }, [allChapters])

  const currentScope = STAFF_ROLE_SCOPE[addForm.role]

  const handleAdd = async (e) => {
    e.preventDefault()
    const name = addForm.name.trim()
    const email = addForm.email.trim().toLowerCase()
    const role = addForm.role
    if (!email) { setAddMsg('Email is required.'); return }
    if (!STAFF_ROLES.includes(role)) { setAddMsg('Invalid role.'); return }

    let region = null
    let chapter_id = null
    if (STAFF_ROLE_SCOPE[role] === 'region') {
      region = addForm.region.trim()
      if (!region) { setAddMsg('Region is required for Regional Manager.'); return }
    } else {
      chapter_id = addForm.chapterId
      if (!chapter_id) { setAddMsg('Chapter is required for chapter staff.'); return }
    }

    setAddMsg('')
    setAdding(true)
    try {
      const { error } = await supabase
        .from('member_invites')
        .upsert(
          { email, full_name: name || null, role, region, chapter_id },
          { onConflict: 'email' }
        )
      if (error) throw error
      setAddForm({ name: '', email: '', role: 'regional_manager', region: '', chapterId: '' })
      setAddMsg(`Added ${email}.`)
      await fetchRows()
    } catch (err) {
      setAddMsg(err.message || 'Failed to add staff.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${row.full_name || row.email}?\n\nThis revokes their sign-in allowlist entry. Their existing profile (if they've signed in) is not deleted.`)) return
    const { error } = await supabase.from('member_invites').delete().eq('id', row.id)
    if (error) { alert(`Delete failed: ${error.message}`); return }
    await fetchRows()
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
      <PageHeader
        title="Staff"
        subtitle="Non-member positions paid by EO Global or by the chapter. Regional Managers span chapters in a region; Executive Directors and Experience Coordinators are chapter-bound. (For member experts like Regional Learning Chair Expert, see Regional Experts.)"
      />

      <div className="rounded-xl border bg-card shadow-sm p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite staff
        </h2>
        <datalist id="staff-region-suggestions">
          {regionSuggestions.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_220px_220px_auto] gap-2 items-end"
        >
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Jane Doe"
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
          {currentScope === 'region' ? (
            <div>
              <label className="text-xs text-muted-foreground">Region</label>
              <Input
                value={addForm.region}
                onChange={e => setAddForm(f => ({ ...f, region: e.target.value }))}
                placeholder="U.S. West"
                list="staff-region-suggestions"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground">Chapter</label>
              <Select
                value={addForm.chapterId}
                onChange={e => setAddForm(f => ({ ...f, chapterId: e.target.value }))}
                required
              >
                <option value="">Select chapter…</option>
                {sortedChapters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Invite
          </Button>
        </form>
        {addMsg && <p className="text-xs mt-2 text-muted-foreground">{addMsg}</p>}
        <p className="text-[11px] text-muted-foreground mt-3">
          Regional Manager needs a region label (suggestions appear as you type) that matches the labels you've tagged on chapters. Chapter staff are tied to one chapter — pick from the dropdown.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <UserCog className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No staff invited yet. Invite one above.
                  </td>
                </tr>
              ) : rows.map(row => {
                const signedUp = !!profileByEmail[row.email?.toLowerCase()]
                const claimed = !!row.claimed_at
                const scopeLabel = STAFF_ROLE_SCOPE[row.role] === 'region'
                  ? (row.region || <span className="text-destructive italic">missing region</span>)
                  : (chapterById.get(row.chapter_id)?.name || <span className="text-destructive italic">missing chapter</span>)
                return (
                  <tr key={row.id} className="border-b last:border-0 group hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{row.full_name || <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className="text-[10px]">{STAFF_ROLE_LABEL[row.role] || row.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className="text-[10px]">{scopeLabel}</Badge>
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
                          title="Remove"
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
                Share via a secure channel (WhatsApp, SMS, Signal). Anyone who clicks this link will be signed in as that user. Treat it like a password.
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
