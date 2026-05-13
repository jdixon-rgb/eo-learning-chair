import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useChapter } from '@/lib/chapter'
import { Heart, Loader2, Trash2, Search, Cake, CalendarHeart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/lib/pageHeader'

// Inline status pill mirroring slps.invite_status values.
const INVITE_STATUS_STYLE = {
  not_invited: { label: 'Not invited', cls: 'border-muted-foreground/30 text-muted-foreground' },
  pending:     { label: 'Invited',     cls: 'border-amber-300 text-amber-700 bg-amber-50' },
  active:      { label: 'Active',      cls: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  revoked:     { label: 'Revoked',     cls: 'border-muted-foreground/40 text-muted-foreground line-through' },
}

// Format a YYYY-MM-DD date as e.g. "Mar 19, 1967". Returns '—' when null.
function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return d }
}

export default function SLPManagementPage() {
  const { activeChapterId } = useChapter()
  const [rows, setRows] = useState([])
  const [slpForums, setSlpForums] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured() || !activeChapterId) { setLoading(false); return }
    setLoading(true)
    const [{ data, error }, { data: forumData }] = await Promise.all([
      supabase
        .from('slps')
        .select(`
          id, name, relationship_type, dob, anniversary, kids,
          dietary_restrictions, allergies, notes, forum, email, phone,
          invite_status, invited_at, created_at,
          member:chapter_members!inner ( id, name, email )
        `)
        .eq('chapter_id', activeChapterId)
        .order('name', { ascending: true }),
      supabase
        .from('forums')
        .select('id, name, is_active, population')
        .eq('chapter_id', activeChapterId)
        .eq('population', 'slp')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])
    if (error) console.error('load SLPs error:', error)
    setRows(data || [])
    setSlpForums(forumData || [])
    setLoading(false)
  }, [activeChapterId])

  useEffect(() => { fetchRows() }, [fetchRows])

  // Update slps.forum (admin can move an SLP between SLP forums).
  // Empty string = unassigned. RLS allows is_slp_admin to update.
  const handleForumChange = async (row, nextForum) => {
    const prev = row.forum || ''
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, forum: nextForum } : r))
    const { error } = await supabase
      .from('slps')
      .update({ forum: nextForum, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) {
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, forum: prev } : r))
      alert(`Forum update failed: ${error.message}`)
    }
  }

  const handleDelete = async (row) => {
    const memberName = row.member?.name || 'this member'
    if (!confirm(`Remove ${row.name || 'SLP'} for ${memberName}?\n\nThis deletes the SLP record. The member can re-add from their profile.`)) return
    const { error } = await supabase.from('slps').delete().eq('id', row.id)
    if (error) { alert(`Delete failed: ${error.message}`); return }
    await fetchRows()
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.member?.name || '').toLowerCase().includes(q) ||
        (r.dietary_restrictions || '').toLowerCase().includes(q) ||
        (r.allergies || '').toLowerCase().includes(q)
      )
    : rows

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Significant Life Partners"
        subtitle={`${rows.length} SLP${rows.length === 1 ? '' : 's'} on file · members manage their own via profile`}
      />

      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by member, SLP, dietary, allergies…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">SLP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Forum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Invite</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Relationship</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">DOB</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Anniversary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kids</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Dietary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Allergies</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  {rows.length === 0 ? 'No SLPs on file yet. Members add their own partner info from their profile.' : 'No SLPs match your search.'}
                </td></tr>
              ) : filtered.map(r => {
                const inviteStyle = INVITE_STATUS_STYLE[r.invite_status || 'not_invited']
                return (
                <tr key={r.id} className="border-b last:border-0 group hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{r.member?.name || <span className="text-muted-foreground italic">Unknown</span>}</td>
                  <td className="px-4 py-3 text-sm">{r.name || <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={r.forum || ''}
                      onChange={(e) => handleForumChange(r, e.target.value)}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {slpForums.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline" className={`text-[10px] ${inviteStyle.cls}`}>{inviteStyle.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.relationship_type || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {r.dob && <Cake className="h-3 w-3 text-muted-foreground/60" />}
                      {fmtDate(r.dob)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {r.anniversary && <CalendarHeart className="h-3 w-3 text-muted-foreground/60" />}
                      {fmtDate(r.anniversary)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate" title={r.kids}>{r.kids || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate" title={r.dietary_restrictions}>{r.dietary_restrictions || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate" title={r.allergies}>{r.allergies || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      title="Remove SLP"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70">
        <Heart className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
        SLP records are created and edited by each member from their own profile. Admins can view and remove, but not edit on behalf of a member.
      </p>
    </div>
  )
}
