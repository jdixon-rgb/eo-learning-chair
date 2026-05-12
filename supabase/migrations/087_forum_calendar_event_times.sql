-- 085_forum_calendar_event_times.sql
-- Real start/end timestamps on forum calendar events.
--
-- Original schema had only `event_date date` — a single calendar day.
-- Multi-day events like a forum retreat couldn't be expressed; nothing
-- carried a start time. The moderator (the primary editor of this
-- calendar) needs both ends and times so members can plan around the
-- actual block.
--
-- Additive: keeps `event_date` populated for backward compatibility
-- with code that reads it directly. New writes set BOTH `event_date`
-- (= starts_at::date) and `starts_at` / `ends_at`.
-- A follow-up migration can drop `event_date` once we've audited
-- everything that reads it.

alter table public.forum_calendar_events
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

-- Backfill starts_at from event_date for any existing rows so reads
-- never see a null start. Midnight in UTC is good enough for a date-
-- only event; the moderator can edit to add a real time.
update public.forum_calendar_events
set starts_at = (event_date::timestamp at time zone 'UTC')
where starts_at is null;

create index if not exists forum_calendar_events_starts_at_idx
  on public.forum_calendar_events (starts_at);
