-- ============================================================
-- 095 Member Engagement Chair — Phase 1
-- ============================================================
-- Builds out the Engagement Chair surface per Sergei's brief:
-- navigator ranking, new-member profiles, two-way feedback, and
-- Breaking Barriers Dinners. Reuses the existing venues catalog
-- and extends budget_items to cover dinners alongside events.
--
-- Idempotent: safe to re-run.

-- ── 1. Navigator rating (same pattern as venues.staff_rating) ──
alter table public.navigators
  add column if not exists staff_rating int;

alter table public.navigators
  drop constraint if exists navigators_staff_rating_check;
alter table public.navigators
  add constraint navigators_staff_rating_check
  check (staff_rating is null or staff_rating between 1 and 5);

-- ── 2. new_member_profiles ───────────────────────────────────
-- One row per new member, keyed to chapter_members. Extensible:
-- placement notes / expectations conversation / first-year-renewal
-- flag are filled by Engagement now and Forum Placement next term
-- without schema churn.
create table if not exists public.new_member_profiles (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  joined_on date,
  placement_notes text default '',
  expectations_set_at timestamptz,
  expectations_notes text default '',
  first_year_renewal_status text not null default 'unknown'
    check (first_year_renewal_status in ('unknown', 'on_track', 'at_risk', 'renewed', 'lapsed')),
  first_year_renewal_notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, chapter_member_id)
);

create index if not exists idx_new_member_profiles_chapter
  on public.new_member_profiles(chapter_id);
create index if not exists idx_new_member_profiles_member
  on public.new_member_profiles(chapter_member_id);

