import { useEffect, useMemo, useRef, useState } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { Filter, Check, X } from 'lucide-react'

// Multi-select industry filter. Pulls the option list from the
// industries currently in use across this chapter's active SAPs —
// no point listing canonical industries that no one's tagged a
// partner with. The selected[] array is the source of truth; the
// parent decides how to apply it (typically: include a partner if
// its industry matches at least one selected entry).

export default function IndustryFilter({ selected, onChange }) {
  const { partners } = useSAPStore()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const options = useMemo(() => {
    const seen = new Map()
    for (const p of partners) {
      if ((p.status || 'active') !== 'active') continue
      const v = (p.industry || '').trim()
      if (!v) continue
      const key = v.toLowerCase()
      if (!seen.has(key)) seen.set(key, v)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [partners])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const toggle = (industry) => {
    if (selected.includes(industry)) {
      onChange(selected.filter(s => s !== industry))
    } else {
      onChange([...selected, industry])
    }
  }

  const clear = () => onChange([])

  const count = selected.length

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 h-10 px-3 text-sm rounded-md border transition-colors ${count > 0 ? 'border-primary text-primary bg-primary/5' : 'border-input bg-background hover:bg-muted'}`}
      >
        <Filter className="h-4 w-4" />
        <span>Industry</span>
        {count > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 right-0 w-64 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Filter by industry
            </span>
            {count > 0 && (
              <button onClick={clear} className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground italic">No industries on file yet.</div>
          ) : (
            options.map(opt => {
              const isSelected = selected.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{opt}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
