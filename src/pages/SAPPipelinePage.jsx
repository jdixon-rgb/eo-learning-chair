import { useState, useMemo } from 'react'
import { useSAPStore } from '@/lib/sapStore'
import { SAP_PIPELINE_STAGES, SAP_TIERS } from '@/lib/constants'
import PageHeader from '@/lib/pageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, ArrowRight, ArrowLeft, CheckCircle2, Mail, Phone, Globe } from 'lucide-react'

const emptyForm = {
  name: '', industry: '', tier: 'gold',
  contact_email: '', contact_phone: '', website: '',
  description: '', notes: '',
  pipeline_stage: 'lead',
}

// SAP prospect pipeline. Prospective partners (status='prospect')
// move through five stages on their way to becoming active SAPs.
// On the final stage, the chair clicks Promote → status flips to
// 'active', pipeline_stage clears, and they show up in /partners.
export default function SAPPipelinePage() {
  const { partners, addProspect, advancePipelineStage, promoteProspectToActive, deletePartner } = useSAPStore()

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const prospects = useMemo(
    () => partners.filter(p => p.status === 'prospect'),
    [partners],
  )

  const byStage = useMemo(() => {
    const map = new Map(SAP_PIPELINE_STAGES.map(s => [s.id, []]))
    for (const p of prospects) {
      const stage = p.pipeline_stage || 'lead'
      if (!map.has(stage)) map.set(stage, [])
      map.get(stage).push(p)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    return map
  }, [prospects])

  const handleAdd = () => {
    if (!form.name.trim()) return
    addProspect({ ...form })
    setForm(emptyForm)
    setShowAdd(false)
  }

  const advance = (sapId, currentStage, dir) => {
    const idx = SAP_PIPELINE_STAGES.findIndex(s => s.id === currentStage)
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= SAP_PIPELINE_STAGES.length) return
    advancePipelineStage(sapId, SAP_PIPELINE_STAGES[nextIdx].id)
  }

  const promote = (sapId) => {
    if (!window.confirm('Promote this prospect to an active SAP partner? They will appear in the main SAPs list.')) return
    promoteProspectToActive(sapId)
  }

  const remove = (sapId) => {
    if (!window.confirm('Remove this prospect from the pipeline? This deletes the record.')) return
    deletePartner(sapId)
  }

  return (
    <div className="px-4 py-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="SAP Pipeline"
        subtitle="Prospective partners moving through outreach. Add a lead, advance through stages, then promote to an active SAP once their contract is signed."
      />
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Prospect
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SAP_PIPELINE_STAGES.map(stage => {
          const list = byStage.get(stage.id) || []
          return (
            <div key={stage.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                className="px-3 py-2 border-b border-border flex items-center justify-between"
                style={{ backgroundColor: `${stage.color}1a` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {stage.label}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{list.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[180px]">
                {list.length === 0 && (
                  <div className="text-[11px] text-muted-foreground/60 text-center py-6">
                    No prospects in this stage
                  </div>
                )}
                {list.map(p => {
                  const isFirst = stage.id === SAP_PIPELINE_STAGES[0].id
                  const isLast = stage.id === SAP_PIPELINE_STAGES[SAP_PIPELINE_STAGES.length - 1].id
                  const tier = SAP_TIERS.find(t => t.id === p.tier)
                  return (
                    <div key={p.id} className="rounded-lg border border-border/70 bg-background p-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-foreground line-clamp-2">
                          {p.name}
                        </div>
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
                      {p.notes && (
                        <div className="text-[11px] text-muted-foreground/70 italic line-clamp-2">{p.notes}</div>
                      )}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => advance(p.id, stage.id, -1)}
                          disabled={isFirst}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move back a stage"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        {isLast ? (
                          <button
                            onClick={() => promote(p.id)}
                            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Promote to Active
                          </button>
                        ) : (
                          <button
                            onClick={() => advance(p.id, stage.id, 1)}
                            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            Advance
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(p.id)}
                          className="text-[10px] px-1.5 py-1 rounded text-muted-foreground/70 hover:text-destructive"
                          title="Remove prospect"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Company name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
              <Select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
              >
                {SAP_TIERS.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Contact email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
              <Input
                placeholder="Contact phone"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <Input
              placeholder="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <Select
              value={form.pipeline_stage}
              onChange={(e) => setForm({ ...form, pipeline_stage: e.target.value })}
            >
              {SAP_PIPELINE_STAGES.map(s => (
                <option key={s.id} value={s.id}>Start in: {s.label}</option>
              ))}
            </Select>
            <Textarea
              placeholder="Notes (last touch, who's championing this lead, etc.)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Prospect</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
