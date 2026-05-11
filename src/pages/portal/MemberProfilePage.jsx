import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { loadCurrentMember } from '@/lib/reflectionsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Check, Loader2, Heart, Mail, UserPlus } from 'lucide-react'

// Roles that don't have a chapter_members row by design (they live in
// other tables: slps, sap_contacts, or are region-scoped). Don't offer
// "create my member record" to these — they'd end up with a row that
// shouldn't exist.
const NON_MEMBER_ROLES = new Set(['slp', 'slp_chair', 'sap_contact', 'regional_learning_chair_expert', 'demo_user'])

const SLP_INVITE_LABEL = {
  not_invited: 'Not invited',
  pending:     'Invite sent',
  active:      'Login active',
  revoked:     'Revoked',
}

// Member self-edit profile page. Lives in the Member Portal under
// /portal/profile. Backed by `chapter_members` — the member can update
// their own contact info; chapter / role / forum / status stay
// admin-controlled.
export default function MemberProfilePage() {
  const { user, profile } = useAuth()
  const { activeChapterId } = useChapter()
  const email = user?.email || profile?.email
  // For super-admins (no chapter_id on profile) and chapter-bound roles
  // alike, the chapter the new member record should live in is whichever
  // chapter the user is currently viewing.
  const bootstrapChapterId = profile?.chapter_id || activeChapterId
  const navigate = useNavigate()

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    eo_join_date: '',
    notes: '',
  })

  // SLP — one record per member, optional. Loaded alongside the
  // chapter_members row.
  const [slp, setSlp] = useState(null)
  const [slpForm, setSlpForm] = useState({
    name: '',
    relationship_type: 'spouse',
    dob: '',
    anniversary: '',
    kids: '',
    dietary_restrictions: '',
    allergies: '',
    notes: '',
    email: '',
    phone: '',
  })
  const [slpSaving, setSlpSaving] = useState(false)
  const [slpSavedAt, setSlpSavedAt] = useState(null)
  const [slpError, setSlpError] = useState('')
  const [slpInviting, setSlpInviting] = useState(false)
  const [slpInviteMsg, setSlpInviteMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const loadMember = useCallback(async () => {
    if (!email) { setLoading(false); return }
    setLoading(true)
    const { data } = await loadCurrentMember(email)
    if (!data) { setLoading(false); return }
    // loadCurrentMember only selects a subset — re-fetch the full row
    // so we get phone, company, industry, eo_join_date, notes.
    if (isSupabaseConfigured()) {
      const { data: full } = await supabase
        .from('chapter_members')
        .select('*')
        .eq('id', data.id)
        .single()
      if (full) {
        setMember(full)
        setForm({
          first_name: full.first_name || '',
          last_name: full.last_name || '',
          email: full.email || '',
          phone: full.phone || '',
          company: full.company || '',
          industry: full.industry || '',
          eo_join_date: full.eo_join_date || '',
          notes: full.notes || '',
        })
        const { data: slpRow } = await supabase
          .from('slps')
          .select('*')
          .eq('member_id', full.id)
          .maybeSingle()
        if (slpRow) {
          setSlp(slpRow)
          setSlpForm({
            name: slpRow.name || '',
            relationship_type: slpRow.relationship_type || 'spouse',
            dob: slpRow.dob || '',
            anniversary: slpRow.anniversary || '',
            kids: slpRow.kids || '',
            dietary_restrictions: slpRow.dietary_restrictions || '',
            allergies: slpRow.allergies || '',
            notes: slpRow.notes || '',
            email: slpRow.email || '',
            phone: slpRow.phone || '',
          })
        }
      }
    } else {
      setMember(data)
    }
    setLoading(false)
  }, [email])

  useEffect(() => { loadMember() }, [loadMember])

  const handleCreateMember = async () => {
    setCreateError('')
    if (!bootstrapChapterId) {
      setCreateError("No chapter selected — pick one in the chapter switcher first.")
      return
    }
    const memberEmail = (email || profile?.email || '').toLowerCase().trim()
    if (!memberEmail) {
      setCreateError('No email on your account to use as the member email.')
      return
    }
    const fullName = profile?.full_name || memberEmail
    const [firstGuess, ...rest] = fullName.split(/\s+/)
    setCreating(true)
    const insert = {
      chapter_id: bootstrapChapterId,
      name: fullName,
      first_name: firstGuess || '',
      last_name: rest.join(' '),
      email: memberEmail,
      phone: profile?.phone || '',
      status: 'active',
    }
    const { error: err } = await supabase.from('chapter_members').insert(insert)
    setCreating(false)
    if (err) { setCreateError(`Couldn't create member record: ${err.message}`); return }
    await loadMember()
  }

  const handleSave = async () => {
    if (!member?.id) return
    setSaving(true)
    setError('')

    const updates = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      // Keep `name` in sync — it's the display field used in lots of places
      name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim() || form.email,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      industry: form.industry.trim(),
      eo_join_date: form.eo_join_date || null,
      notes: form.notes,
    }

    if (isSupabaseConfigured()) {
      const { error: err } = await supabase
        .from('chapter_members')
        .update(updates)
        .eq('id', member.id)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    }

    setMember({ ...member, ...updates })
    setSaving(false)
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 3000)
  }

  const handleSaveSlp = async () => {
    if (!member?.id || !member?.chapter_id) return
    setSlpSaving(true)
    setSlpError('')

    const payload = {
      chapter_id: member.chapter_id,
      member_id: member.id,
      name: slpForm.name.trim(),
      relationship_type: slpForm.relationship_type || 'spouse',
      dob: slpForm.dob || null,
      anniversary: slpForm.anniversary || null,
      kids: slpForm.kids,
      dietary_restrictions: slpForm.dietary_restrictions,
      allergies: slpForm.allergies,
      notes: slpForm.notes,
      email: slpForm.email.trim().toLowerCase() || null,
      phone: slpForm.phone.trim() || null,
    }

    if (isSupabaseConfigured()) {
      // Upsert by member_id (unique). Insert if no SLP exists, otherwise update.
      let res
      if (slp?.id) {
        res = await supabase.from('slps').update(payload).eq('id', slp.id).select().single()
      } else {
        res = await supabase.from('slps').insert(payload).select().single()
      }
      if (res.error) {
        setSlpError(res.error.message)
        setSlpSaving(false)
        return
      }
      setSlp(res.data)
    }

    setSlpSaving(false)
    setSlpSavedAt(Date.now())
    setTimeout(() => setSlpSavedAt(null), 3000)
  }

  const handleInviteSlp = async () => {
    if (!slp?.id) {
      setSlpInviteMsg('Save the SLP record first, then invite.')
      return
    }
    const inviteEmail = slpForm.email.trim().toLowerCase()
    if (!inviteEmail) {
      setSlpInviteMsg('Add an email for your SLP, then invite.')
      return
    }
    setSlpInviting(true)
    setSlpInviteMsg('')
    if (isSupabaseConfigured()) {
      const { error: err } = await supabase.rpc('invite_slp', {
        p_slp_id: slp.id,
        p_email: inviteEmail,
        p_phone: slpForm.phone.trim() || null,
      })
      if (err) {
        setSlpInviteMsg(`Invite failed: ${err.message}`)
        setSlpInviting(false)
        return
      }
      // Refresh the local SLP row so the status pill updates.
      const { data: refreshed } = await supabase
        .from('slps').select('*').eq('id', slp.id).maybeSingle()
      if (refreshed) setSlp(refreshed)
    }
    setSlpInviting(false)
    setSlpInviteMsg('Invite recorded. Your SLP can sign in at the same login page using their email.')
    setTimeout(() => setSlpInviteMsg(''), 6000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!member) {
    const canBootstrap = !!bootstrapChapterId && !NON_MEMBER_ROLES.has(profile?.role)
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold">We couldn't find your member profile</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account isn't linked to a chapter member record yet.
          {canBootstrap
            ? ' You can create one now from the info on your account.'
            : ' Contact your chapter admin.'}
        </p>
        {canBootstrap && (
          <div className="mt-4 space-y-3">
            <Button onClick={handleCreateMember} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create my member record
            </Button>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <p className="text-[11px] text-muted-foreground/80">
              Uses your account email + name. You can edit everything once it exists.
            </p>
          </div>
        )}
        <Link to="/portal" className="inline-block mt-4 text-sm text-community hover:underline">
          ← Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/portal')}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Keep your info current so the chapter can reach you and plan around your context.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">First name</label>
            <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Last name</label>
            <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <p className="text-[10px] text-muted-foreground/80 mt-1">
            Changing your email will affect magic-link sign-in. Coordinate with your chapter admin first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">EO join date</label>
            <Input type="date" value={form.eo_join_date} onChange={e => setForm(f => ({ ...f, eo_join_date: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Industry</label>
            <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Bio / Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={4}
            placeholder="Anything your forum-mates or chapter should know about you — interests, family, things you're working on..."
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Admin-managed:</strong> chapter, forum assignment, role, and status are set by your chapter admin. Reach out if any of those need to change.
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
          {savedAt && (
            <span className="flex items-center gap-1 text-sm text-community font-medium">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>

      {/* SLP — Significant Life Partner */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Significant Life Partner</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              Helps the chapter plan SLP-attended events, celebrate milestones,
              and accommodate dietary needs. Visible only to you and your
              chapter leadership.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={slpForm.name} onChange={e => setSlpForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Relationship</label>
            <select
              value={slpForm.relationship_type}
              onChange={e => setSlpForm(f => ({ ...f, relationship_type: e.target.value }))}
              className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="spouse">Spouse</option>
              <option value="partner">Partner</option>
              <option value="domestic_partner">Domestic Partner</option>
              <option value="fiance">Fiancé/Fiancée</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date of birth</label>
            <Input type="date" value={slpForm.dob} onChange={e => setSlpForm(f => ({ ...f, dob: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Anniversary</label>
            <Input type="date" value={slpForm.anniversary} onChange={e => setSlpForm(f => ({ ...f, anniversary: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Kids</label>
          <Input
            value={slpForm.kids}
            onChange={e => setSlpForm(f => ({ ...f, kids: e.target.value }))}
            placeholder="e.g. Sarah (12), Michael (9)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Dietary restrictions</label>
            <Input
              value={slpForm.dietary_restrictions}
              onChange={e => setSlpForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
              placeholder="e.g. Vegetarian, gluten-free"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Allergies</label>
            <Input
              value={slpForm.allergies}
              onChange={e => setSlpForm(f => ({ ...f, allergies: e.target.value }))}
              placeholder="e.g. Peanuts, shellfish"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            value={slpForm.notes}
            onChange={e => setSlpForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Anything the chapter should know — interests, communication preferences, milestones coming up…"
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSaveSlp} disabled={slpSaving}>
            {slpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save SLP
          </Button>
          {slpSavedAt && (
            <span className="flex items-center gap-1 text-sm text-community font-medium">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {slpError && <span className="text-sm text-destructive">{slpError}</span>}
        </div>

        {/* Invite SLP to their own login. Optional — only matters
            if your chapter runs SLP forums. Adding email/phone here
            does NOT invite; the explicit button does. */}
        <div className="border-t border-border pt-4 mt-2 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Invite to their own login</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                If your chapter runs an SLP forum, your SLP needs their own login to join it. They sign in at the same page you do, using their own email.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
              {SLP_INVITE_LABEL[slp?.invite_status || 'not_invited']}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">SLP email</label>
              <Input
                type="email"
                value={slpForm.email}
                onChange={e => setSlpForm(f => ({ ...f, email: e.target.value }))}
                placeholder="their.email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">SLP phone (optional)</label>
              <Input
                value={slpForm.phone}
                onChange={e => setSlpForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleInviteSlp}
              disabled={slpInviting || !slp?.id || !slpForm.email.trim()}
            >
              {slpInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {slp?.invite_status === 'pending' || slp?.invite_status === 'active'
                ? 'Re-send invite'
                : 'Invite SLP'}
            </Button>
            {slpInviteMsg && (
              <span className="text-xs text-muted-foreground">{slpInviteMsg}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
