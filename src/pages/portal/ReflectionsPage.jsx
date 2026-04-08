import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  loadCurrentMember,
  loadTemplates,
  loadFeelings,
  addFeeling,
  loadMyReflections,
  createReflection,
  updateReflection,
  deleteReflection,
  clearAllReflections,
  loadParkingLot,
  createParkingLotEntry,
  updateParkingLotEntry,
  deleteParkingLotEntry,
} from '@/lib/reflectionsStore'
import {
  BookOpen,
  Pin,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  Save,
  Sparkles,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'business',  label: 'Business'  },
  { key: 'personal',  label: 'Personal'  },
  { key: 'community', label: 'Community' },
]

export default function ReflectionsPage() {
  const { user, profile } = useAuth()
  const email = user?.email || profile?.email

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])
  const [feelings, setFeelings] = useState([])
  const [reflections, setReflections] = useState([])
  const [parkingLot, setParkingLot] = useState([])

  const [tab, setTab] = useState('reflections')      // reflections | parking
  const [view, setView] = useState('list')           // list | picker | editor
  const [activeReflection, setActiveReflection] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [declareFor, setDeclareFor] = useState(null) // reflection being declared
  const [showAddParkingLot, setShowAddParkingLot] = useState(false) // standalone add (no reflection)

  // Initial load
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const [{ data: m }, { data: t }, { data: f }] = await Promise.all([
        loadCurrentMember(email),
        loadTemplates(),
        loadFeelings(),
      ])
      if (cancelled) return
      setMember(m)
      setTemplates(t)
      setFeelings(f)
      if (m?.id) {
        const { data: r } = await loadMyReflections(m.id)
        if (!cancelled) setReflections(r)
      }
      if (m?.chapter_id && m?.forum) {
        const { data: p } = await loadParkingLot(m.chapter_id, m.forum)
        if (!cancelled) setParkingLot(p)
      }
      if (!cancelled) setLoading(false)
    }
    if (email) init()
    else setLoading(false)
    return () => { cancelled = true }
  }, [email])

  async function refreshReflections() {
    if (!member?.id) return
    const { data } = await loadMyReflections(member.id)
    setReflections(data)
  }

  async function refreshParkingLot() {
    if (!member?.chapter_id || !member?.forum) return
    const { data } = await loadParkingLot(member.chapter_id, member.forum)
    setParkingLot(data)
  }

  async function handleAddFeeling(word) {
    const { data, error } = await addFeeling(word)
    if (!error && data) setFeelings(prev => [...prev, data].sort((a, b) => a.word.localeCompare(b.word)))
    return { data, error }
  }

  async function handleStartNew(template) {
    if (!member?.id) return
    const { data, error } = await createReflection({
      chapter_id: member.chapter_id,
      forum: member.forum,
      member_id: member.id,
      template_slug: template.slug,
      category: null,
      content: {},
      feelings: [],
    })
    if (!error && data) {
      setActiveReflection(data)
      setView('editor')
      refreshReflections()
    }
  }

  async function handleSaveReflection(patch) {
    if (!activeReflection?.id) return
    const { data, error } = await updateReflection(activeReflection.id, patch)
    if (!error && data) {
      setActiveReflection(data)
      refreshReflections()
    }
  }

  async function handleDeleteReflection(id) {
    await deleteReflection(id)
    if (activeReflection?.id === id) {
      setActiveReflection(null)
      setView('list')
    }
    refreshReflections()
  }

  async function handleClearAll() {
    if (!member?.id || !member?.forum) return
    await clearAllReflections(member.id, member.forum)
    setShowClearConfirm(false)
    setActiveReflection(null)
    setView('list')
    refreshReflections()
  }

  async function handleDeclareToParkingLot({ name, importance, urgency }) {
    if (!member?.id) return
    await createParkingLotEntry({
      chapter_id: member.chapter_id,
      forum: member.forum,
      author_member_id: member.id,
      name,
      importance,
      urgency,
    })
    setDeclareFor(null)
    refreshParkingLot()
    setTab('parking')
  }

  // ── Render guards ──
  if (loading) {
    return <div className="text-white/60 text-center py-12">Loading…</div>
  }

  if (!member) {
    return <EmptyState
      title="We couldn't find your member profile"
      body="Your email doesn't match a member record yet. Reach out to your chapter's admin to get set up — and then come back any time."
    />
  }

  if (!member.forum) {
    return <EmptyState
      title="You're not currently in a forum"
      body="Reflections and the parking lot are things members do together inside a forum. If you're curious about joining one, reach out to your Forum Chair — no pressure, just an open door."
    />
  }

  // ── Editor view ──
  if (view === 'editor' && activeReflection) {
    const template = templates.find(t => t.slug === activeReflection.template_slug)
    return (
      <ReflectionEditor
        reflection={activeReflection}
        template={template}
        feelings={feelings}
        onAddFeeling={handleAddFeeling}
        onSave={handleSaveReflection}
        onDelete={() => handleDeleteReflection(activeReflection.id)}
        onDeclare={() => setDeclareFor(activeReflection)}
        onBack={() => { setActiveReflection(null); setView('list') }}
      />
    )
  }

  // ── Template picker ──
  if (view === 'picker') {
    return (
      <TemplatePicker
        templates={templates}
        onPick={handleStartNew}
        onBack={() => setView('list')}
      />
    )
  }

  // ── Main (tabs) ──
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl md:text-3xl font-bold">Reflections</h1>
        <p className="text-white/50 text-sm mt-1">Private to you — until you choose to share</p>
      </div>

      <div className="flex justify-center gap-1 border-b border-white/10">
        <TabButton active={tab === 'reflections'} onClick={() => setTab('reflections')} icon={BookOpen}>
          My Reflections
        </TabButton>
        <TabButton active={tab === 'parking'} onClick={() => setTab('parking')} icon={Pin}>
          Parking Lot
        </TabButton>
      </div>

      {tab === 'reflections' && (
        <ReflectionsList
          reflections={reflections}
          templates={templates}
          onNew={() => setView('picker')}
          onOpen={(r) => { setActiveReflection(r); setView('editor') }}
          onDelete={handleDeleteReflection}
          onClearAll={() => setShowClearConfirm(true)}
        />
      )}

      {tab === 'parking' && (
        <ParkingLotView
          entries={parkingLot}
          currentMemberId={member.id}
          onAddNew={() => setShowAddParkingLot(true)}
          onUpdate={async (id, patch) => { await updateParkingLotEntry(id, patch); refreshParkingLot() }}
          onDelete={async (id) => { await deleteParkingLotEntry(id); refreshParkingLot() }}
        />
      )}

      {showClearConfirm && (
        <Modal onClose={() => setShowClearConfirm(false)}>
          <h3 className="text-lg font-bold mb-2">Clear all reflections?</h3>
          <p className="text-sm text-white/60 mb-5">
            This will delete all of your reflections in <span className="text-white/80">{member.forum}</span>.
            Parking lot entries you've declared will stay. This can't be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white" onClick={() => setShowClearConfirm(false)}>Cancel</button>
            <button className="px-4 py-2 rounded-lg text-sm bg-red-600/80 hover:bg-red-600 text-white" onClick={handleClearAll}>Clear all</button>
          </div>
        </Modal>
      )}

      {declareFor && (
        <DeclareDialog
          reflection={declareFor}
          onClose={() => setDeclareFor(null)}
          onConfirm={handleDeclareToParkingLot}
        />
      )}

      {showAddParkingLot && (
        <DeclareDialog
          reflection={null}
          onClose={() => setShowAddParkingLot(false)}
          onConfirm={async (payload) => {
            await handleDeclareToParkingLot(payload)
            setShowAddParkingLot(false)
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
        active ? 'border-eo-blue text-white' : 'border-transparent text-white/50 hover:text-white/80'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="text-center py-16 max-w-lg mx-auto">
      <Sparkles className="h-8 w-8 text-white/30 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-white/90">{title}</h2>
      <p className="text-sm text-white/50 mt-2 leading-relaxed">{body}</p>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1724] border border-white/10 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Template picker ────────────────────────────────────────
function TemplatePicker({ templates, onPick, onBack }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <div className="text-center">
        <h2 className="text-2xl font-bold">Pick a template</h2>
        <p className="text-white/50 text-sm mt-1">Different shapes for different kinds of reflection.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map(t => (
          <button
            key={t.slug}
            onClick={() => onPick(t)}
            className="text-left rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-eo-blue/50 hover:bg-white/[0.07] transition-all"
          >
            <h3 className="font-semibold text-white mb-2">{t.name}</h3>
            <p className="text-xs text-white/50 leading-relaxed">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Reflections list ───────────────────────────────────────
function ReflectionsList({ reflections, templates, onNew, onOpen, onDelete, onClearAll }) {
  const tmplName = (slug) => templates.find(t => t.slug === slug)?.name || slug
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-eo-blue/90 hover:bg-eo-blue text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New reflection
        </button>
        {reflections.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {reflections.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">
          Nothing here yet. Start your first reflection.
        </div>
      ) : (
        <ul className="space-y-2">
          {reflections.map(r => {
            const headline = r.content?.headline || r.content?.eq_challenge || '(untitled reflection)'
            return (
              <li
                key={r.id}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-4 hover:border-white/20 transition-colors cursor-pointer group"
                onClick={() => onOpen(r)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{headline}</p>
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                    <span>{tmplName(r.template_slug)}</span>
                    {r.category && <><span>•</span><span className="capitalize">{r.category}</span></>}
                    <span>•</span>
                    <span>{new Date(r.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(r.id) }}
                  className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Reflection editor ──────────────────────────────────────
function ReflectionEditor({ reflection, template, feelings, onAddFeeling, onSave, onDelete, onDeclare, onBack }) {
  const [content, setContent] = useState(reflection.content || {})
  const [category, setCategory] = useState(reflection.category || '')
  const [selectedFeelings, setSelectedFeelings] = useState(reflection.feelings || [])
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // Debounced autosave
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(async () => {
      await onSave({ content, category: category || null, feelings: selectedFeelings })
      setDirty(false)
      setSavedAt(new Date())
    }, 800)
    return () => clearTimeout(t)
  }, [content, category, selectedFeelings, dirty])

  function updateField(key, val) {
    setContent(prev => ({ ...prev, [key]: val }))
    setDirty(true)
  }

  function updateGridCell(rowKey, colKey, val) {
    setContent(prev => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [colKey]: val },
    }))
    setDirty(true)
  }

  function updateMeps(key, val) {
    setContent(prev => ({ ...prev, meps: { ...(prev.meps || {}), [key]: val } }))
    setDirty(true)
  }

  const schema = template?.schema || { kind: 'single', fields: [] }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            {dirty ? 'Saving…' : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'Saved'}
          </span>
          <button
            onClick={onDeclare}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-eo-coral/90 hover:bg-eo-coral text-white text-xs font-medium"
          >
            <Pin className="h-3.5 w-3.5" /> Declare to parking lot
          </button>
          <button
            onClick={onDelete}
            className="text-white/30 hover:text-red-400"
            title="Delete reflection"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold">{template?.name}</h2>
        <p className="text-xs text-white/40 mt-1">{template?.description}</p>
      </div>

      <div>
        <Label>Category</Label>
        <div className="flex gap-2 flex-wrap">
          <CategoryChip label="None" active={!category} onClick={() => { setCategory(''); setDirty(true) }} />
          {CATEGORIES.map(c => (
            <CategoryChip
              key={c.key}
              label={c.label}
              active={category === c.key}
              onClick={() => { setCategory(c.key); setDirty(true) }}
            />
          ))}
        </div>
      </div>

      {schema.kind === 'single' && (
        <div className="space-y-5">
          {schema.fields.map(f => (
            <FieldRenderer
              key={f.key}
              field={f}
              value={f.type === 'feelings_pills' ? selectedFeelings : content[f.key]}
              onChange={(val) => {
                if (f.type === 'feelings_pills') {
                  setSelectedFeelings(val); setDirty(true)
                } else {
                  updateField(f.key, val)
                }
              }}
              feelings={feelings}
              onAddFeeling={onAddFeeling}
            />
          ))}
        </div>
      )}

      {schema.kind === 'grid' && (
        <div className="space-y-6">
          {schema.meps && (
            <div>
              <Label>MEPS — one word each</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {schema.meps.map(m => (
                  <div key={m.key}>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{m.label}</div>
                    <input
                      type="text"
                      value={content.meps?.[m.key] || ''}
                      onChange={(e) => updateMeps(m.key, e.target.value)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none"
                      placeholder="one word"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {schema.rows.map(row => (
              <div key={row.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="text-sm font-semibold text-white/80 mb-3">{row.label}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {schema.columns.map(col => {
                    const cellVal = content[row.key]?.[col.key]
                    const field = { ...col, label: col.label, help: col.help }
                    return (
                      <div key={col.key}>
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{col.label}</div>
                        {col.help && <div className="text-[10px] text-white/30 mb-2">{col.help}</div>}
                        <FieldBody
                          field={field}
                          value={col.type === 'feelings_pills' ? (cellVal || []) : cellVal}
                          onChange={(val) => updateGridCell(row.key, col.key, val)}
                          feelings={feelings}
                          onAddFeeling={onAddFeeling}
                          compact
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {schema.footers?.map(f => (
            <FieldRenderer
              key={f.key}
              field={f}
              value={content[f.key]}
              onChange={(val) => updateField(f.key, val)}
              feelings={feelings}
              onAddFeeling={onAddFeeling}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <div className="text-xs uppercase tracking-wider text-white/40 mb-2">{children}</div>
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-eo-blue/20 border-eo-blue text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
      }`}
    >
      {label}
    </button>
  )
}

function FieldRenderer({ field, value, onChange, feelings, onAddFeeling }) {
  return (
    <div>
      <Label>{field.label}</Label>
      {field.help && <div className="text-xs text-white/40 -mt-1 mb-2">{field.help}</div>}
      <FieldBody field={field} value={value} onChange={onChange} feelings={feelings} onAddFeeling={onAddFeeling} />
    </div>
  )
}

function FieldBody({ field, value, onChange, feelings, onAddFeeling, compact }) {
  if (field.type === 'short_text') {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none"
      />
    )
  }
  if (field.type === 'long_text') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={compact ? 3 : 5}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none resize-y"
      />
    )
  }
  if (field.type === 'feelings_pills') {
    return (
      <FeelingsPillInput
        value={value || []}
        onChange={onChange}
        feelings={feelings}
        onAddFeeling={onAddFeeling}
      />
    )
  }
  return null
}

// ── Feelings pill input ────────────────────────────────────
function FeelingsPillInput({ value, onChange, feelings, onAddFeeling }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const selected = new Set(value.map(v => v.toLowerCase()))
    return feelings
      .filter(f => f.word.toLowerCase().includes(q) && !selected.has(f.word.toLowerCase()))
      .slice(0, 8)
  }, [query, feelings, value])

  const exactMatch = feelings.some(f => f.word.toLowerCase() === query.trim().toLowerCase())

  function add(word) {
    if (!word) return
    if (value.some(v => v.toLowerCase() === word.toLowerCase())) return
    onChange([...value, word])
    setQuery('')
  }

  async function handleAddNew() {
    const clean = query.trim()
    if (!clean) return
    const { data } = await onAddFeeling(clean)
    if (data) add(data.word)
    else add(clean)
  }

  function remove(word) {
    onChange(value.filter(v => v !== word))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(word => (
          <span
            key={word}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-eo-blue/20 border border-eo-blue/40 text-xs text-white"
          >
            {word}
            <button onClick={() => remove(word)} className="hover:text-red-300">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions.length > 0) add(suggestions[0].word)
              else if (query.trim()) handleAddNew()
            }
          }}
          placeholder="Type a feeling…"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none"
        />
        {open && query.trim() && (
          <div className="absolute z-10 mt-1 w-full rounded-lg bg-[#0f1724] border border-white/10 shadow-xl max-h-64 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => add(s.word)}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 flex items-center justify-between"
              >
                <span>{s.word}</span>
                <span className="text-[10px] text-white/30">{s.parent_group}</span>
              </button>
            ))}
            {!exactMatch && query.trim() && (
              <button
                onClick={handleAddNew}
                className="w-full text-left px-3 py-2 text-sm text-eo-blue hover:bg-white/5 flex items-center gap-1 border-t border-white/5"
              >
                <Plus className="h-3 w-3" /> Add "{query.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Parking lot view ───────────────────────────────────────
function ParkingLotView({ entries, currentMemberId, onAddNew, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm mb-4">
          Nothing on the parking lot yet. Add an item directly, or declare one from a reflection.
        </p>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-eo-blue hover:bg-eo-blue/90 text-white"
        >
          <Pin className="h-4 w-4" />
          Add to parking lot
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/80"
        >
          <Pin className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
          <tr>
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-center px-3 py-3 w-24">Importance</th>
            <th className="text-center px-3 py-3 w-24">Urgency</th>
            <th className="text-center px-3 py-3 w-24">Combined</th>
            <th className="px-3 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const isAuthor = e.author_member_id === currentMemberId
            return (
              <tr key={e.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white/90">{e.name}</td>
                <td className="text-center px-3 py-3 text-white/70">{e.importance}</td>
                <td className="text-center px-3 py-3 text-white/70">{e.urgency}</td>
                <td className="text-center px-3 py-3 text-white font-semibold">{e.importance + e.urgency}</td>
                <td className="px-3 py-3">
                  {isAuthor && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(e)} className="text-white/30 hover:text-white" title="Edit">
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(e.id)} className="text-white/30 hover:text-red-400" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 className="text-lg font-bold mb-4">Edit parking lot entry</h3>
          <ScoreForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onConfirm={async ({ name, importance, urgency }) => {
              await onUpdate(editing.id, { name, importance, urgency })
              setEditing(null)
            }}
          />
        </Modal>
      )}
      </div>
    </div>
  )
}

// ── Declare dialog ─────────────────────────────────────────
function DeclareDialog({ reflection, onClose, onConfirm }) {
  const suggestedName = reflection?.content?.headline || ''
  const fromReflection = !!reflection
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold mb-1">{fromReflection ? 'Declare to parking lot' : 'Add to parking lot'}</h3>
      <p className="text-xs text-white/50 mb-5">
        {fromReflection
          ? 'Your forum will see the name and scores. The rest of your reflection stays private.'
          : 'Your forum will see the name and scores. Nothing else.'}
      </p>
      <ScoreForm
        initial={{ name: suggestedName, importance: 5, urgency: 5 }}
        onCancel={onClose}
        onConfirm={onConfirm}
        confirmLabel={fromReflection ? 'Declare' : 'Add'}
      />
    </Modal>
  )
}

function ScoreForm({ initial, onCancel, onConfirm, confirmLabel = 'Save' }) {
  const [name, setName] = useState(initial.name || '')
  const [importance, setImportance] = useState(initial.importance ?? 5)
  const [urgency, setUrgency] = useState(initial.urgency ?? 5)

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Short name for this parking lot item"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-eo-blue focus:outline-none"
        />
      </div>
      <div>
        <Label>Importance: {importance}</Label>
        <input type="range" min="1" max="10" value={importance} onChange={(e) => setImportance(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <Label>Urgency: {urgency}</Label>
        <input type="range" min="1" max="10" value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white" onClick={onCancel}>Cancel</button>
        <button
          className="px-4 py-2 rounded-lg text-sm bg-eo-blue hover:bg-eo-blue/90 text-white disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() => onConfirm({ name: name.trim(), importance, urgency })}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
