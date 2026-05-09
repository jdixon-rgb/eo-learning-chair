import { useMemo } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { useAuth } from '@/lib/auth'
import { SAP_TIERS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Mail, Phone, Globe, RotateCcw, Calendar } from 'lucide-react'

// Past SAPs — institutional memory of partners we used to work with.
// Keeps the full record (contact, sponsorship amount, contribution
// type, notes) so a future SAP Chair can revisit them — "look, we
// know things have changed, we'd love to have you back." A Re-engage
// button moves a past SAP back into the prospect pipeline as a Lead.

export default function PastSAPsList({ search = '' }) {
  const { partners, revivePartnerToProspect, deletePartner } = useSAPStore()
  const { effectiveRole } = useAuth()
  const canRevive = ['super_admin', 'sap_chair', 'chapter_executive_director', 'chapter_experience_coordinator'].includes(effectiveRole)

  const inactivePartners = useMemo(() => {
    const q = search.trim().toLowerCase()
    return partners
      .filter(p => p.status === 'inactive')
      .filter(p => {
        if (!q) return true
        return (
          (p.name || '').toLowerCase().includes(q)
          || (p.industry || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const at = a.updated_at || a.created_at || ''
        const bt = b.updated_at || b.created_at || ''
        return bt.localeCompare(at)
      })
  }, [partners, search])

  const revive = (sapId, name) => {
    if (!window.confirm(`Move ${name} back into the prospect pipeline as a Lead? Their full history will be preserved.`)) return
    revivePartnerToProspect(sapId)
  }

  const remove = (sapId, name) => {
    if (!window.confirm(`Permanently delete ${name}? This loses all historical record. Re-engage instead if you might want them back.`)) return
    deletePartner(sapId)
  }

  if (inactivePartners.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/70 text-center py-12">
        No past SAPs in the archive yet. When an active SAP declines to renew, archive them from the
        renewal board to keep their record here for future re-engagement.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/80">
        {inactivePartners.length} past partner{inactivePartners.length === 1 ? '' : 's'} on file. Their
        record stays preserved so a future chair can re-engage when something changes on either side.
      </p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
        {inactivePartners.map(p => {
          const tier = SAP_TIERS.find(t => t.id === p.tier)
          const lastDate = p.updated_at || p.created_at
          const lastDateStr = lastDate ? new Date(lastDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null
          return (
            <div key={p.id} className="p-4 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-start">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
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
                  <div className="text-xs text-muted-foreground">{p.industry}</div>
                )}
                {p.description && (
                  <div className="text-xs text-muted-foreground/80 line-clamp-2">{p.description}</div>
                )}
              </div>

              <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground/80 min-w-0">
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

              <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground/80">
                {p.annual_sponsorship != null && p.annual_sponsorship !== '' && (
                  <div>
                    <span className="font-medium text-foreground">{formatCurrency(Number(p.annual_sponsorship) || 0)}</span>
                    <span className="ml-1">last contribution</span>
                  </div>
                )}
                {p.contribution_type && (
                  <div className="capitalize">{p.contribution_type.replace(/_/g, ' ')}</div>
                )}
                {lastDateStr && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Archived {lastDateStr}
                  </div>
                )}
                {p.renewal_notes && (
                  <div className="italic mt-1 line-clamp-2">{p.renewal_notes}</div>
                )}
              </div>

              {canRevive && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => revive(p.id, p.name)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-engage
                  </button>
                  <button
                    onClick={() => remove(p.id, p.name)}
                    className="text-[10px] px-3 py-1 rounded text-muted-foreground/70 hover:text-destructive"
                  >
                    Delete record
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
