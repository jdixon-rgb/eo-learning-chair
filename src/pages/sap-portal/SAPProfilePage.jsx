import { useState } from 'react'
import { useSAPContact } from '@/lib/useSAPContact'
import { useSAPStore } from '@/lib/sapStore'
import { SAP_TIERS, SAP_CONTRIBUTION_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, User, Globe, GraduationCap, Check, Plus, Trash2, CalendarDays } from 'lucide-react'

export default function SAPProfilePage() {
  const { contact, partner, colleagueContacts } = useSAPContact()
  const { appearancesForContact, addForumAppearance, deleteForumAppearance } = useSAPStore()
  const { updateContact } = useSAPStore()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: contact?.name || '',
    role: contact?.role || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
  })
  const [saved, setSaved] = useState(false)

  const tier = SAP_TIERS.find(t => t.id === partner?.tier)
  const contribType = SAP_CONTRIBUTION_TYPES.find(c => c.id === partner?.contribution_type)

  const handleSave = () => {
    if (!contact) return
    updateContact(contact.id, {
      name: form.name,
      role: form.role,
      email: form.email,
      phone: form.phone,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const startEdit = () => {
    setForm({
      name: contact?.name || '',
      role: contact?.role || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
    })
    setEditing(true)
  }

  if (!partner || !contact) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <Building2 className="h-8 w-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">Your partner profile hasn't been linked yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Our Profile</h1>
        <p className="text-sm text-white/50 mt-1">{partner.name}</p>
      </div>

      {/* Partner info (read-only) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tier?.color}20` }}>
            <Building2 className="h-5 w-5" style={{ color: tier?.color }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{partner.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {tier && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: `${tier.color}30`, color: tier.color }}
                >
                  {tier.label}
                </span>
              )}
              {partner.industry && (
                <span className="text-xs text-white/40">{partner.industry}</span>
              )}
            </div>
          </div>
        </div>

        {partner.description && (
          <p className="text-sm text-white/60">{partner.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {contribType && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Contribution</p>
              <p className="text-white/70">{contribType.label}</p>
            </div>
          )}
          {partner.website && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Website</p>
              <a
                href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-indigo-300 hover:underline flex items-center gap-1"
              >
                <Globe className="h-3 w-3" /> {partner.website}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Your contact info (editable) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">Your Contact Info</h2>
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit}
              className="text-xs border-white/20 text-white/70 hover:bg-white/10">
              Edit
            </Button>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-white/50">Name</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50">Role / Title</label>
                <Input
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50">Email</label>
                <Input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50">Phone</label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}
                className="border-white/20 text-white/70 hover:bg-white/10">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Name</p>
              <p>{contact.name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Role</p>
              <p className="text-white/70">{contact.role || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Email</p>
              <p className="text-white/70">{contact.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Phone</p>
              <p className="text-white/70">{contact.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Forum Trained</p>
              {contact.forum_trained ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <GraduationCap className="h-4 w-4" /> Yes
                  {contact.forum_trained_date && <span className="text-white/30 ml-1">({contact.forum_trained_date})</span>}
                </span>
              ) : (
                <span className="text-white/40">No</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Colleagues */}
      {/* Forum Appearances */}
      {contact && <ForumAppearancesSection
        contactId={contact.id}
        appearances={appearancesForContact(contact.id)}
        onAdd={addForumAppearance}
        onDelete={deleteForumAppearance}
      />}

      {colleagueContacts.length > 1 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-3">
            Team at {partner.name} ({colleagueContacts.length})
          </h2>
          <div className="space-y-2">
            {colleagueContacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {c.name}
                    {c.id === contact.id && <span className="text-xs text-white/30 ml-1">(you)</span>}
                    {c.is_primary && <span className="text-[9px] text-indigo-300 ml-1.5">Primary</span>}
                  </p>
                  {c.role && <p className="text-xs text-white/40">{c.role}</p>}
                </div>
                {c.forum_trained && (
                  <GraduationCap className="h-4 w-4 text-green-400/60 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ForumAppearancesSection({ contactId, appearances, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [forumName, setForumName] = useState('')
  const [date, setDate] = useState('')
  const [topic, setTopic] = useState('')

  const handleSubmit = () => {
    if (!forumName.trim()) return
    onAdd({ sap_contact_id: contactId, forum_name: forumName.trim(), appearance_date: date || null, topic: topic.trim() })
    setForumName('')
    setDate('')
    setTopic('')
    setShowForm(false)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">Forum Appearances</h2>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}
            className="text-xs border-white/20 text-white/70 hover:bg-white/10">
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-2 mb-4 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
          <Input
            value={forumName}
            onChange={e => setForumName(e.target.value)}
            placeholder="Forum name (e.g. Forum 7)"
            className="bg-white/10 border-white/10 text-white text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-white/10 border-white/10 text-white text-sm"
            />
            <Input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Topic (optional)"
              className="bg-white/10 border-white/10 text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-xs">Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}
              className="border-white/20 text-white/70 hover:bg-white/10 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {appearances.length === 0 && !showForm ? (
        <p className="text-xs text-white/30 italic">No forum appearances recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {[...appearances].sort((a, b) => (b.appearance_date || '').localeCompare(a.appearance_date || '')).map(a => (
            <div key={a.id} className="flex items-center gap-3 py-1.5 group">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-300/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{a.forum_name}</span>
                {a.topic && <span className="text-xs text-white/40 ml-2">— {a.topic}</span>}
                {a.appearance_date && (
                  <span className="text-[10px] text-white/20 ml-2">
                    {new Date(a.appearance_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <button
                onClick={() => onDelete(a.id)}
                className="p-0.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
