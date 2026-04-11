-- 031_lifeline.sql
-- Lifeline module: per-member life events plotted on a timeline.
-- Strictly private to the author — view and edit scoped to the owner only.
--
-- Privacy note: birth_year lives on a dedicated member_private table rather
-- than chapter_members, because Postgres RLS is row-level, not column-level.
-- Putting sensitive fields on chapter_members would leak them through every
-- existing query that returns a member row. member_private is the home for
-- any future private-profile fields (ask me for more as they come up).

-- ── 1. member_private (owner-only profile fields) ────────────
-- 1:1 with chapter_members. Any field added here is, by policy, visible and
-- writable ONLY by the owning member.
create table if not exists public.member_private (
  member_id  uuid primary key references public.chapter_members(id) on delete cascade,
  birth_year int,
  updated_at timestamptz not null default now()
);

-- ── 2. Enums for life_events ─────────────────────────────────
do $$ begin
  create type public.life_event_valence as enum ('positive', 'negative');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.life_event_time_type as enum ('year', 'age');
exception when duplicate_object then null; end $$;

-- ── 3. life_events ───────────────────────────────────────────
-- Ports the original Lifeline schema:
--   time_type = 'year' → time_value is a literal year, computed_year = time_value
--   time_type = 'age'  → time_value is the member's age, computed_year = birth_year + age
-- computed_year is denormalized for sort; app recomputes on insert/update and
-- backfills when birth_year changes.
create table if not exists public.life_events (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.chapter_members(id) on delete cascade,
  title         text not null,
  summary       text not null default '',
  valence       public.life_event_valence not null,
  intensity     int not null check (intensity between 1 and 5),
  time_type     public.life_event_time_type not null,
  time_value    int not null,
  computed_year int not null,
  sort_order    int not null default 0,
  brief         boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_life_events_member
  on public.life_events(member_id);
create index if not exists idx_life_events_member_timeline
  on public.life_events(member_id, computed_year, sort_order);

-- ── 4. RLS — strictly owner-only for both tables ─────────────
alter table public.member_private enable row level security;
alter table public.life_events    enable row level security;

-- member_private: owner-only (select / insert / update / delete)
create policy "Owner can view own private fields" on public.member_private
  for select using (member_id = public.current_chapter_member_id());
create policy "Owner can insert own private fields" on public.member_private
  for insert with check (member_id = public.current_chapter_member_id());
create policy "Owner can update own private fields" on public.member_private
  for update using (member_id = public.current_chapter_member_id());
create policy "Owner can delete own private fields" on public.member_private
  for delete using (member_id = public.current_chapter_member_id());

-- life_events: author-only (select / insert / update / delete)
create policy "Author can view own life events" on public.life_events
  for select using (member_id = public.current_chapter_member_id());
create policy "Author can insert own life events" on public.life_events
  for insert with check (member_id = public.current_chapter_member_id());
create policy "Author can update own life events" on public.life_events
  for update using (member_id = public.current_chapter_member_id());
create policy "Author can delete own life events" on public.life_events
  for delete using (member_id = public.current_chapter_member_id());

-- ── 5. Reload PostgREST schema cache ─────────────────────────
notify pgrst, 'reload schema';