-- ── 3. navigator_feedback ────────────────────────────────────
-- New member's lightweight one-tap reaction on their navigator.
-- Designed to avoid survey fatigue: a reaction + optional note.
-- Multiple rows per pairing are fine (one per check-in moment).
create table if not exists public.navigator_feedback (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid not null references public.navigator_pairings(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  reaction text not null check (reaction in (
    'great',
    'helpful',
    'silent',
    'no_touches',
    'mismatch'
  )),
  note text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_navigator_feedback_pairing
  on public.navigator_feedback(pairing_id);
create index if not exists idx_navigator_feedback_member
  on public.navigator_feedback(chapter_member_id);

-- ── 4. breaking_barriers_dinners ─────────────────────────────
-- The Breaking Barriers pane: small dinners that mix new and
-- tenured members, hosted at a venue from the shared library.
create table if not exists public.breaking_barriers_dinners (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_year text not null default '',
  title text not null,
  dinner_date date,
  dinner_time text default '',
  host_member_id uuid references public.chapter_members(id) on delete set null,
  facilitator_member_id uuid references public.chapter_members(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  status text not null default 'planning' check (status in (
    'planning', 'confirmed', 'completed', 'cancelled'
  )),
  notes text default '',
  host_rating int check (host_rating is null or host_rating between 1 and 5),
  facilitator_rating int check (facilitator_rating is null or facilitator_rating between 1 and 5),
  host_rating_notes text default '',
  facilitator_rating_notes text default '',
  reminders_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bb_dinners_chapter on public.breaking_barriers_dinners(chapter_id);
create index if not exists idx_bb_dinners_fy on public.breaking_barriers_dinners(chapter_id, fiscal_year);
create index if not exists idx_bb_dinners_host on public.breaking_barriers_dinners(host_member_id);
create index if not exists idx_bb_dinners_venue on public.breaking_barriers_dinners(venue_id);

-- ── 5. breaking_barriers_attendees ───────────────────────────
-- Per-attendee row so we can track RSVP + reminder delivery.
create table if not exists public.breaking_barriers_attendees (
  id uuid primary key default gen_random_uuid(),
  dinner_id uuid not null references public.breaking_barriers_dinners(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  rsvp_status text not null default 'invited' check (rsvp_status in (
    'invited', 'yes', 'no', 'maybe', 'attended', 'no_show'
  )),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dinner_id, chapter_member_id)
);

create index if not exists idx_bb_attendees_dinner on public.breaking_barriers_attendees(dinner_id);
create index if not exists idx_bb_attendees_member on public.breaking_barriers_attendees(chapter_member_id);

-- ── 6. budget_items polymorphism: event_id OR dinner_id ──────
-- Reuse the same line-item table for dinners. Exactly one parent
-- must be set; check constraint enforces.
alter table public.budget_items
  add column if not exists dinner_id uuid
  references public.breaking_barriers_dinners(id) on delete cascade;

alter table public.budget_items
  alter column event_id drop not null;

alter table public.budget_items
  drop constraint if exists budget_items_parent_check;
alter table public.budget_items
  add constraint budget_items_parent_check
  check (
    (event_id is not null and dinner_id is null)
    or (event_id is null and dinner_id is not null)
  );

create index if not exists idx_budget_items_dinner on public.budget_items(dinner_id);

-- ── 7. RLS ───────────────────────────────────────────────────
-- Match the permissive Phase-1 pattern from migration 012.
alter table public.new_member_profiles enable row level security;
alter table public.navigator_feedback enable row level security;
alter table public.breaking_barriers_dinners enable row level security;
alter table public.breaking_barriers_attendees enable row level security;

-- new_member_profiles
drop policy if exists "Anon can view new_member_profiles" on public.new_member_profiles;
create policy "Anon can view new_member_profiles" on public.new_member_profiles
  for select using (true);
drop policy if exists "Admins can insert new_member_profiles" on public.new_member_profiles;
create policy "Admins can insert new_member_profiles" on public.new_member_profiles
  for insert with check (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can update new_member_profiles" on public.new_member_profiles;
create policy "Admins can update new_member_profiles" on public.new_member_profiles
  for update using (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can delete new_member_profiles" on public.new_member_profiles;
create policy "Admins can delete new_member_profiles" on public.new_member_profiles
  for delete using (public.is_super_admin() or public.is_admin());

-- navigator_feedback
drop policy if exists "Anon can view navigator_feedback" on public.navigator_feedback;
create policy "Anon can view navigator_feedback" on public.navigator_feedback
  for select using (true);
drop policy if exists "Admins can insert navigator_feedback" on public.navigator_feedback;
create policy "Admins can insert navigator_feedback" on public.navigator_feedback
  for insert with check (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can update navigator_feedback" on public.navigator_feedback;
create policy "Admins can update navigator_feedback" on public.navigator_feedback
  for update using (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can delete navigator_feedback" on public.navigator_feedback;
create policy "Admins can delete navigator_feedback" on public.navigator_feedback
  for delete using (public.is_super_admin() or public.is_admin());

-- breaking_barriers_dinners
drop policy if exists "Anon can view bb_dinners" on public.breaking_barriers_dinners;
create policy "Anon can view bb_dinners" on public.breaking_barriers_dinners
  for select using (true);
drop policy if exists "Admins can insert bb_dinners" on public.breaking_barriers_dinners;
create policy "Admins can insert bb_dinners" on public.breaking_barriers_dinners
  for insert with check (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can update bb_dinners" on public.breaking_barriers_dinners;
create policy "Admins can update bb_dinners" on public.breaking_barriers_dinners
  for update using (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can delete bb_dinners" on public.breaking_barriers_dinners;
create policy "Admins can delete bb_dinners" on public.breaking_barriers_dinners
  for delete using (public.is_super_admin() or public.is_admin());

-- breaking_barriers_attendees
drop policy if exists "Anon can view bb_attendees" on public.breaking_barriers_attendees;
create policy "Anon can view bb_attendees" on public.breaking_barriers_attendees
  for select using (true);
drop policy if exists "Admins can insert bb_attendees" on public.breaking_barriers_attendees;
create policy "Admins can insert bb_attendees" on public.breaking_barriers_attendees
  for insert with check (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can update bb_attendees" on public.breaking_barriers_attendees;
create policy "Admins can update bb_attendees" on public.breaking_barriers_attendees
  for update using (public.is_super_admin() or public.is_admin());
drop policy if exists "Admins can delete bb_attendees" on public.breaking_barriers_attendees;
create policy "Admins can delete bb_attendees" on public.breaking_barriers_attendees
  for delete using (public.is_super_admin() or public.is_admin());

-- ── 8. PostgREST cache reload ────────────────────────────────
notify pgrst, 'reload schema';
