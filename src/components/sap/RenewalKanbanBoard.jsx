import { useMemo, useState } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { SAP_RENEWAL_STATUSES, SAP_TIERS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Phone, Globe, Archive, Check } from 'lucide-react'
import SAPRating from '@/components/sap/SAPRating'

// Renewal Kanban — four columns (Renewing | Uncertain | Not renewing
// | Not set) for status='active' partners. The retention chair tags
// each card with a renewal intent via a row of explicit-label status
// pills (works equally well on stacked mobile and side-by-side
// desktop — no left/right arrows to interpret). On the "Not renewing"
// column, an Archive action moves the partner into Past SAPs.

const COLUMNS = [
  ...SAP_RENEWAL_STATUSES.map(s => ({ id: s.id, label: s.label, color: s.color })),
  { id: null, label: 'Not set', color: '#94a3b8' },
]

export default function RenewalKanbanBoard({ search = '' }) {
  const { partners, setRenewalStatus, archivePartner } = useSAPStore()
  const { effectiveRole } = useAuth()
  const canEdit = hasPermission(effectiveRole, 'canEditSAPs')

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

  // When the chair marks a partner Not Renewing, capture the reason
  // and stamp it onto renewal_notes — that note is the permanent
  // record. It travels with the SAP if/when they're archived to Past
  // and is visible to the next chair so the institutional why
  // doesn't get lost.
  const [reasonTarget, setReasonTarget] = useState(null) // { sapId, name, prior }
  const [reasonDraft, setReasonDraft] = useState('')

  const setStatus = (sapId, statusId) => {
    if (!canEdit) return
    if (statusId === 'not_renewing') {
      const partner = partners.find(p => p.id === sapId)
      // If they're already not_renewing, treat re-clicking as a no-op
      // rather than re-prompting (the reason is already on file).
      if (partner?.renewal_status === 'not_renewing') return
      setReasonTarget({ sapId, name: partner?.name || 'this partner', prior: partner?.renewal_notes || '' })
      setReasonDraft(partner?.renewal_notes || '')
      return
    }
    setRenewalStatus(sapId, statusId, undefined)
  }

  const submitReason = () => {
    if (!reasonTarget) return
    const reason = reasonDraft.trim()
    if (!reason) return
    setRenewalStatus(reasonTarget.sapId, 'not_renewing', reason)
    setReasonTarget(null)
    setReasonDraft('')
  }

  const cancelReason = () => {
    setReasonTarget(null)
    setReasonDraft('')
  }

  const archive = (sapId, name) => {
    if (!canEdit) return
    if (!window.confirm(`Archive ${name}? They'll move to Past SAPs and stop appearing in member-facing views, but their record stays for re-engagement later.`)) return
    archivePartner(sapId)
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map(col => {
        const list = byStatus.get(col.id) || []
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
                return (
                  <div key={p.id} className="rounded-lg border border-border/70 bg-background p-2.5 space-y-2">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.industry && (
                        <span className="text-[11px] text-muted-foreground/80">{p.industry}</span>
                      )}
                      <SAPRating sapId={p.id} />
                    </div>
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
                      <div className="pt-1 space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                          Mark as
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SAP_RENEWAL_STATUSES.map(s => {
                            const selected = p.renewal_status === s.id
                            return (
                              <button
                                key={s.id}
                                onClick={() => setStatus(p.id, s.id)}
                                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${selected ? '' : 'hover:bg-muted'}`}
                                style={selected
                                  ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                                  : { borderColor: `${s.color}55`, color: s.color }}
                                aria-pressed={selected}
                              >
                                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                                {s.label}
                              </button>
                            )
                          })}
                        </div>
                        {isNotRenewing && (
                          <button
                            onClick={() => archive(p.id, p.name)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 mt-1"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive — Move to Past SAPs
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

    <Dialog open={!!reasonTarget} onOpenChange={(open) => { if (!open) cancelReason() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why isn't {reasonTarget?.name} renewing?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            This becomes part of the permanent record so a future SAP Chair
            can see the context — even if the partner gets archived to
            Past SAPs and re-engaged later.
          </p>
          <Textarea
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder="Reason — pricing, fit, change in their business, change in ours, etc."
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancelReason}>Cancel</Button>
            <Button onClick={submitReason} disabled={!reasonDraft.trim()}>
              Save & mark Not renewing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
