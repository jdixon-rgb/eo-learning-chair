-- 083_drop_breaking_sap_contact_policies.sql
-- Drop the two SAP-contact SELECT policies that 080 added to public.events
-- and public.saps. They were breaking SELECT queries on those tables on
-- prod (and cascading through PostgREST embedded selects to budget_items
-- and contract_checklists) — manifesting as "Failed to load: events,
-- saps, budget_items, contract_checklists" on the dashboard, which then
-- fell back to mockData.js and showed visibly-wrong event titles.
--
-- The policies in question (from migration 080):
--   "SAP contact can view invited events" on public.events
--   "SAP contact can view own partner" on public.saps
--
-- Why they broke things: when multiple permissive RLS policies exist for
-- SELECT, Postgres evaluates ALL of their USING clauses for each row.
-- An error in any one fails the whole query. The events policy used
-- `sc.sap_id = any(sap_ids)` over an EXISTS join — a shape that interacts
-- badly with prod's actual events data in a way that was not exposed by
-- staging's smaller / fictional dataset. Resolved on prod manually via
-- Supabase SQL Editor 2026-05-09; this migration codifies the drop so
-- staging and any future env stays in sync.
--
-- What we lose: there are no SAP-contact-role users authenticated on
-- prod yet (the auth path requires profiles.sap_contact_id linkage,
-- which had been part of the long-standing 035 drift — only restored
-- earlier today by 080). So in practice, dropping these has no impact
-- on real users right now. When SAP contact auth goes live, we'll
-- redesign these two policies (likely as a pre-filter inline join on
-- the user's profile rather than per-row EXISTS evaluation) and
-- re-introduce them in a separate migration.

drop policy if exists "SAP contact can view invited events" on public.events;
drop policy if exists "SAP contact can view own partner" on public.saps;

notify pgrst, 'reload schema';
