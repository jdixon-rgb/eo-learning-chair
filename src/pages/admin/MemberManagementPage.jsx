import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { USER_ROLES } from '@/lib/constants'
import { Users, Search, ClipboardList, Shield, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const ROLE_COLORS = {
  learning_chair: 'bg-eo-blue text-white',
  chapter_experience_coordinator: 'bg-eo-blue text-white',
  chapter_executive_director: 'bg-eo-blue text-white',
  committee_member: 'bg-purple-500/20 text-purple-300',
  board_liaison: 'bg-amber-500/20 text-amber-300',
  member: 'bg-white/10 text-white/60',
}

// Mock members for dev mode
const MOCK_MEMBERS = [
  { id: '1', email: 'john@eoarizona.com', full_name: 'John Dixon', role: 'learning_chair', company: 'Acme Corp', is_active: true, survey_completed_at: null },
  { id: '2', email: 'sarah@eoarizona.com', full_name: 'Sarah Martinez', role: 'committee_member', company: 'Martinez Group', is_active: true, survey_completed_at: '2025-12-15T00:00:00Z' },
  { id: '3', email: 'mike@eoarizona.com', full_name: 'Mike Johnson', role: 'member', company: 'JTech Solutions', is_active: true, survey_completed_at: null },
  { id: '4', email: 'lisa@eoarizona.com', full_name: 'Lisa Chen', role: 'member', company: 'Chen Consulting', is_active: true, survey_completed_at: '2025-12-20T00:00:00Z' },
  { id: '5', email: 'david@eoarizona.com', full_name: 'David Park', role: 'board_liaison', company: 'Park Ventures', is_active: true, survey_completed_at: null },
]

export default function MemberManagementPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchMembers = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMembers(MOCK_MEMBERS)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
    if (data) setMembers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const updateRole = async (memberId, newRole) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    if (isSupabaseConfigured()) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    }
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.full_name || '').toLowerCase().includes(q)
      || (m.email || '').toLowerCase().includes(q)
      || (m.company || '').toLowerCase().includes(q)
  })

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
            {members.length} members · {members.filter(m => m.survey_completed_at).length} surveys completed
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

      {/* Member table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">
                  <ClipboardList className="h-4 w-4 mx-auto" />
                </th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(member => (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
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
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.id, e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 border border-border bg-background cursor-pointer"
                    >
                      {USER_ROLES.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {member.survey_completed_at ? (
                      <Badge className="bg-green-500/10 text-green-600 text-[10px]">Done</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <div className={`w-2 h-2 rounded-full mx-auto ${member.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
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
