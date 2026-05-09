import { useMemo } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { useAuth } from '@/lib/auth'
import { SAP_RENEWAL_STATUSES, SAP_TIERS } from '@/lib/constants'
import { Mail, Phone, Globe, Archive, ArrowLeft, ArrowRight } from 'lucide-react'

// Renewal Kanban — four columns (Renewing | Uncertain | Not renewing
// | Not set) for status='active' partners. The retention chair tags
// each card with a renewal intent; on the "Not renewing" column they
// can Archive a partner (status → 'inactive') to move them into the
// Past SAPs view for future re-engagement.

const COLUMNS = [
  ...SAP_RENEWAL_STATUSES.map(s => ({ id: s.id, label: s.label, color: s.color })),
  { id: null, label: 'Not set', color: '#94a3b8' },
]

export default function RenewalKanbanBoard({ search = '' }) {
  const { partners, setRenewalStatus, archivePartner } = useSAPStore()
  const { effectiveRole } = useAuth()
  const canEdit = ['super_admin', 'sap_chair', 'chapter_executive_director', 'chapter_experience_coordinator'].includes(effectiveRole)

  const activePartners = useMemo(() => {
    const q = search.trim().toLowerCase()
    return partners
      .filter(p => (p.status || 'active') === 'active')
      .filter(p => {
        if (!q) return true
        return (
          (p.name || '').toLowerCase().includes(q)
          || (p.industry || '').toLowerCase().includes(q)
        )
      })
  }, [partners, search])

  const byStatus = useMemo(() => {
    const map = new Map(COLUMNS.map(c => [c.id, []]))
    for (const p of activePartners) {
      const key = p.renewal_status ?? null
      if (!map.has(key)) map.set(null, [...(map.get(null) || []), p])
      else map.get(key).push(p)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    return map
  }, [activePartners])

  const moveToColumn = (sapId, columnId) => {
    if (!canEdit) return
    setRenewalStatus(sapId, columnId, undefined)
  }

  const archive = (sapId, name) => {
    if (!canEdit) return
    if (!window.confirm(`Archive ${name}? They'll move to Past SAPs and stop appearing in member-facing views, but their record stays for re-engagement later.`)) return
    archivePartner(sapId)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col, colIdx) => {
        const list = byStatus.get(col.id) || []
        const isLeftmost = colIdx === 0
        const isRightmost = colIdx === COLUMNS.length - 1
        const isNotRenewing = col.id === 'not_renewing'
        return (
          <div key={col.id ?? 'unset'} className="rounded-xl border border-border bg-card overflow-hidden">
            <div
              className="px-3 py-2 border-b border-border flex items-center justify-between"
              style={{ backgroundColor: `${col.color}1a` }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{col.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{list.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[180px]">
              {list.length === 0 && (
                <div className="text-[11px] text-muted-foreground/60 text-center py-6">
                  None
                </div>
              )}
              {list.map(p => {
                const tier = SAP_TIERS.find(t => t.id === p.tier)
                const prevCol = COLUMNS[colIdx - 1]
                const nextCol = COLUMNS[colIdx + 1]
                return (
                  <div key={p.id} className="rounded-lg border border-border/70 bg-background p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground line-clamp-2">{p.name}</div>
                      {tier && (
                        <span
                          className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: `${tier.color}33`, color: tier.color }}
                        >
                          {tier.label}
                        </span>
                      )}
                    </div>
                    {p.industry && (
                      <div className="text-[11px] text-muted-foreground/80">{p.industry}</div>
                    )}
                    <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground/80">
                      {p.contact_email && (
                        <a href={`mailto:${p.contact_email}`} className="flex items-center gap-1 hover:text-primary truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.contact_email}</span>
                        </a>
                      )}
                      {p.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {p.contact_phone}
                        </span>
                      )}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary truncate">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.website}</span>
                        </a>
                      )}
                    </div>
                    {p.renewal_notes && (
                      <div className="text-[11px] text-muted-foreground/70 italic line-clamp-2">{p.renewal_notes}</div>
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => moveToColumn(p.id, prevCol?.id ?? null)}
                          disabled={isLeftmost}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                          title={prevCol ? `Move to ${prevCol.label}` : ''}
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        {isNotRenewing ? (
                          <button
                            onClick={() => archive(p.id, p.name)}
                            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => moveToColumn(p.id, nextCol?.id ?? null)}
                            disabled={isRightmost}
                            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            title={nextCol ? `Move to ${nextCol.label}` : ''}
                          >
                            {nextCol?.label || ''}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
