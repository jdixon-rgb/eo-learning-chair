import { useMemo } from 'react'
import { useAuth } from './auth'
import { useSAPStore } from './sapStore'
import { useStore } from './store'

/**
 * Data-access hook for authenticated SAP contacts.
 * Selects the contact, partner, and relevant events from existing stores.
 */
export function useSAPContact() {
  const { sapContactId } = useAuth()
  const { contacts, partners, engagements } = useSAPStore()
  const { events } = useStore()

  const contact = useMemo(
    () => contacts.find(c => c.id === sapContactId) ?? null,
    [contacts, sapContactId],
  )

  const partner = useMemo(
    () => (contact ? partners.find(p => p.id === contact.sap_id) ?? null : null),
    [partners, contact],
  )

  // Events where this partner's ID is in event.sap_ids (specifically invited)
  const partnerEvents = useMemo(
    () =>
      partner
        ? events.filter(e => Array.isArray(e.sap_ids) && e.sap_ids.includes(partner.id))
        : [],
    [events, partner],
  )

  // All events open to SAP partners (for the calendar view)
  const sapVisibleEvents = useMemo(
    () => events.filter(e => e.open_to_saps),
    [events],
  )

  // All contacts at the same partner company
  const colleagueContacts = useMemo(
    () => (contact ? contacts.filter(c => c.sap_id === contact.sap_id) : []),
    [contacts, contact],
  )

  // Engagements for this partner
  const partnerEngagements = useMemo(
    () => (partner ? engagements.filter(e => e.sap_id === partner.id) : []),
    [engagements, partner],
  )

  const speakingEngagements = useMemo(
    () => partnerEngagements.filter(e => e.role === 'presenting'),
    [partnerEngagements],
  )

  const attendingEngagements = useMemo(
    () => partnerEngagements.filter(e => e.role === 'attending'),
    [partnerEngagements],
  )

  return { contact, partner, partnerEvents, sapVisibleEvents, colleagueContacts, partnerEngagements, speakingEngagements, attendingEngagements }
}
