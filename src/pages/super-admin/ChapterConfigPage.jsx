import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { USER_ROLES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Save, Trash2, Loader2, UserPlus, Mail, ArrowLeft,
} from 'lucide-react'

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export default function ChapterConfigPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [chapter, setChapter] = useState({
    name: '',
    fiscal_year_start: 8,
    president_theme: '',
    president_name: '',
    currency: 'USD',
    timezone: 'America/Phoenix',
  })
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured() || isNew) {
      setLoading(false)
      return
    }

    const [chapterRes, membersRes, invitesRes] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', id).single(),
      supabase.from('profiles').select('*').eq('chapter_id', id).order('full_name'),
      supabase.from('member_invites').select('*').eq('chapter_id', id).is('claimed_at', null).order('created_at', { ascending: false }),
    ])

    if (chapterRes.data) {
      setChapter(chapterRes.data)
    }
    setMembers(membersRes.data || [])
    setInvites(invitesRes.data || [])
    setLoading(false)
  }, [id, isNew])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')

    if (!isSupabaseConfigured()) {
      setSaveMsg('Database not configured — cannot save.')
      setSaving(false)
      return
    }

    const payload = {
      name: chapter.name,
      fiscal_year_start: chapter.fiscal_year_start,
      president_theme: chapter.president_theme,
      president_name: chapter.president_name,
      currency: chapter.currency || 'USD',
      timezone: chapter.timezone || 'America/Phoenix',
    }

    if (isNew) {
      const { data, error } = await supabase.from('chapters').insert(payload).select().single()
      if (error) {
        setSaveMsg(error.message)
      } else {
        setSaveMsg('Chapter created!')
        navigate(`/super-admin/chapters/${data.id}`, { replace: true })
      }
    } else {
      const { error } = await supabase.from('chapters').update(payload).eq('id', id)
      if (error) {
        setSaveMsg(error.message)
      } else {
        setSaveMsg('Saved!')
      }
    }

    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this chapter? This cannot be undone.')) return

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('chapters').delete().eq('id', id)
      if (error) {
        setSaveMsg(error.message)
        return
      }
    }
    navigate('/super-admin', { replace: true })
  }

  const updateMemberRole = async (memberId, newRole) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    if (isSupabaseConfigured()) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')

    const targetEmail = inviteEmail.trim().toLowerCase()

    if (isSupabaseConfigured()) {
      // Step 1: allowlist the user so is_invited_member() passes during login.
      const { error } = await supabase.from('member_invites').insert({
        email: targetEmail,
        full_name: inviteName.trim(),
        role: inviteRole,
        chapter_id: id,
      })
      if (error) {
        setInviteMsg(error.message.includes('duplicate') ? 'This email is already invited.' : error.message)
        setInviting(false)
        return
      }

      // Step 2: fire a magic-link email so the invitee doesn't have to know
      // they need to visit the login page and self-serve. If this fails the
      // invite row is still in place and they can request a link themselves.
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: window.location.origin },
      })
      if (otpErr) {
        console.warn('[invite] magic link send failed:', otpErr)
        setInviteMsg(`Allowlisted, but magic-link send failed: ${otpErr.message}. Ask them to sign in manually.`)
      } else {
        setInviteMsg(`Invite sent! ${targetEmail} will receive a magic link.`)
      }
    } else {
      setInviteMsg('Invite recorded (offline mode).')
    }

    setInviteEmail('')
    setInviteName('')
    setInviteRole('member')
    setInviting(false)
    fetchData()
    setTimeout(() => setInviteMsg(''), 5000)
  }

  const removeInvite = async (inviteId) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    if (isSupabaseConfigured()) {
      await supabase.from('member_invites').delete().eq('id', inviteId)
    }
  }

  const roleLabel = (roleId) => USER_ROLES.find((r) => r.id === roleId)?.label || roleId

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => navigate('/super-admin')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to chapters
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          {isNew ? 'Create Chapter' : chapter.name || 'Chapter Config'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isNew ? 'Set up a new chapter on the platform' : 'Edit chapter details, members, and invites'}
        </p>
      </div>

      {/* Chapter Details */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold">Chapter Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Chapter Name</label>
            <Input
              value={chapter.name}
              onChange={(e) => setChapter({ ...chapter, name: e.target.value })}
              placeholder="EO Arizona"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Fiscal Year Start</label>
            <select
              value={chapter.fiscal_year_start}
              onChange={(e) => setChapter({ ...chapter, fiscal_year_start: parseInt(e.target.value) })}
              className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">President's Theme</label>
            <Input
              value={chapter.president_theme || ''}
              onChange={(e) => setChapter({ ...chapter, president_theme: e.target.value })}
              placeholder="Theme for the year"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">President's Name</label>
            <Input
              value={chapter.president_name || ''}
              onChange={(e) => setChapter({ ...chapter, president_name: e.target.value })}
              placeholder="Chapter president name"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Currency</label>
            <select
              value={chapter.currency || 'USD'}
              onChange={(e) => setChapter({ ...chapter, currency: e.target.value })}
              className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background cursor-pointer"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CNY">CNY — Chinese Yuan</option>
              <option value="JPY">JPY — Japanese Yen</option>
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="CAD">CAD — Canadian Dollar</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Timezone</label>
            <select
              value={chapter.timezone || 'America/Phoenix'}
              onChange={(e) => setChapter({ ...chapter, timezone: e.target.value })}
              className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background cursor-pointer"
            >
              <option value="America/Phoenix">America/Phoenix (Arizona)</option>
              <option value="America/Los_Angeles">America/Los Angeles</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/New_York">America/New York</option>
              <option value="America/Toronto">America/Toronto</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Madrid">Europe/Madrid (Barcelona)</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="Asia/Hong_Kong">Asia/Hong Kong</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !chapter.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? 'Create Chapter' : 'Save Changes'}
          </Button>
          {!isNew && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete Chapter
            </Button>
          )}
          {saveMsg && (
            <p className={`text-xs ${saveMsg.includes('Saved') || saveMsg.includes('created') ? 'text-green-600' : 'text-destructive'}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* Members Table (only for existing chapters) */}
      {!isNew && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold">Members ({members.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{member.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        className="text-xs rounded-lg px-2 py-1 border border-border bg-background cursor-pointer"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-green-500/10 text-green-600 text-[10px]">Active</Badge>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No members in this chapter yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {!isNew && invites.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold">Pending Invites ({invites.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Invite</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-center px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors opacity-60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{inv.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{roleLabel(inv.role)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeInvite(inv.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove invite"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Form */}
      {!isNew && (
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Member
          </h3>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Full name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="text-sm rounded-lg px-3 py-2 border border-border bg-background cursor-pointer"
            >
              {USER_ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="shrink-0">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
            </Button>
          </form>
          {inviteMsg && (
            <p className={`text-xs mt-2 ${inviteMsg.includes('sent') ? 'text-green-600' : 'text-destructive'}`}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
