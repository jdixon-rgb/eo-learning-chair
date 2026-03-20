-- ============================================================
-- 005 Enrich Chapter Members
-- Add fields for forum, industry, EO join date, phone, and
-- split name into first/last for richer member profiles.
-- ============================================================

-- New columns on chapter_members
alter table public.chapter_members
  add column if not exists first_name text default '',
  add column if not exists last_name text default '',
  add column if not exists phone text default '',
  add column if not exists forum text default '',
  add column if not exists industry text default '',
  add column if not exists eo_join_date date,
  add column if not exists notes text default '';

-- Backfill first_name / last_name from existing name column
update public.chapter_members
  set first_name = split_part(name, ' ', 1),
      last_name = substring(name from position(' ' in name) + 1)
  where (first_name is null or first_name = '')
    and name is not null
    and name != '';

-- Index for forum lookups
create index if not exists idx_chapter_members_forum on public.chapter_members(forum);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
