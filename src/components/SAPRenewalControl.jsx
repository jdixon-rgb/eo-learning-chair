import { useState } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { SAP_RENEWAL_STATUSES } from '@/lib/constants'
import { Check } from 'lucide-react'

// Per-SAP renewal intent control. Visible everywhere the partners
// list is shown; edit affordance is hidden when readOnly is true so
// President / Executive Director see the signal but don't change it
// (only the SAP Chair manages renewal status).
export default function SAPRenewalControl({ partner, readOnly = false, size = 'sm' }) {
  const { setRenewalStatus } = useSAPStore()
  const [expanded, setExpanded] = useState(false)

  const current = SAP_RENEWAL_STATUSES.find(s => s.id === partner.renewal_status)

  if (readOnly && !current) {
    return <span className="text-[10px] text-muted-foreground/60 italic">Renewal: not set</span>
  }

  if (readOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium px-1.5 py-0.5 rounded-full`}
        style={{ backgroundColor: `${current.color}1a`, color: current.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.color }} />
        {current.label}
      </span>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium px-1.5 py-0.5 rounded-full border transition-colors ${current ? '' : 'border-dashed border-muted-foreground/30 text-muted-foreground/70 hover:border-primary/40'}`}
        style={current ? { backgroundColor: `${current.color}1a`, color: current.color, borderColor: `${current.color}55` } : undefined}
        title="Set renewal intent"
      >
        {current ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.color }} />
            {current.label}
          </>
        ) : (
          <>Renewal: not set</>
        )}
      </button>
      {expanded && (
        <div
          className="absolute z-20 mt-1 left-0 rounded-lg border border-border bg-popover shadow-md p-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          {SAP_RENEWAL_STATUSES.map(s => {
            const selected = partner.renewal_status === s.id
            return (
              <button
                key={s.id}
                onClick={() => { setRenewalStatus(partner.id, s.id); setExpanded(false) }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1">{s.label}</span>
                {selected && <Check className="h-3 w-3 text-primary" />}
              </button>
            )
          })}
          {partner.renewal_status && (
            <button
              onClick={() => { setRenewalStatus(partner.id, null); setExpanded(false) }}
              className="w-full text-left px-2 py-1.5 text-[10px] rounded hover:bg-muted text-muted-foreground italic"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
