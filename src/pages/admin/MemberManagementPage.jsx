import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { USER_ROLES } from '@/lib/constants'
import { Users, Search, ClipboardList, Mail, UserPlus, Trash2, Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Mock data for dev mode
const MOCK_MEMBERS = [
  { id: '1', email: 'john@eoarizona.com', full_name: 'John Dixon', role: 'learning_chair', company: 'Acme Corp', is_active: true, survey_completed_at: null, status: 'active' },
  { id: '2', email: 'sarah@eoarizona.com', full_name: 'Sarah Martinez', role: 'committee_member', company: 'Martinez Group', is_active: true, survey_completed_at: '2025-12-15T00:00:00Z', status: 'active' },
  { id: '3', email: 'mike@eoarizona.com', full_name: 'Mike Johnson', role: 'member', company: 'JTech Solutions', is_active: true, survey_completed_at: null, status: 'active' },
  { id: '4', email: 'newbie@eoarizona.com', full_name: 'Pending Person', role: 'member', company: '', is_active: false, survey_completed_at: null, status: 'invited' },
]

export default function MemberManagementPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false)
  const [bulkCsv, setBulkCsv] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const fetchMembers = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMembers(MOCK_MEMBERS)
      setLoading(false)
      return
    }

    // Fetch active profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    // Fetch pending (unclaimed) invites
    const { data: invites } = await supabase
      .from('member_invites')
      .select('*')
      .is('claimed_at', null)
      .order('created_at', { ascending: false })

    const active = (profiles || []).map(p => ({ ...p, status: 'active' }))
    const claimedEmails = new Set(active.map(p => p.email.toLowerCase()))

    const pending = (invites || [])
      .filter(inv => !claimedEmails.has(inv.email.toLowerCase()))
      .map(inv => ({
        id: inv.id,
        email: inv.email,
        full_name: inv.full_name,
        role: inv.role,
        company: '',
        is_active: false,
        survey_completed_at: null,
        status: 'invited',
        invite_id: inv.id,
      }))

    setMembers([...active, ...pending])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const updateRole = async (memberId, newRole) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    if (isSupabaseConfigured()) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('member_invites').insert({
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim(),
        role: inviteRole,
      })
      if (error) {
        setInviteMsg(error.message.includes('duplicate') ? 'This email is already invited.' : error.message)
        setInviting(false)
        return
      }
    }

    setInviteMsg('Invite added!')
    setInviteEmail('')
    setInviteName('')
    setInviteRole('member')
    setInviting(false)
    fetchMembers()
    setTimeout(() => setInviteMsg(''), 3000)
  }

  const removeInvite = async (inviteId) => {
    setMembers(prev => prev.filter(m => m.id !== inviteId))
    if (isSupabaseConfigured()) {
      await supabase.from('member_invites').delete().eq('id', inviteId)
    }
  }

  const VALID_ROLES = new Set(USER_ROLES.map(r => r.id))

  const handleBulkImport = async () => {
    if (!bulkCsv.trim()) return
    setBulkImporting(true)
    setBulkMsg('')

    const lines = bulkCsv.trim().split('\n').filter(l => l.trim())
    const rows = []
    const errors = []

    for (let i = 0; i < lines.length; i++) {
      // Support CSV (comma) or TSV (tab) — auto-detect
      const sep = lines[i].includes('\t') ? '\t' : ','
      const parts = lines[i].split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''))
      const [email, full_name, role] = parts

      if (!email || !email.includes('@')) {
        // Skip header rows or blank lines
        if (i === 0 && (email?.toLowerCase() === 'email' || !email)) continue
        errors.push(`Line ${i + 1}: invalid email "${email || ''}"`)
        continue
      }

      const resolvedRole = role && VALID_ROLES.has(role) ? role : 'member'
      rows.push({ email: email.toLowerCase(), full_name: full_name || '', role: resolvedRole })
    }

    if (rows.length === 0) {
      setBulkMsg(errors.length ? errors.join('; ') : 'No valid rows found.')
      setBulkImporting(false)
      return
    }

    if (isSupabaseConfigured()) {
      // Insert in batches of 50 to avoid payload limits
      let inserted = 0
      let dupes = 0
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error, count } = await supabase
          .from('member_invites')
          .upsert(batch, { onConflict: 'email', ignoreDuplicates: true })
        if (error) {
          errors.push(error.message)
        } else {
          inserted += batch.length
        }
      }
      dupes = rows.length - inserted + dupes
      setBulkMsg(`Imported ${inserted} members.${dupes > 0 ? ` ${dupes} duplicates skipped.` : ''}${errors.length ? ` Errors: ${errors.join('; ')}` : ''}`)
    } else {
      setBulkMsg(`Parsed ${rows.length} members (dev mode — not saved).`)
    }

    setBulkCsv('')
    setBulkImporting(false)
    fetchMembers()
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.full_name || '').toLowerCase().includes(q)
      || (m.email || '').toLowerCase().includes(q)
      || (m.company || '').toLowerCase().includes(q)
  })

  const activeCount = members.filter(m => m.status === 'active').length
  const invitedCount = members.filter(m => m.status === 'invited').length
  const roleLabel = (roleId) => USER_ROLES.find(r => r.id === roleId)?.label || roleId

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-eo-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-eo-blue" />
            Members
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active · {invitedCount} invited · {members.filter(m => m.survey_completed_at).length} surveys completed
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Add Member form */}
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-eo-blue" />
          Add Member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            type="text"
            placeholder="Full name"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            className="flex-1"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 border border-border bg-background cursor-pointer"
          >
            {USER_ROLES.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="shrink-0">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </form>
        {inviteMsg && (
          <p className={`text-xs mt-2 ${inviteMsg.includes('added') ? 'text-green-600' : 'text-eo-pink'}`}>
            {inviteMsg}
          </p>
        )}
      </div>

      {/* Bulk Import */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-eo-blue" />
            Bulk Import from Spreadsheet
          </span>
          {showBulk ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showBulk && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Paste rows from your spreadsheet. Each row: <strong>email, full name, role</strong> (comma or tab separated).
              Role is optional — defaults to "member". Valid roles: member, committee_member, board_liaison, learning_chair, chapter_experience_coordinator, chapter_executive_director.
            </p>
            <textarea
              value={bulkCsv}
              onChange={e => setBulkCsv(e.target.value)}
              placeholder={"jane@example.com, Jane Smith, member\ntom@example.com, Tom Lee, committee_member\nkim@example.com, Kim Park"}
              rows={6}
              className="w-full text-sm rounded-lg px-3 py-2 border border-border bg-background font-mono resize-y"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkCsv.trim()}>
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  `Import ${bulkCsv.trim() ? bulkCsv.trim().split('\n').filter(l => l.trim()).length : 0} rows`
                )}
              </Button>
              {bulkMsg && (
                <p className={`text-xs ${bulkMsg.includes('Error') ? 'text-eo-pink' : 'text-green-600'}`}>
                  {bulkMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Member table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">
                  <ClipboardList className="h-4 w-4 mx-auto" />
                </th>
                <th className="text-center px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(member => (
                <tr key={member.id} className={`hover:bg-muted/30 transition-colors ${member.status === 'invited' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{member.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {member.company || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {member.status === 'active' ? (
                      <select
                        value={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value)}
                        className="text-xs rounded-lg px-2 py-1 border border-border bg-background cursor-pointer"
                      >
                        {USER_ROLES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{roleLabel(member.role)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {member.status === 'active' ? (
                      <Badge className="bg-green-500/10 text-green-600 text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Invited</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {member.status === 'active' && (
                      member.survey_completed_at ? (
                        <Badge className="bg-green-500/10 text-green-600 text-[10px]">Done</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {member.status === 'invited' && (
                      <button
                        onClick={() => removeInvite(member.id)}
                        className="text-muted-foreground hover:text-eo-pink transition-colors"
                        title="Remove invite"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No members found</p>
          </div>
        )}
      </div>
    </div>
  )
}
