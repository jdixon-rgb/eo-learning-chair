-- 082_events_owner_chair.sql
-- Cross-chair calendar visibility: tag every event with the chair role
-- responsible for it so the unified chapter calendar can color-code by
-- domain (Learning / Engagement / Membership / Social / Forum / etc.)
-- and let any chair filter to just the columns they care about.
--
-- Default 'learning' on new and existing rows — every event in the table
-- today was created by the Learning Chair surface, so the backfill is
-- accurate for the existing data set.
--
-- This is additive only. event_type / event_format / strategic_importance
-- continue to mean what they meant before; owner_chair is a new orthogonal
-- dimension answering "which chair owns this event," not "what kind of
-- programming is it."

alter table public.events
  add column if not exists owner_chair text not null default 'learning';

-- Backfill existing rows defensively (covers edge cases where the default
-- didn't apply, e.g. rows whose chapter_id was set in a prior migration).
update public.events set owner_chair = 'learning' where owner_chair is null;
