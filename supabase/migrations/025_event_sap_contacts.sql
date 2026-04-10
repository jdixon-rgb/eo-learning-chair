-- 025_event_sap_contacts.sql
-- Track which contact (person) from each linked SAP is the speaker for an event.
-- Stored as a JSON object: { "sap_id": "contact_id", ... }
-- The sap_ids uuid[] array remains the source of truth for which SAPs are linked;
-- this column adds the optional contact-level detail.

alter table public.events
  add column if not exists sap_contact_ids jsonb default '{}';

notify pgrst, 'reload schema';
