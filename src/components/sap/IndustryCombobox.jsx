import { useEffect, useMemo, useRef, useState } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { SAP_INDUSTRIES } from '@/lib/constants'
import { ChevronDown, Plus, Check } from 'lucide-react'

// Industry combobox — typeahead with suggestions drawn from the
// canonical SAP_INDUSTRIES list AND any non-canonical industries
// already in use across this chapter's SAPs (so chair-added
// one-offs become suggestions for the next person). Substring
// match, case-insensitive. If nothing matches, an "Add" row at the
// bottom lets the user commit a brand-new industry — but only
// after the suggestions have a chance to surface, so dupes are
// less likely.

export default function IndustryCombobox({ value, onChange, placeholder = 'Industry' }) {
  const { partners } = useSAPStore()
  const [draft, setDraft] = useState(value || '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Re-sync when the parent value changes (e.g. opening edit dialog).
  useEffect(() => { setDraft(value || '') }, [value])

  // Combine canonical + chapter-already-used (deduped, case-insensitive).
  const allOptions = useMemo(() => {
    const seen = new Map()
    const add = (name) => {
      if (!name) return
      const key = name.trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.set(key, name.trim())
    }
    SAP_INDUSTRIES.forEach(add)
    partners.forEach(p => add(p.industry))
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [partners])

  const q = draft.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return allOptions
    return allOptions
      .filter(opt => opt.toLowerCase().includes(q))
      .sort((a, b) => {
        // Prefix matches before substring matches.
        const ap = a.toLowerCase().startsWith(q) ? 0 : 1
        const bp = b.toLowerCase().startsWith(q) ? 0 : 1
        if (ap !== bp) return ap - bp
        return a.localeCompare(b)
      })
  }, [allOptions, q])

  const exactMatch = filtered.some(opt => opt.toLowerCase() === q)
  const showAddRow = q && !exactMatch

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        // Commit current draft as the chosen value if user closes by clicking out.
        if (draft !== value) onChange(draft)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, draft, value, onChange])

  const choose = (name) => {
    setDraft(name)
    onChange(name)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setDraft(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length > 0) choose(filtered[0])
              else if (draft.trim()) choose(draft.trim())
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
      </div>

      {open && (filtered.length > 0 || showAddRow) && (
        <div className="absolute z-30 mt-1 left-0 right-0 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.map(opt => {
            const selected = opt === draft
            return (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); choose(opt) }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                {selected ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="w-3.5 shrink-0" />}
                <span className="flex-1 truncate">{opt}</span>
              </button>
            )
          })}
          {showAddRow && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); choose(draft.trim()) }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm border-t border-border bg-muted/30 hover:bg-muted text-primary"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">Add "{draft.trim()}" as a new industry</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
