-- 033_saps_add_missing_columns.sql
-- The saps table was missing columns that the app code and CSV import expect:
-- tier, status, industry, website. Without these, every insert silently failed
-- because Supabase rejected the unknown columns. CSV-imported partners appeared
-- in the UI (optimistic state) but vanished on reload (never persisted).

alter table public.saps add column if not exists tier text default 'gold';
alter table public.saps add column if not exists status text default 'active';
alter table public.saps add column if not exists industry text default '';
alter table public.saps add column if not exists website text default '';

notify pgrst, 'reload schema';
