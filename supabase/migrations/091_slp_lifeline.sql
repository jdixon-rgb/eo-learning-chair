-- ============================================================
-- 091 SLP forums: parallel personal data (lifeline)
-- ============================================================
-- SLPs need the same Lifeline experience members get, but with
-- their own data slice — keeping the populations strictly separate.
-- Mirrors 031 (member_private + life_events) one-for-one, keyed by
-- slps.id instead of chapter_members.id. RLS is owner-only:
-- current_slp_id() gates every operation.
--
-- Idempotent: safe to re-run.

-- ── 1. slp_private (owner-only profile fields) ──────────────
-- 1:1 with slps. Same privacy posture as member_private — any
-- field here is, by policy, visible/writable ONLY by the owning
-- SLP.
create table if not exists public.slp_private (
  slp_id     uuid primary key references public.slps(id) on delete cascade,
  birth_year int,
  updated_at timestamptz not null default now()
);

-- ── 2. slp_life_events ──────────────────────────────────────
-- Mirrors life_events. Reuses the same enums (life_event_valence,
-- life_event_time_type) since the data shape is identical.
create table if not exists public.slp_life_events (
  id            uuid primary key default gen_random_uuid(),
  slp_id        uuid not null references public.slps(id) on delete cascade,
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

create index if not exists idx_slp_life_events_slp
  on public.slp_life_events(slp_id);
create index if not exists idx_slp_life_events_slp_timeline
  on public.slp_life_events(slp_id, computed_year, sort_order);

-- ── 3. RLS — strictly owner-only for both tables ────────────
alter table public.slp_private    enable row level security;
alter table public.slp_life_events enable row level security;

-- slp_private
drop policy if exists "Owner can view own private fields" on public.slp_private;
create policy "Owner can view own private fields" on public.slp_private
  for select using (slp_id = public.current_slp_id());

drop policy if exists "Owner can insert own private fields" on public.slp_private;
create policy "Owner can insert own private fields" on public.slp_private
  for insert with check (slp_id = public.current_slp_id());

drop policy if exists "Owner can update own private fields" on public.slp_private;
create policy "Owner can update own private fields" on public.slp_private
  for update using (slp_id = public.current_slp_id());

drop policy if exists "Owner can delete own private fields" on public.slp_private;
create policy "Owner can delete own private fields" on public.slp_private
  for delete using (slp_id = public.current_slp_id());

-- slp_life_events
drop policy if exists "Author can view own life events" on public.slp_life_events;
create policy "Author can view own life events" on public.slp_life_events
  for select using (slp_id = public.current_slp_id());

drop policy if exists "Author can insert own life events" on public.slp_life_events;
create policy "Author can insert own life events" on public.slp_life_events
  for insert with check (slp_id = public.current_slp_id());

drop policy if exists "Author can update own life events" on public.slp_life_events;
create policy "Author can update own life events" on public.slp_life_events
  for update using (slp_id = public.current_slp_id());

drop policy if exists "Author can delete own life events" on public.slp_life_events;
create policy "Author can delete own life events" on public.slp_life_events
  for delete using (slp_id = public.current_slp_id());

notify pgrst, 'reload schema';
