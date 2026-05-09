import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSAPStore } from '@/lib/sapStore'
import SAPRenewalControl from '@/components/SAPRenewalControl'
import ProspectPipelineBoard from '@/components/sap/ProspectPipelineBoard'
import RenewalKanbanBoard from '@/components/sap/RenewalKanbanBoard'
import PastSAPsList from '@/components/sap/PastSAPsList'
import IndustryCombobox from '@/components/sap/IndustryCombobox'
import { useVendorStore, VENDOR_CATEGORIES } from '@/lib/vendorStore'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { insertRow } from '@/lib/db'
import { SAP_TIERS, SAP_CONTRIBUTION_TYPES } from '@/lib/constants'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Building2, User, ChevronDown, ChevronRight,
  Mail, Phone, Globe, GraduationCap, Trash2, Pencil, Users, Send, Eye,
} from 'lucide-react'

const emptyPartnerForm = {
  name: '', industry: '', tier: 'gold', status: 'active',
  description: '', contribution_type: 'sponsorship', contribution_description: '',
  contact_email: '', contact_phone: '', website: '',
  annual_sponsorship: '', notes: '',
}

const emptyContactForm = {
  name: '', role: '', email: '', phone: '',
  is_primary: false, forum_trained: false, forum_trained_date: '', notes: '',
}

