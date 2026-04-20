import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useChapter } from '@/lib/chapter'
import { useBoardStore } from '@/lib/boardStore'
import { useAuth } from '@/lib/auth'
import { USER_ROLES } from '@/lib/constants'
import {
  Users, Search, Mail, UserPlus, Trash2, Loader2, Upload,
  ChevronDown, ChevronUp, FileSpreadsheet, Pencil, Check, X,
  Star, Building2, Phone, UserCircle, Link2, Copy,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Lazy-load xlsx to avoid bloating the main bundle
const loadXLSX = () => import('xlsx')

export default function MemberManagementPage() {
  const { activeChapterId } = useChapter()
  const { isSuperAdmin } = useAuth()
  const {
    chapterMembers, addChapterMember, updateChapterMember, deleteChapterMember,
    syncMemberInvites, pendingProfileChangeRequests, resolveProfileCheckin,
  } = useBoardStore()

  // Generate-magic-link admin tool
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkResult, setLinkResult] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const generateMagicLink = useCallback(async (email) => {
    setLinkModalOpen(true)
    setLinkLoading(true)
    setLinkResult(null)
    setLinkError(null)
    setLinkCopied(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) {
        setLinkError('Not authenticated.')
        return
      }
      const res = await fetch('/api/admin/generate-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ email, redirectTo: window.location.origin }),
      })
      const body = await res.json()
      if (!res.ok) {
        setLinkError(body.error || `Request failed (HTTP ${res.status})`)
        return
      }
      setLinkResult(body)
    } catch (err) {
      setLinkError(err.message || String(err))
    } finally {
      setLinkLoading(false)
    }
  }, [])

  const copyLink = async () => {
    if (!linkResult?.url) return
    try {
      await navigator.clipboard.writeText(linkResult.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch { /* clipboard blocked */ }
  }

  // Profile / invite status (for showing who has signed up)
  const [profiles, setProfiles] = useState([])
  const [invites, setInvites] = useState([])
  const [statusLoading, setStatusLoading] = useState(true)

  // Search
  const [search, setSearch] = useState('')

  // Add member form
  const [addForm, setAddForm] = useState({ name: '', email: '', company: '', phone: '', forum: '', industry: '' })
  const [addMsg, setAddMsg] = useState('')

  // Inline edit
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Bulk import
  const [showBulk, setShowBulk] = useState(false)
  const [bulkPreview, setBulkPreview] = useState([])
  const [bulkMsg, setBulkMsg] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch profiles + invites for status overlay
  const fetchStatus = useCallback(async () => {
    if (!isSupabaseConfigured()) { setStatusLoading(false); return }
    const [{ data: p }, { data: inv }] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,role,survey_completed_at').order('full_name'),
      supabase.from('member_invites').select('id,email,full_name,role,claimed_at').is('claimed_at', null),
    ])
    setProfiles(p || [])
    setInvites(inv || [])
    setStatusLoading(false)
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Build a lookup for app status per email
  const statusByEmail = {}
  for (const p of profiles) {
    if (p.email) statusByEmail[p.email.toLowerCase()] = { type: 'active', role: p.role, surveyDone: !!p.survey_completed_at }
  }
  for (const inv of invites) {
    const key = inv.email?.toLowerCase()
    if (key && !statusByEmail[key]) statusByEmail[key] = { type: 'invited', role: inv.role }
  }

  // ── CSV / XLSX Parsing ──

  function parseCsvLine(line) {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += ch
    }
    values.push(current.trim())
    return values
  }

  function parseRoster(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { rows: [], error: 'File must have a header row and at least one data row.' }

    const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''))
    const find = (...candidates) => header.findIndex(h => candidates.includes(h))

    const nameIdx = find('name', 'full name', 'member name', 'member')
    const firstNameIdx = find('first name', 'firstname', 'first')
    const lastNameIdx = find('last name', 'lastname', 'last')
    const emailIdx = find('email', 'email address', 'e-mail')
    const companyIdx = find('company', 'company name', 'organization', 'business')
    const phoneIdx = find('phone', 'phone number', 'mobile')
    const forumIdx = find('forum', 'forum name')
    const industryIdx = find('industry', 'sector')
    const joinDateIdx = find('eo join date', 'join date', 'joindate', 'joined')
    const yearsIdx = find('years in eo', 'years', 'eo years')

    if (nameIdx === -1 && firstNameIdx === -1 && emailIdx === -1) {
      return { rows: [], error: 'Could not find a Name, First Name, or Email column in the header.' }
    }

    const col = (values, idx) => idx >= 0 ? (values[idx]?.trim() || '') : ''
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      const firstName = col(values, firstNameIdx)
      const lastName = col(values, lastNameIdx)
      const name = col(values, nameIdx) || `${firstName} ${lastName}`.trim()
      const email = col(values, emailIdx)
      if (!name && !email) continue

      const forum = col(values, forumIdx)
      const eoJoinDate = col(values, joinDateIdx) || null

      rows.push({
        name,
        first_name: firstName || name.split(' ')[0] || '',
        last_name: lastName || name.split(' ').slice(1).join(' ') || '',
        email,
        company: col(values, companyIdx),
        phone: col(values, phoneIdx),
        forum: forum && forum.toLowerCase() !== 'none' ? forum : '',
        industry: col(values, industryIdx),
        eo_join_date: eoJoinDate,
        status: 'active',
        is_forum_moderator: false,
      })
    }

    return { rows, error: null }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const { rows, error } = parseRoster(evt.target.result)
        if (error) { setBulkMsg(error); return }
        setBulkPreview(rows)
        setShowBulk(true)
        setBulkMsg(`Loaded ${rows.length} members from ${file.name}. Review and click Import.`)
      }
      reader.readAsText(file)
      return
    }

    // XLSX / XLS
    const XLSX = await loadXLSX()
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        if (json.length === 0) { setBulkMsg('File appears empty.'); return }

        // Convert to CSV text and reuse the parser
        const keys = Object.keys(json[0])
        const headerLine = keys.join(',')
        const dataLines = json.map(row => keys.map(k => {
          const v = (row[k] ?? '').toString()
          return v.includes(',') ? `"${v}"` : v
        }).join(','))
        const csvText = [headerLine, ...dataLines].join('\n')

        const { rows, error } = parseRoster(csvText)
        if (error) { setBulkMsg(error); return }
        setBulkPreview(rows)
        setShowBulk(true)
        setBulkMsg(`Loaded ${rows.length} members from ${file.name}. Review and click Import.`)
      } catch (err) {
        setBulkMsg(`Failed to parse file: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleBulkImport() {
    if (bulkPreview.length === 0) return
    setBulkImporting(true)
    setBulkMsg('')

    const existingEmails = new Set(chapterMembers.map(m => m.email?.toLowerCase()).filter(Boolean))
    let imported = 0
    let skipped = 0
    const newMembers = []

    for (const row of bulkPreview) {
      const key = row.email?.toLowerCase()
      if (key && existingEmails.has(key)) {
        // Update existing member with new data
        const existing = chapterMembers.find(m => m.email?.toLowerCase() === key)
        if (existing) {
          const updates = {}
          if (row.company && row.company !== existing.company) updates.company = row.company
          if (row.phone && row.phone !== existing.phone) updates.phone = row.phone
          if (row.forum && row.forum !== existing.forum) updates.forum = row.forum
          if (row.industry && row.industry !== existing.industry) updates.industry = row.industry
          if (row.eo_join_date && row.eo_join_date !== existing.eo_join_date) updates.eo_join_date = row.eo_join_date
          if (row.first_name && row.first_name !== existing.first_name) updates.first_name = row.first_name
          if (row.last_name && row.last_name !== existing.last_name) updates.last_name = row.last_name
          if (Object.keys(updates).length > 0) {
            updateChapterMember(existing.id, updates)
            imported++
          } else {
            skipped++
          }
        }
        continue
      }

      const member = addChapterMember(row)
      newMembers.push(row)
      existingEmails.add(key)
      imported++
    }

    // Sync all imported members to member_invites for Magic Link auth
    const allForInvites = bulkPreview.filter(r => r.email)
    await syncMemberInvites(allForInvites)

    setBulkPreview([])
    setBulkImporting(false)
    setBulkMsg(`Imported ${imported} member${imported !== 1 ? 's' : ''}.${skipped > 0 ? ` ${skipped} unchanged.` : ''}`)
    fetchStatus()
    setTimeout(() => setBulkMsg(''), 5000)
  }

  function handleAddMember(e) {
    e.preventDefault()
    if (!addForm.name.trim() && !addForm.email.trim()) return

    const name = addForm.name.trim() || addForm.email.trim()
    const member = {
      name,
      first_name: name.split(' ')[0] || '',
      last_name: name.split(' ').slice(1).join(' ') || '',
      email: addForm.email.trim(),
      company: addForm.company.trim(),
      phone: addForm.phone.trim(),
      forum: addForm.forum.trim(),
      industry: addForm.industry.trim(),
      status: 'active',
      is_forum_moderator: false,
    }

    addChapterMember(member)

    // Also create invite for Magic Link
    if (member.email) {
      syncMemberInvites([member])
    }

    setAddForm({ name: '', email: '', company: '', phone: '', forum: '', industry: '' })
    setAddMsg('Member added!')
    fetchStatus()
    setTimeout(() => setAddMsg(''), 3000)
  }

  function startEdit(member) {
    setEditingId(member.id)
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      company: member.company || '',
      phone: member.phone || '',
      forum: member.forum || '',
      industry: member.industry || '',
      eo_join_date: member.eo_join_date || '',
    })
  }

  function saveEdit(id) {
    updateChapterMember(id, {
      ...editForm,
      first_name: editForm.name.split(' ')[0] || '',
      last_name: editForm.name.split(' ').slice(1).join(' ') || '',
    })
    setEditingId(null)
  }

  function handleDelete(member) {
    if (!window.confirm(`Remove "${member.name}" from the chapter directory?`)) return
    deleteChapterMember(member.id)
  }

  // ── Filtering & counts ──

  const filtered = chapterMembers.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.name || '').toLowerCase().includes(q)
      || (m.email || '').toLowerCase().includes(q)
      || (m.company || '').toLowerCase().includes(q)
      || (m.forum || '').toLowerCase().includes(q)
      || (m.industry || '').toLowerCase().includes(q)
  })

  const totalMembers = chapterMembers.length
  const signedUpCount = chapterMembers.filter(m => statusByEmail[m.email?.toLowerCase()]?.type === 'active').length
  const forumCount = new Set(chapterMembers.map(m => m.forum).filter(Boolean)).size
  const roleLabel = (roleId) => USER_ROLES.find(r => r.id === roleId)?.label || roleId

  function getMemberStatus(member) {
    const s = statusByEmail[member.email?.toLowerCase()]
    if (!s) return { label: 'Directory', color: 'text-muted-foreground', bg: '' }
    if (s.type === 'active') return { label: 'Signed Up', color: 'text-green-600', bg: 'bg-green-500/10' }
    return { label: 'Invited', color: 'text-amber-500', bg: 'bg-amber-500/10' }
  }

  function getMemberRole(member) {
    const s = statusByEmail[member.email?.toLowerCase()]
    return s?.role || null
  }

  function getYearsInEo(member) {
    if (!member.eo_join_date) return null
    return Math.floor((Date.now() - new Date(member.eo_join_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Members
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalMembers} members &middot; {signedUpCount} signed up &middot; {forumCount} forums
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

      {/* Pending profile change requests */}
      {pendingProfileChangeRequests.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
            <UserCircle className="h-4 w-4" />
            Profile updates requested ({pendingProfileChangeRequests.length})
          </h2>
          <p className="text-xs text-amber-800 mb-3">
            Members flagged something changed in their profile. Update their record, then mark resolved.
          </p>
          <div className="space-y-2">
            {pendingProfileChangeRequests.map(req => {
              const m = chapterMembers.find(cm => cm.id === req.member_id)
              return (
                <div key={req.id} className="flex items-start justify-between gap-3 bg-white rounded-lg border border-amber-200 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{m?.name || 'Unknown member'}</span>
                      {m?.forum && <span className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{m.forum}</span>}
                      <span className="text-[11px] text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    {req.note && <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">&ldquo;{req.note}&rdquo;</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveProfileCheckin(req.id)}
                    className="shrink-0"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Resolved
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Member */}
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-primary" />
          Add Member
        </h2>
        <form onSubmit={handleAddMember} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input placeholder="Full name" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required className="col-span-2 sm:col-span-1" />
          <Input type="email" placeholder="Email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
          <Input placeholder="Company" value={addForm.company} onChange={e => setAddForm(p => ({ ...p, company: e.target.value }))} />
          <Input placeholder="Phone" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} />
          <Input placeholder="Forum" value={addForm.forum} onChange={e => setAddForm(p => ({ ...p, forum: e.target.value }))} />
          <Input placeholder="Industry" value={addForm.industry} onChange={e => setAddForm(p => ({ ...p, industry: e.target.value }))} />
          <Button type="submit" disabled={!addForm.name.trim() && !addForm.email.trim()} className="shrink-0">
            Add
          </Button>
        </form>
        {addMsg && <p className="text-xs text-green-600 mt-2">{addMsg}</p>}
      </div>

      {/* Bulk Import */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Bulk Import from Spreadsheet
          </span>
          {showBulk ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showBulk && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with your chapter roster.
              Columns detected automatically: Name, First Name, Last Name, Email, Company, Phone/Mobile, Forum, Industry, EO Join Date, Years in EO.
              Members with email addresses will be pre-authorized for Magic Link login.
            </p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span>Click to upload .csv or .xlsx file</span>
            </button>

            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">{bulkPreview.length} members ready to import:</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">Name</th>
                        <th className="text-left px-2 py-1">Email</th>
                        <th className="text-left px-2 py-1 hidden sm:table-cell">Forum</th>
                        <th className="text-left px-2 py-1 hidden md:table-cell">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bulkPreview.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{row.name}</td>
                          <td className="px-2 py-1 text-muted-foreground">{row.email}</td>
                          <td className="px-2 py-1 hidden sm:table-cell">{row.forum || '-'}</td>
                          <td className="px-2 py-1 hidden md:table-cell">{row.company || '-'}</td>
                        </tr>
                      ))}
                      {bulkPreview.length > 20 && (
                        <tr><td colSpan={4} className="px-2 py-1 text-muted-foreground text-center">...and {bulkPreview.length - 20} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleBulkImport} disabled={bulkImporting || bulkPreview.length === 0}>
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  `Import ${bulkPreview.length} members`
                )}
              </Button>
              {bulkPreview.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => { setBulkPreview([]); setBulkMsg('') }}>
                  Clear
                </Button>
              )}
              {bulkMsg && (
                <p className={`text-xs ${bulkMsg.includes('Error') || bulkMsg.includes('Failed') || bulkMsg.includes('Could not') ? 'text-destructive' : 'text-green-600'}`}>
                  {bulkMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Member Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Forum</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Industry</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(member => {
                const status = getMemberStatus(member)
                const appRole = getMemberRole(member)
                const years = getYearsInEo(member)
                const isEditing = editingId === member.id

                if (isEditing) {
                  return (
                    <tr key={member.id} className="bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" autoFocus className="h-8 text-xs" />
                          <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="h-8 text-xs" />
                          <Input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="h-8 text-xs" />
                          <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="h-8 text-xs" />
                          <Input value={editForm.forum} onChange={e => setEditForm(p => ({ ...p, forum: e.target.value }))} placeholder="Forum" className="h-8 text-xs" />
                          <Input value={editForm.industry} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} placeholder="Industry" className="h-8 text-xs" />
                          <Input type="date" value={editForm.eo_join_date} onChange={e => setEditForm(p => ({ ...p, eo_join_date: e.target.value }))} className="h-8 text-xs" />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => saveEdit(member.id)} className="h-8">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.is_forum_moderator && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" title="Forum Moderator" />
                          )}
                          {appRole && appRole !== 'member' && (
                            <Badge variant="outline" className="text-[9px]">{roleLabel(appRole)}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          {member.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{member.email}</span>}
                          {member.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{member.phone}</span>}
                          {years !== null && <span>{years}yr{years !== 1 ? 's' : ''} in EO</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {member.forum ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/30">{member.forum}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {member.company ? (
                        <span className="flex items-center gap-1 text-xs"><Building2 className="h-3 w-3" />{member.company}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {member.industry || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${status.bg} ${status.color} text-[10px]`} variant={status.bg ? undefined : 'outline'}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateChapterMember(member.id, { is_forum_moderator: !member.is_forum_moderator })}
                          className={`p-0.5 transition-colors ${member.is_forum_moderator ? 'text-amber-500' : 'text-muted-foreground/30 hover:text-amber-400 opacity-0 group-hover:opacity-100'}`}
                          title={member.is_forum_moderator ? 'Remove moderator' : 'Set as forum moderator'}
                        >
                          <Star className={`h-3.5 w-3.5 ${member.is_forum_moderator ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          onClick={() => startEdit(member)}
                          className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {isSuperAdmin && member.email && (
                          <button
                            onClick={() => generateMagicLink(member.email)}
                            className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="Generate sign-in link (no email) — share OOB"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(member)}
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

        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{chapterMembers.length === 0 ? 'No members yet. Add members above or import a roster.' : 'No members match your search.'}</p>
          </div>
        )}
      </div>

      {/* Generate-magic-link result modal (super_admin only) */}
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
                Share via a secure channel (WhatsApp, SMS, Signal). Anyone who clicks
                this link will be signed in as that user — treat it like a password.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={linkResult.url || ''}
                  className="text-xs font-mono"
                  onFocus={e => e.target.select()}
                />
                <Button size="sm" onClick={copyLink} variant={linkCopied ? 'outline' : 'default'}>
                  {linkCopied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Issued by {linkResult.issued_by} at {new Date(linkResult.issued_at).toLocaleString()}.
                Single-use; expires per Supabase Auth's link-expiry setting (default 1 hour).
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
