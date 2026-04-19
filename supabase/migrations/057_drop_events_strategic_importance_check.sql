-- Drop stale CHECK constraint on events.strategic_importance.
--
-- The original constraint (from 001_add_app_tables.sql) allowed:
--   'kickoff', 'momentum', 'renewal_critical', 'sustain', 'strong_close'
--
-- Over time the client vocabulary diverged from this. CalendarPage now
-- derives strategic_importance from STRATEGIC_MAP labels:
--   'kickoff', 'momentum', 'no_event', 'renewal', 'sustain', 'gratitude_gala'
--
-- Result: creating any event in February (RENEWAL), May (GRATITUDE
-- GALA), or December (NO EVENT) failed silently with
--   "new row for relation 'events' violates check constraint
--    events_strategic_importance_check"
--
-- The local optimistic insert succeeded so the user saw the event in
-- their UI, but it never persisted to Supabase. Subsequent operations
-- on that "zombie event" silently fail.
--
-- Fix: drop the constraint. The field is informational metadata derived
-- from month_index via STRATEGIC_MAP and doesn't need DB-level
-- validation. If validation becomes useful again later, a non-breaking
-- text-based check or enum can be reintroduced.
--
-- Idempotent: safe to re-run.

alter table public.events
  drop constraint if exists events_strategic_importance_check;

notify pgrst, 'reload schema';