export default function SAPPartnersPage() {
  const {
    partners, contacts, loading,
    addPartner, updatePartner, deletePartner,
    addContact, updateContact, deleteContact,
    contactsForPartner, primaryContact,
  } = useSAPStore()
  const { addVendor: addVendorRecord, deleteVendor: deleteVendorRecord, vendorForSAP } = useVendorStore()
  const { profile, canSwitchRoles, setViewAsRole, setViewAsSapContactId, effectiveRole } = useAuth()
  const canEditRenewal = ['super_admin', 'sap_chair', 'chapter_executive_director', 'chapter_experience_coordinator'].includes(effectiveRole)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [invitedEmails, setInvitedEmails] = useState(new Set())
  const [expandedPartner, setExpandedPartner] = useState(null)
  // Inner view mode for the Active board. List is the default —
  // it's the most compact and most familiar; users can opt into
  // Renewal Kanban or Tier View when they want a different lens.
  const [viewMode, setViewMode] = useState('list')

  // Outer toggle — Active | Prospect | Past — synced to ?view= so
  // links and back-button navigation work across the SAP lifecycle.
  // Older `?view=pipeline` URLs are accepted as an alias for prospect.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSegment = searchParams.get('view') || 'active'
  const segment = rawSegment === 'pipeline' ? 'prospect' : rawSegment
  const setSegment = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'active') params.delete('view'); else params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  // Partner dialog
  const [showPartnerForm, setShowPartnerForm] = useState(false)
  const [editPartner, setEditPartner] = useState(null)
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm)

  // Contact dialog
  const [showContactForm, setShowContactForm] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [contactForm, setContactForm] = useState(emptyContactForm)
  const [contactForPartnerId, setContactForPartnerId] = useState(null)

  const activePartners = partners.filter(p => (p.status || 'active') === 'active')
  const inactivePartners = partners.filter(p => p.status === 'inactive')

  const filtered = activePartners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.industry?.toLowerCase().includes(search.toLowerCase())
  )

  const tierCounts = SAP_TIERS.map(t => ({
    ...t,
    count: activePartners.filter(p => p.tier === t.id).length,
  }))

  // ── Partner form handlers ──────────────────────────────
  const openAddPartner = () => {
    setEditPartner(null)
    setPartnerForm(emptyPartnerForm)
    setShowPartnerForm(true)
  }

  const openEditPartner = (partner) => {
    setEditPartner(partner)
    setPartnerForm({
      name: partner.name || '',
      industry: partner.industry || '',
      tier: partner.tier || 'gold',
      status: partner.status || 'active',
      description: partner.description || '',
      contribution_type: partner.contribution_type || 'sponsorship',
      contribution_description: partner.contribution_description || '',
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      website: partner.website || '',
      annual_sponsorship: partner.annual_sponsorship || '',
      notes: partner.notes || '',
    })
    setShowPartnerForm(true)
  }

  const handlePartnerSubmit = () => {
    if (!partnerForm.name) return
    const data = {
      ...partnerForm,
      annual_sponsorship: partnerForm.annual_sponsorship ? parseFloat(partnerForm.annual_sponsorship) : null,
    }
    if (editPartner) {
      updatePartner(editPartner.id, data)
    } else {
      const newPartner = addPartner(data)
      // Auto-create a linked vendor in the Vendor Exchange
      if (newPartner?.id) {
        addVendorRecord({
          name: data.name,
          category: data.industry || 'Other',
          website: data.website || '',
          phone: data.contact_phone || '',
          tier: 'sap_partner',
          sap_id: newPartner.id,
          created_by: profile?.id ?? null,
        })
      }
    }
    setShowPartnerForm(false)
    setEditPartner(null)
    setPartnerForm(emptyPartnerForm)
  }

  // ── Contact form handlers ──────────────────────────────
  const openAddContact = (partnerId) => {
    setEditContact(null)
    setContactForPartnerId(partnerId)
    setContactForm(emptyContactForm)
    setShowContactForm(true)
  }

  const openEditContact = (contact) => {
    setEditContact(contact)
    setContactForPartnerId(contact.sap_id)
    setContactForm({
      name: contact.name || '',
      role: contact.role || '',
      email: contact.email || '',
      phone: contact.phone || '',
      is_primary: contact.is_primary || false,
      forum_trained: contact.forum_trained || false,
      forum_trained_date: contact.forum_trained_date || '',
      notes: contact.notes || '',
    })
    setShowContactForm(true)
  }

  const handleContactSubmit = () => {
    if (!contactForm.name) return
    const data = {
      ...contactForm,
      forum_trained_date: contactForm.forum_trained_date || null,
    }
    if (editContact) {
      updateContact(editContact.id, data)
    } else {
      addContact({ ...data, sap_id: contactForPartnerId })
    }
    setShowContactForm(false)
    setEditContact(null)
    setContactForm(emptyContactForm)
  }

  // ── Portal invite handler ───────────────────────────────
  const inviteToPortal = useCallback(async (contact) => {
    if (!contact.email) {
      alert('Add an email for this contact before inviting.')
      return
    }
    if (!isSupabaseConfigured()) {
      setInvitedEmails(prev => new Set([...prev, contact.email.toLowerCase()]))
      alert(`[Dev mode] Would invite ${contact.name} (${contact.email}) to SAP Portal.`)
      return
    }
    try {
      await insertRow('member_invites', {
        email: contact.email,
        full_name: contact.name,
        role: 'sap_contact',
        invited_by: profile?.id || null,
      })
      setInvitedEmails(prev => new Set([...prev, contact.email.toLowerCase()]))
    } catch (err) {
      if (err?.message?.includes('duplicate') || err?.code === '23505') {
        setInvitedEmails(prev => new Set([...prev, contact.email.toLowerCase()]))
      } else {
        alert(`Invite failed: ${err.message || err}`)
      }
    }
  }, [profile])

  // ── Partner card ───────────────────────────────────────
  const PartnerCard = ({ partner }) => {
    const isExpanded = expandedPartner === partner.id
    const partnerContacts = contactsForPartner(partner.id)
    const primary = primaryContact(partner.id)
    const tier = SAP_TIERS.find(t => t.id === partner.tier)
    const contribType = SAP_CONTRIBUTION_TYPES.find(c => c.id === partner.contribution_type)

    return (
      <div className="rounded-lg border bg-white shadow-sm">
        {/* Header row */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setExpandedPartner(isExpanded ? null : partner.id)}
        >
          <button className="shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${tier?.color}20` }}>
            <Building2 className="h-4 w-4" style={{ color: tier?.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold truncate">{partner.name}</h4>
              {contribType && (
                <Badge variant="outline" className="text-[10px] shrink-0">{contribType.label}</Badge>
              )}
            </div>
            {partner.industry && (
              <p className="text-xs text-muted-foreground truncate">{partner.industry}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {primary && (
              <span className="text-xs text-muted-foreground hidden sm:inline">{primary.name}</span>
            )}
            <span onClick={(e) => e.stopPropagation()} className="hidden md:inline-flex">
              <SAPRenewalControl partner={partner} readOnly={!canEditRenewal} />
            </span>
            <Badge variant="outline" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              {partnerContacts.length}
            </Badge>
            <button
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e) => { e.stopPropagation(); openEditPartner(partner) }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded: contacts list */}
        {isExpanded && (
          <div className="border-t px-3 pb-3 pt-2">
            {partner.description && (
              <p className="text-xs text-muted-foreground mb-2">{partner.description}</p>
            )}
            {partner.website && (
              <a
                href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
                onClick={e => e.stopPropagation()}
              >
                <Globe className="h-3 w-3" /> {partner.website}
              </a>
            )}

            {/* Contacts table */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts</span>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => openAddContact(partner.id)}>
                  <Plus className="h-3 w-3 mr-1" /> Contact
                </Button>
              </div>
              {partnerContacts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No contacts yet</p>
              ) : (
                <div className="space-y-1">
                  {partnerContacts.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 group cursor-pointer"
                      onClick={() => openEditContact(c)}
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{c.name}</span>
                          {c.is_primary && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">Primary</Badge>
                          )}
                          {c.forum_trained && (
                            <span title="Forum trained" className="text-green-600">
                              <GraduationCap className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        {c.role && <span className="text-xs text-muted-foreground">{c.role}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:text-primary"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:text-primary"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {canSwitchRoles && (
                          <button
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-indigo-500 cursor-pointer"
                            title={`View portal as ${c.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewAsRole('sap_contact')
                              setViewAsSapContactId(c.id)
                              navigate('/sap-portal')
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                        {c.email && !invitedEmails.has(c.email.toLowerCase()) ? (
                          <button
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-indigo-500 cursor-pointer"
                            title="Invite to SAP Portal"
                            onClick={(e) => { e.stopPropagation(); inviteToPortal(c) }}
                          >
                            <Send className="h-3 w-3" />
                          </button>
                        ) : c.email && invitedEmails.has(c.email.toLowerCase()) ? (
                          <span className="text-[9px] text-green-600 font-medium">Invited</span>
                        ) : null}
                        <button
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete contact ${c.name}?`)) deleteContact(c.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {partner.notes && (
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t italic">{partner.notes}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading partners...</p>
      </div>
    )
  }

  const prospectCount = partners.filter(p => p.status === 'prospect').length
  const pastCount = partners.filter(p => p.status === 'inactive').length

  const segments = [
    { id: 'active', label: 'Active', count: activePartners.length },
    { id: 'prospect', label: 'Prospect', count: prospectCount },
    { id: 'past', label: 'Past', count: pastCount },
  ]

  return (
    <div className="space-y-6">
      <TourTip />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="SAPs"
          subtitle={
            segment === 'active'
              ? `${activePartners.length} active partner${activePartners.length !== 1 ? 's' : ''} \u00b7 ${contacts.length} contacts`
              : segment === 'prospect'
                ? `${prospectCount} prospect${prospectCount !== 1 ? 's' : ''}`
                : `${pastCount} past partner${pastCount !== 1 ? 's' : ''} on file`
          }
        />
        <div className="flex gap-2 ml-auto items-center flex-wrap">
          {(segment === 'active' || segment === 'past') && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                className="pl-9 w-60"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          {segment === 'active' && (
            <>
              <Select value={viewMode} onChange={e => setViewMode(e.target.value)} className="w-36">
                <option value="list">List View</option>
                <option value="renewal">Renewal Kanban</option>
                <option value="tiers">Tier View</option>
              </Select>
              <Button size="sm" onClick={openAddPartner}>
                <Plus className="h-4 w-4" /> Add Partner
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Segmented toggle: Active | Prospect | Past */}
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {segments.map(s => {
          const active = s.id === segment
          return (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground/80'}`}>
                {s.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Prospect Kanban */}
      {segment === 'prospect' && <ProspectPipelineBoard />}

      {/* Past SAPs (institutional memory + re-engage) */}
      {segment === 'past' && <PastSAPsList search={search} />}

      {/* Active board */}
      {segment === 'active' && (
        <>
      {/* Tier summary badges */}
      <div className="flex gap-3 flex-wrap">
        {tierCounts.map(t => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-sm text-muted-foreground">{t.count}</span>
          </div>
        ))}
      </div>

      {/* Renewal Kanban (default for Active) */}
      {viewMode === 'renewal' ? (
        <RenewalKanbanBoard search={search} />
      ) : viewMode === 'tiers' ? (
        <div className="space-y-6">
          {SAP_TIERS.map(tier => {
            const tierPartners = filtered.filter(p => p.tier === tier.id)
            if (tierPartners.length === 0 && search) return null
            return (
              <div key={tier.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }} />
                  <h2 className="text-lg font-semibold">{tier.label}</h2>
                  <span className="text-sm text-muted-foreground">({tierPartners.length})</span>
                </div>
                {tierPartners.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                    No {tier.label.toLowerCase()} partners
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tierPartners.map(p => <PartnerCard key={p.id} partner={p} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* List View — all columns are always rendered. On screens
           narrower than the table's min-width, the wrapper provides
           horizontal swipe scrolling so the user can reach every
           column. The min-width keeps cells from squishing into
           unreadable columns; touchAction=pan-x pairs with the body's
           overflow-x-hidden to make the swipe feel native. */
        <div
          className="rounded-xl border bg-card shadow-sm overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Partner</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Industry</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Tier</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Primary Contact</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Contacts</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Forum Trained</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(partner => {
                const primary = primaryContact(partner.id)
                const partnerContacts = contactsForPartner(partner.id)
                const forumTrainedCount = partnerContacts.filter(c => c.forum_trained).length
                const tier = SAP_TIERS.find(t => t.id === partner.tier)
                const contribType = SAP_CONTRIBUTION_TYPES.find(c => c.id === partner.contribution_type)
                return (
                  <tr key={partner.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEditPartner(partner)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${tier?.color}20` }}>
                          <Building2 className="h-4 w-4" style={{ color: tier?.color }} />
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{partner.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{partner.industry || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: tier?.color, color: tier?.color }}>
                        {tier?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{contribType?.label || '—'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{primary?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center">{partnerContacts.length}</td>
                    <td className="px-4 py-3 text-center">
                      {forumTrainedCount > 0 ? (
                        <span className="text-sm text-green-600 font-medium">{forumTrainedCount}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

        </>
      )}
      {/* Inactive partners now live under the "Past" segment via PastSAPsList. */}

      {/* ── Add/Edit Partner Dialog ───────────────────────── */}
      <Dialog open={showPartnerForm} onOpenChange={setShowPartnerForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPartner ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Company Name *</label>
                <Input value={partnerForm.name} onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Partner company name" />
              </div>
              <div>
                <label className="text-xs font-medium">Industry</label>
                <IndustryCombobox
                  value={partnerForm.industry}
                  onChange={(v) => setPartnerForm(p => ({ ...p, industry: v }))}
                  placeholder="Type or pick an industry"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Tier</label>
                <Select value={partnerForm.tier} onChange={e => setPartnerForm(p => ({ ...p, tier: e.target.value }))}>
                  {SAP_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Contribution Type</label>
                <Select value={partnerForm.contribution_type} onChange={e => setPartnerForm(p => ({ ...p, contribution_type: e.target.value }))}>
                  {SAP_CONTRIBUTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Status</label>
                <Select value={partnerForm.status} onChange={e => setPartnerForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Description</label>
                <Textarea value={partnerForm.description} onChange={e => setPartnerForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this partner provide?" rows={2} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Contribution Details</label>
                <Textarea value={partnerForm.contribution_description} onChange={e => setPartnerForm(p => ({ ...p, contribution_description: e.target.value }))} placeholder="Describe the specific contribution or sponsorship..." rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium">Website</label>
                <Input value={partnerForm.website} onChange={e => setPartnerForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium">Annual Sponsorship ($)</label>
                <Input type="number" value={partnerForm.annual_sponsorship} onChange={e => setPartnerForm(p => ({ ...p, annual_sponsorship: e.target.value }))} placeholder="Amount" />
              </div>
              <div>
                <label className="text-xs font-medium">Company Email</label>
                <Input value={partnerForm.contact_email} onChange={e => setPartnerForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="info@company.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Company Phone</label>
                <Input value={partnerForm.contact_phone} onChange={e => setPartnerForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={partnerForm.notes} onChange={e => setPartnerForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePartnerSubmit} className="flex-1">{editPartner ? 'Save Changes' : 'Add Partner'}</Button>
              {editPartner && (
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => {
                  if (confirm(`Delete ${editPartner.name}? This will also remove all their contacts and vendor listing.`)) {
                    // Also remove linked vendor
                    const linkedVendor = vendorForSAP(editPartner.id)
                    if (linkedVendor) deleteVendorRecord(linkedVendor.id)
                    deletePartner(editPartner.id)
                    setShowPartnerForm(false)
                  }
                }}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Contact Dialog ───────────────────────── */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Name *</label>
                <Input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Contact name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Role / Title</label>
                <Input value={contactForm.role} onChange={e => setContactForm(p => ({ ...p, role: e.target.value }))} placeholder="Account Manager, etc." />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <Input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="name@company.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <Input value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm(p => ({ ...p, is_primary: e.target.checked }))} />
                  Primary contact
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={contactForm.forum_trained} onChange={e => setContactForm(p => ({ ...p, forum_trained: e.target.checked }))} />
                  Forum trained
                </label>
              </div>
              {contactForm.forum_trained && (
                <div className="col-span-2">
                  <label className="text-xs font-medium">Forum Training Date</label>
                  <Input type="date" value={contactForm.forum_trained_date} onChange={e => setContactForm(p => ({ ...p, forum_trained_date: e.target.value }))} />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes about this contact..." rows={2} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleContactSubmit} className="flex-1">{editContact ? 'Save Changes' : 'Add Contact'}</Button>
              {editContact && (
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => {
                  if (confirm(`Delete contact ${editContact.name}?`)) {
                    deleteContact(editContact.id)
                    setShowContactForm(false)
                  }
                }}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
