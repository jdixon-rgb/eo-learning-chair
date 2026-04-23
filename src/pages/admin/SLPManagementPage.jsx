import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useChapter } from '@/lib/chapter'
import { Heart, Loader2, Trash2, Search, Cake, CalendarHeart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/lib/pageHeader'

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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured() || !activeChapterId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('slps')
      .select(`
        id, name, relationship_type, dob, anniversary, kids,
        dietary_restrictions, allergies, notes, created_at,
        member:chapter_members!inner ( id, name, email )
      `)
      .eq('chapter_id', activeChapterId)
      .order('name', { ascending: true })
    if (error) console.error('load SLPs error:', error)
    setRows(data || [])
    setLoading(false)
  }, [activeChapterId])

  useEffect(() => { fetchRows() }, [fetchRows])

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
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  {rows.length === 0 ? 'No SLPs on file yet. Members add their own partner info from their profile.' : 'No SLPs match your search.'}
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 group hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{r.member?.name || <span className="text-muted-foreground italic">Unknown</span>}</td>
                  <td className="px-4 py-3 text-sm">{r.name || <span className="text-muted-foreground italic">—</span>}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70">
        <Heart className="h-3 w-3 inline mr-1 text-muted-foreground/60" />
        SLP records are created and edited by each member from their Compass profile. Admins can view and remove, but not edit on behalf of a member.
      </p>
    </div>
  )
}
