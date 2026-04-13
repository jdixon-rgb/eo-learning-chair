-- 041_events_open_to_saps.sql
-- Add open_to_saps flag to events. Defaults to true — most events are
-- open to SAP partners. Toggle off for the rare members-only events.

alter table public.events
  add column if not exists open_to_saps boolean not null default true;
