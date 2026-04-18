import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { loadCurrentMember } from '@/lib/reflectionsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Check, Loader2 } from 'lucide-react'

// Member self-edit profile page. Lives in the Member Portal under
// /portal/profile. Backed by `chapter_members` — the member can update
// their own contact info; chapter / role / forum / status stay
// admin-controlled.
export default function MemberProfilePage() {
  const { user, profile } = useAuth()
  const email = user?.email || profile?.email
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

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const { data } = await loadCurrentMember(email)
      if (!cancelled && data) {
        // loadCurrentMember only selects a subset — re-fetch the full row
        // so we get phone, company, industry, eo_join_date, notes.
        if (isSupabaseConfigured()) {
          const { data: full } = await supabase
            .from('chapter_members')
            .select('*')
            .eq('id', data.id)
            .single()
          if (!cancelled && full) {
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
          }
        } else {
          setMember(data)
        }
        setLoading(false)
      } else if (!cancelled) {
        setLoading(false)
      }
    }
    if (email) init()
    return () => { cancelled = true }
  }, [email])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold">We couldn't find your member profile</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account isn't linked to a chapter member record yet. Contact your chapter admin.
        </p>
        <Link to="/portal" className="inline-block mt-4 text-sm text-community hover:underline">
          ← Back to Compass
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
    </div>
  )
}
