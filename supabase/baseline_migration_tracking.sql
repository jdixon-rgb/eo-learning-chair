-- ============================================================
-- Our Chapter OS — Migration Tracking Baseline
-- Marks migrations 001-069 as already applied without re-running them.
-- Apply this AFTER baseline.sql on a fresh Supabase project.
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

INSERT INTO supabase_migrations.schema_migrations VALUES ('001', '{"-- ============================================================
-- EO Learning Chair — App Data Tables
-- Run this AFTER schema.sql (which creates auth tables)
-- ============================================================

-- 1. Chapters
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fiscal_year_start integer not null check (fiscal_year_start between 1 and 12),
  total_budget integer not null default 0,
  president_theme text default '''',
  president_name text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- Link profiles to chapters (column already exists, just add FK)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = ''fk_profiles_chapter''
  ) then
    alter table public.profiles
      add constraint fk_profiles_chapter
      foreign key (chapter_id) references public.chapters(id);
  end if;
end $$","-- 2. Venues
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  address text default '''',
  capacity integer,
  base_rental_cost integer,
  av_quality text check (av_quality in (''excellent'', ''good'', ''fair'', ''byob'')),
  av_cost_estimate integer,
  venue_type text check (venue_type in (''hotel'', ''museum'', ''outdoor'', ''restaurant'', ''private'', ''other'')),
  pipeline_stage text not null check (pipeline_stage in (''researching'', ''quote_requested'', ''site_visit'', ''negotiating'', ''contract'', ''confirmed'')),
  staff_rating integer check (staff_rating between 1 and 5),
  image_url text,
  description text default '''',
  notes text default '''',
  contact_name text default '''',
  contact_email text default '''',
  contact_phone text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- 3. Speakers
create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  topic text default '''',
  bio text default '''',
  fee_range_low integer,
  fee_range_high integer,
  fee_estimated integer,
  fee_actual integer,
  contact_email text default '''',
  contact_phone text default '''',
  agency_name text default '''',
  agency_contact text default '''',
  contact_method text check (contact_method in (''direct'', ''agency'', ''linkedin'', ''referral'')),
  pipeline_stage text not null check (pipeline_stage in (''researching'', ''outreach'', ''negotiating'', ''contracted'', ''confirmed'', ''passed'')),
  fit_score integer check (fit_score between 1 and 10),
  notes text default '''',
  sizzle_reel_url text default '''',
  routing_flexibility boolean default false,
  multi_chapter_interest boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- 4. Strategic Alliance Partners (SAPs)
create table if not exists public.saps (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  company text default '''',
  role text default '''',
  description text default '''',
  contribution_type text check (contribution_type in (''workshop'', ''sponsorship'', ''service'', ''other'')),
  contribution_description text default '''',
  contact_email text default '''',
  contact_phone text default '''',
  annual_sponsorship integer,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- 5. Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  event_date date,
  event_time text,
  month_index integer check (month_index between 0 and 9),
  event_type text check (event_type in (''traditional'', ''experiential'', ''social'', ''key_relationships'')),
  event_format text check (event_format in (''keynote'', ''workshop_2hr'', ''workshop_4hr'', ''workshop_8hr'', ''tour'', ''dinner'')),
  strategic_importance text check (strategic_importance in (''kickoff'', ''momentum'', ''renewal_critical'', ''sustain'', ''strong_close'')),
  status text not null default ''planning'' check (status in (''planning'', ''speaker_confirmed'', ''venue_confirmed'', ''fully_confirmed'', ''marketing'', ''completed'', ''cancelled'')),
  speaker_id uuid references public.speakers(id) on delete set null,
  candidate_speaker_ids uuid[] default ''{}'',
  sap_ids uuid[] default ''{}'',
  venue_id uuid references public.venues(id) on delete set null,
  day_chair_name text default '''',
  day_chair_phone text default '''',
  expected_attendance integer,
  actual_attendance integer,
  nps_score numeric(3,1),
  nps_top_takeaway text,
  theme_connection text default '''',
  notes text default '''',
  title_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- 6. Budget Items
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null check (category in (''speaker_fee'', ''food_beverage'', ''venue_rental'', ''av_production'', ''travel'', ''marketing'', ''other'')),
  description text default '''',
  estimated_amount integer default 0,
  actual_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_budget_items_event on public.budget_items(event_id)","-- 7. Contract Checklists (one per event)
create table if not exists public.contract_checklists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  jurisdiction_local boolean default false,
  indemnification_clause boolean default false,
  mfn_clause boolean default false,
  run_of_show_included boolean default false,
  av_requirements_specified boolean default false,
  cancellation_terms boolean default false,
  recording_rights boolean default false,
  contract_signed boolean default false,
  contract_notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- 8. Scenarios (what-if planning)
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  overrides jsonb not null default ''[]'',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.chapters enable row level security","alter table public.venues enable row level security","alter table public.speakers enable row level security","alter table public.saps enable row level security","alter table public.events enable row level security","alter table public.budget_items enable row level security","alter table public.contract_checklists enable row level security","alter table public.scenarios enable row level security","-- Authenticated users can read all app data
-- Admins (learning_chair, CEC, CED) can write

-- Chapters
create policy \"Authenticated users can view chapters\" on public.chapters
  for select using (auth.uid() is not null)","create policy \"Admins can insert chapters\" on public.chapters
  for insert with check (public.is_admin())","create policy \"Admins can update chapters\" on public.chapters
  for update using (public.is_admin())","create policy \"Admins can delete chapters\" on public.chapters
  for delete using (public.is_admin())","-- Venues
create policy \"Authenticated users can view venues\" on public.venues
  for select using (auth.uid() is not null)","create policy \"Admins can insert venues\" on public.venues
  for insert with check (public.is_admin())","create policy \"Admins can update venues\" on public.venues
  for update using (public.is_admin())","create policy \"Admins can delete venues\" on public.venues
  for delete using (public.is_admin())","-- Speakers
create policy \"Authenticated users can view speakers\" on public.speakers
  for select using (auth.uid() is not null)","create policy \"Admins can insert speakers\" on public.speakers
  for insert with check (public.is_admin())","create policy \"Admins can update speakers\" on public.speakers
  for update using (public.is_admin())","create policy \"Admins can delete speakers\" on public.speakers
  for delete using (public.is_admin())","-- SAPs
create policy \"Authenticated users can view saps\" on public.saps
  for select using (auth.uid() is not null)","create policy \"Admins can insert saps\" on public.saps
  for insert with check (public.is_admin())","create policy \"Admins can update saps\" on public.saps
  for update using (public.is_admin())","create policy \"Admins can delete saps\" on public.saps
  for delete using (public.is_admin())","-- Events
create policy \"Authenticated users can view events\" on public.events
  for select using (auth.uid() is not null)","create policy \"Admins can insert events\" on public.events
  for insert with check (public.is_admin())","create policy \"Admins can update events\" on public.events
  for update using (public.is_admin())","create policy \"Admins can delete events\" on public.events
  for delete using (public.is_admin())","-- Budget Items
create policy \"Authenticated users can view budget_items\" on public.budget_items
  for select using (auth.uid() is not null)","create policy \"Admins can insert budget_items\" on public.budget_items
  for insert with check (public.is_admin())","create policy \"Admins can update budget_items\" on public.budget_items
  for update using (public.is_admin())","create policy \"Admins can delete budget_items\" on public.budget_items
  for delete using (public.is_admin())","-- Contract Checklists
create policy \"Authenticated users can view contract_checklists\" on public.contract_checklists
  for select using (auth.uid() is not null)","create policy \"Admins can insert contract_checklists\" on public.contract_checklists
  for insert with check (public.is_admin())","create policy \"Admins can update contract_checklists\" on public.contract_checklists
  for update using (public.is_admin())","create policy \"Admins can delete contract_checklists\" on public.contract_checklists
  for delete using (public.is_admin())","-- Scenarios
create policy \"Authenticated users can view scenarios\" on public.scenarios
  for select using (auth.uid() is not null)","create policy \"Admins can insert scenarios\" on public.scenarios
  for insert with check (public.is_admin())","create policy \"Admins can update scenarios\" on public.scenarios
  for update using (public.is_admin())","create policy \"Admins can delete scenarios\" on public.scenarios
  for delete using (public.is_admin())"}', 'add_app_tables');
INSERT INTO supabase_migrations.schema_migrations VALUES ('002', '{"-- ============================================================
-- 002 Multi-Chapter Support
-- Adds super_admin role, chapter-scoped RLS, helper functions
-- ============================================================

-- ============================================================
-- 1. Add ''super_admin'' to role check constraints
-- ============================================================

-- profiles: drop and recreate
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''learning_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- member_invites: drop and recreate
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''learning_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- ============================================================
-- 2. Add chapter_id to member_invites (nullable for backward compat)
-- ============================================================

alter table public.member_invites
  add column if not exists chapter_id uuid references public.chapters(id)","-- ============================================================
-- 3. Update handle_new_user() to pull chapter_id from invite
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
begin
  select * into invite from public.member_invites
    where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, chapter_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
    coalesce(invite.role, ''member''),
    invite.chapter_id
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  return new;
end;
$$ language plpgsql security definer","-- ============================================================
-- 4. Helper functions
-- ============================================================

-- is_super_admin(): checks if current user has role ''super_admin''
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = ''super_admin''
  );
$$ language sql security definer stable","-- user_chapter_id(): returns current user''s chapter_id
create or replace function public.user_chapter_id()
returns uuid as $$
  select chapter_id from public.profiles
  where id = auth.uid();
$$ language sql security definer stable","-- is_chapter_admin(check_chapter_id): checks if current user is admin for the given chapter
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (''learning_chair'', ''chapter_experience_coordinator'', ''chapter_executive_director'')
  );
$$ language sql security definer stable","-- ============================================================
-- 5. Drop ALL existing RLS policies on app tables
-- ============================================================

-- chapters
drop policy if exists \"Authenticated users can view chapters\" on public.chapters","drop policy if exists \"Admins can insert chapters\" on public.chapters","drop policy if exists \"Admins can update chapters\" on public.chapters","drop policy if exists \"Admins can delete chapters\" on public.chapters","-- venues
drop policy if exists \"Authenticated users can view venues\" on public.venues","drop policy if exists \"Admins can insert venues\" on public.venues","drop policy if exists \"Admins can update venues\" on public.venues","drop policy if exists \"Admins can delete venues\" on public.venues","-- speakers
drop policy if exists \"Authenticated users can view speakers\" on public.speakers","drop policy if exists \"Admins can insert speakers\" on public.speakers","drop policy if exists \"Admins can update speakers\" on public.speakers","drop policy if exists \"Admins can delete speakers\" on public.speakers","-- saps
drop policy if exists \"Authenticated users can view saps\" on public.saps","drop policy if exists \"Admins can insert saps\" on public.saps","drop policy if exists \"Admins can update saps\" on public.saps","drop policy if exists \"Admins can delete saps\" on public.saps","-- events
drop policy if exists \"Authenticated users can view events\" on public.events","drop policy if exists \"Admins can insert events\" on public.events","drop policy if exists \"Admins can update events\" on public.events","drop policy if exists \"Admins can delete events\" on public.events","-- budget_items
drop policy if exists \"Authenticated users can view budget_items\" on public.budget_items","drop policy if exists \"Admins can insert budget_items\" on public.budget_items","drop policy if exists \"Admins can update budget_items\" on public.budget_items","drop policy if exists \"Admins can delete budget_items\" on public.budget_items","-- contract_checklists
drop policy if exists \"Authenticated users can view contract_checklists\" on public.contract_checklists","drop policy if exists \"Admins can insert contract_checklists\" on public.contract_checklists","drop policy if exists \"Admins can update contract_checklists\" on public.contract_checklists","drop policy if exists \"Admins can delete contract_checklists\" on public.contract_checklists","-- scenarios
drop policy if exists \"Authenticated users can view scenarios\" on public.scenarios","drop policy if exists \"Admins can insert scenarios\" on public.scenarios","drop policy if exists \"Admins can update scenarios\" on public.scenarios","drop policy if exists \"Admins can delete scenarios\" on public.scenarios","-- ============================================================
-- 6. Create new chapter-scoped RLS policies
-- ============================================================

-- -------------------------------------------------------
-- Chapters
-- -------------------------------------------------------

-- Anon/public read
create policy \"Anon can view chapters\" on public.chapters
  for select using (true)","-- Authenticated: super_admin sees all, others see own chapter
create policy \"Users can view own chapter\" on public.chapters
  for select using (
    public.is_super_admin()
    or id = public.user_chapter_id()
  )","-- Only super_admin can create/update/delete chapters
create policy \"Super admin can insert chapters\" on public.chapters
  for insert with check (public.is_super_admin())","create policy \"Super admin can update chapters\" on public.chapters
  for update using (public.is_super_admin())","create policy \"Super admin can delete chapters\" on public.chapters
  for delete using (public.is_super_admin())","-- -------------------------------------------------------
-- Speakers
-- -------------------------------------------------------

create policy \"Anon can view speakers\" on public.speakers
  for select using (true)","create policy \"Chapter scoped select speakers\" on public.speakers
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Chapter scoped insert speakers\" on public.speakers
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped update speakers\" on public.speakers
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped delete speakers\" on public.speakers
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- -------------------------------------------------------
-- Venues
-- -------------------------------------------------------

create policy \"Anon can view venues\" on public.venues
  for select using (true)","create policy \"Chapter scoped select venues\" on public.venues
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Chapter scoped insert venues\" on public.venues
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped update venues\" on public.venues
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped delete venues\" on public.venues
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- -------------------------------------------------------
-- Events
-- -------------------------------------------------------

create policy \"Anon can view events\" on public.events
  for select using (true)","create policy \"Chapter scoped select events\" on public.events
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Chapter scoped insert events\" on public.events
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped update events\" on public.events
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped delete events\" on public.events
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- -------------------------------------------------------
-- SAPs
-- -------------------------------------------------------

create policy \"Anon can view saps\" on public.saps
  for select using (true)","create policy \"Chapter scoped select saps\" on public.saps
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Chapter scoped insert saps\" on public.saps
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped update saps\" on public.saps
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped delete saps\" on public.saps
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- -------------------------------------------------------
-- Scenarios
-- -------------------------------------------------------

create policy \"Anon can view scenarios\" on public.scenarios
  for select using (true)","create policy \"Chapter scoped select scenarios\" on public.scenarios
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Chapter scoped insert scenarios\" on public.scenarios
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped update scenarios\" on public.scenarios
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Chapter scoped delete scenarios\" on public.scenarios
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- -------------------------------------------------------
-- Budget Items (scoped through event_id -> events.chapter_id)
-- -------------------------------------------------------

create policy \"Anon can view budget_items\" on public.budget_items
  for select using (true)","create policy \"Chapter scoped select budget_items\" on public.budget_items
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and (public.is_chapter_admin(events.chapter_id) or events.chapter_id = public.user_chapter_id())
    )
  )","create policy \"Chapter scoped insert budget_items\" on public.budget_items
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","create policy \"Chapter scoped update budget_items\" on public.budget_items
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","create policy \"Chapter scoped delete budget_items\" on public.budget_items
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","-- -------------------------------------------------------
-- Contract Checklists (scoped through event_id -> events.chapter_id)
-- -------------------------------------------------------

create policy \"Anon can view contract_checklists\" on public.contract_checklists
  for select using (true)","create policy \"Chapter scoped select contract_checklists\" on public.contract_checklists
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and (public.is_chapter_admin(events.chapter_id) or events.chapter_id = public.user_chapter_id())
    )
  )","create policy \"Chapter scoped insert contract_checklists\" on public.contract_checklists
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","create policy \"Chapter scoped update contract_checklists\" on public.contract_checklists
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","create policy \"Chapter scoped delete contract_checklists\" on public.contract_checklists
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  )","-- ============================================================
-- 7. Seed super_admin invite
-- ============================================================

insert into public.member_invites (email, full_name, role)
values (''john@example.com'', ''John Dixon'', ''super_admin'')
on conflict (email) do update set role = ''super_admin''"}', 'multi_chapter');
INSERT INTO supabase_migrations.schema_migrations VALUES ('003', '{"-- ============================================================
-- 003 Board Management Module
-- Chair reports, communications, forums, member scorecards
-- ============================================================

-- ============================================================
-- 1. Tables
-- ============================================================

-- Chair Reports (monthly reports from each chair to the board)
create table if not exists public.chair_reports (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_month_index integer not null check (fiscal_month_index between 0 and 9),
  chair_role text not null,
  chair_name text not null default '''',
  submitted_by uuid references auth.users(id),
  status text not null default ''draft'' check (status in (''draft'', ''submitted'', ''reviewed'')),
  highlights text default '''',
  challenges text default '''',
  metrics jsonb default ''{}'',
  next_month_plan text default '''',
  board_notes text default '''',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_chair_reports_chapter on public.chair_reports(chapter_id)","-- Chapter Communications (messages sent to chapter members)
create table if not exists public.chapter_communications (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sent_by uuid references auth.users(id),
  subject text not null,
  body text not null,
  audience text not null default ''all_members'' check (audience in (''all_members'', ''board_only'', ''chairs_only'', ''custom'')),
  audience_roles text[] default ''{}'',
  channel text not null default ''in_app'' check (channel in (''in_app'', ''email'', ''both'')),
  status text not null default ''draft'' check (status in (''draft'', ''scheduled'', ''sent'')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_chapter_comms_chapter on public.chapter_communications(chapter_id)","-- Forums (EO forum/mastermind groups within a chapter)
create table if not exists public.forums (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  moderator_name text default '''',
  moderator_email text default '''',
  meeting_cadence text default ''monthly'' check (meeting_cadence in (''weekly'', ''biweekly'', ''monthly'')),
  member_count integer default 0,
  health_score integer check (health_score between 1 and 10),
  health_notes text default '''',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_forums_chapter on public.forums(chapter_id)","-- Member Scorecards (engagement tracking per member per period)
create table if not exists public.member_scorecards (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_profile_id uuid references public.profiles(id),
  member_name text not null,
  fiscal_month_index integer not null check (fiscal_month_index between 0 and 9),
  events_attended integer default 0,
  forum_meetings_attended integer default 0,
  forum_id uuid references public.forums(id) on delete set null,
  engagement_score integer check (engagement_score between 0 and 100),
  at_risk boolean default false,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_member_scorecards_chapter on public.member_scorecards(chapter_id)","-- ============================================================
-- 2. Enable RLS
-- ============================================================

alter table public.chair_reports enable row level security","alter table public.chapter_communications enable row level security","alter table public.forums enable row level security","alter table public.member_scorecards enable row level security","-- ============================================================
-- 3. Helper function
-- ============================================================

create or replace function public.is_board_member(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (''board_liaison'', ''learning_chair'', ''chapter_experience_coordinator'', ''chapter_executive_director'')
  );
$$ language sql security definer stable","-- ============================================================
-- 4. RLS Policies - Chair Reports
-- ============================================================

create policy \"Anon can view chair_reports\" on public.chair_reports
  for select using (true)","create policy \"Chapter scoped select chair_reports\" on public.chair_reports
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Board can insert chair_reports\" on public.chair_reports
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can update chair_reports\" on public.chair_reports
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can delete chair_reports\" on public.chair_reports
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","-- ============================================================
-- 5. RLS Policies - Chapter Communications
-- ============================================================

create policy \"Anon can view chapter_communications\" on public.chapter_communications
  for select using (true)","create policy \"Chapter scoped select chapter_communications\" on public.chapter_communications
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can insert chapter_communications\" on public.chapter_communications
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can update chapter_communications\" on public.chapter_communications
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can delete chapter_communications\" on public.chapter_communications
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","-- ============================================================
-- 6. RLS Policies - Forums
-- ============================================================

create policy \"Anon can view forums\" on public.forums
  for select using (true)","create policy \"Chapter scoped select forums\" on public.forums
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
    or public.user_chapter_id() = chapter_id
  )","create policy \"Board can insert forums\" on public.forums
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can update forums\" on public.forums
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can delete forums\" on public.forums
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","-- ============================================================
-- 7. RLS Policies - Member Scorecards
-- ============================================================

create policy \"Anon can view member_scorecards\" on public.member_scorecards
  for select using (true)","create policy \"Chapter scoped select member_scorecards\" on public.member_scorecards
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can insert member_scorecards\" on public.member_scorecards
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can update member_scorecards\" on public.member_scorecards
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","create policy \"Board can delete member_scorecards\" on public.member_scorecards
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  )","-- ============================================================
-- 8. Reload PostgREST schema cache
-- ============================================================

notify pgrst, ''reload schema''"}', 'board_management');
INSERT INTO supabase_migrations.schema_migrations VALUES ('004', '{"-- ============================================================
-- EO Learning Chair — Event Document Uploads
-- Run AFTER 003_board_management.sql
-- Paste each block into Supabase SQL Editor one at a time
-- ============================================================

-- ─── Block 1: Create Storage Bucket ───────────────────────
-- NOTE: If this fails, create the bucket manually in
-- Supabase Dashboard > Storage > New Bucket > \"event-documents\"
-- Set it to Private and 10MB max file size.

insert into storage.buckets (id, name, public, file_size_limit)
values (''event-documents'', ''event-documents'', false, 10485760)
on conflict (id) do nothing","-- ─── Block 2: Create event_documents Table ────────────────

create table if not exists public.event_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  document_type text not null default ''other'' check (document_type in (''contract'', ''loi'', ''rider'', ''insurance'', ''invoice'', ''other'')),
  file_name text not null,
  file_size integer default 0,
  mime_type text default '''',
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_event_documents_event on public.event_documents(event_id)","create index if not exists idx_event_documents_chapter on public.event_documents(chapter_id)","-- ─── Block 3: Enable RLS ─────────────────────────────────

alter table public.event_documents enable row level security","-- ─── Block 4: Table RLS Policies ──────────────────────────

create policy \"Anon can view event_documents\" on public.event_documents
  for select using (true)","create policy \"Admins can insert event_documents\" on public.event_documents
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Admins can update event_documents\" on public.event_documents
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","create policy \"Admins can delete event_documents\" on public.event_documents
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  )","-- ─── Block 5: Storage RLS Policies ───────────────────────

create policy \"Authenticated users can download event docs\"
  on storage.objects for select
  using (bucket_id = ''event-documents'' and auth.role() = ''authenticated'')","create policy \"Admins can upload event docs\"
  on storage.objects for insert
  with check (
    bucket_id = ''event-documents''
    and auth.role() = ''authenticated''
  )","create policy \"Admins can delete event docs\"
  on storage.objects for delete
  using (
    bucket_id = ''event-documents''
    and auth.role() = ''authenticated''
  )","-- ─── Block 6: Reload Schema Cache ────────────────────────

notify pgrst, ''reload schema''"}', 'event_documents');
INSERT INTO supabase_migrations.schema_migrations VALUES ('005', '{"-- ============================================================
-- 005 Enrich Chapter Members
-- Add fields for forum, industry, EO join date, phone, and
-- split name into first/last for richer member profiles.
-- ============================================================

-- New columns on chapter_members
alter table public.chapter_members
  add column if not exists first_name text default '''',
  add column if not exists last_name text default '''',
  add column if not exists phone text default '''',
  add column if not exists forum text default '''',
  add column if not exists industry text default '''',
  add column if not exists eo_join_date date,
  add column if not exists notes text default ''''","-- Backfill first_name / last_name from existing name column
update public.chapter_members
  set first_name = split_part(name, '' '', 1),
      last_name = substring(name from position('' '' in name) + 1)
  where (first_name is null or first_name = '''')
    and name is not null
    and name != ''''","-- Index for forum lookups
create index if not exists idx_chapter_members_forum on public.chapter_members(forum)","-- Reload PostgREST schema cache
notify pgrst, ''reload schema''"}', 'enrich_chapter_members');
INSERT INTO supabase_migrations.schema_migrations VALUES ('006', '{"-- Add forum moderator flag to chapter_members
ALTER TABLE chapter_members ADD COLUMN IF NOT EXISTS is_forum_moderator BOOLEAN DEFAULT false"}', 'add_forum_moderator');
INSERT INTO supabase_migrations.schema_migrations VALUES ('007', '{"-- ============================================================
-- 006 Board Positions, Role Assignments, and Chapter Members
-- Creates tables for dynamic board management that were
-- previously set up manually without a migration file.
-- Also fixes the role_assignments.status CHECK constraint
-- to use ''elect'' instead of ''incoming''/''outgoing''.
-- ============================================================

-- ── 1. chapter_roles ──────────────────────────────────────────
create table if not exists public.chapter_roles (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  role_key text not null,
  label text not null,
  is_staff boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chapter_id, role_key)
)","create index if not exists idx_chapter_roles_chapter on public.chapter_roles(chapter_id)","-- ── 2. chapter_members ────────────────────────────────────────
-- Note: columns first_name, last_name, phone, forum, industry,
-- eo_join_date, notes are added by migration 005 if not present.
create table if not exists public.chapter_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  first_name text default '''',
  last_name text default '''',
  email text default '''',
  phone text default '''',
  company text default '''',
  forum text default '''',
  industry text default '''',
  eo_join_date date,
  notes text default '''',
  status text not null default ''active'' check (status in (''active'', ''inactive'', ''alumni'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_chapter_members_chapter on public.chapter_members(chapter_id)","create index if not exists idx_chapter_members_forum on public.chapter_members(forum)","-- ── 3. role_assignments ───────────────────────────────────────
create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  chapter_role_id uuid not null references public.chapter_roles(id) on delete cascade,
  member_id uuid references public.chapter_members(id) on delete set null,
  member_name text not null default '''',
  member_email text not null default '''',
  fiscal_year text not null default '''',
  status text not null default ''active'' check (status in (''active'', ''elect'', ''past'')),
  budget integer not null default 0,
  theme text not null default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_role_assignments_chapter on public.role_assignments(chapter_id)","create index if not exists idx_role_assignments_role on public.role_assignments(chapter_role_id)","-- ── 4. Fix existing status constraint if tables already exist ──
-- If role_assignments was created manually with the old status values
-- (active/incoming/outgoing/past), drop and recreate the constraint
-- to use the current EO terminology (active/elect/past).
do $$
declare
  v_constraint text;
begin
  -- Migrate old status values before updating the constraint
  update public.role_assignments set status = ''elect'' where status = ''incoming'';
  update public.role_assignments set status = ''past''  where status = ''outgoing'';

  -- Drop old CHECK constraint on status if it exists (may have any name)
  select tc.constraint_name into v_constraint
  from information_schema.table_constraints tc
  where tc.table_schema = ''public''
    and tc.table_name = ''role_assignments''
    and tc.constraint_type = ''CHECK''
    and tc.constraint_name ilike ''%status%'';

  if v_constraint is not null then
    execute format(''alter table public.role_assignments drop constraint %I'', v_constraint);
  end if;

  -- Add the correct constraint
  begin
    alter table public.role_assignments
      add constraint role_assignments_status_check
        check (status in (''active'', ''elect'', ''past''));
  exception when duplicate_object then
    null; -- already exists with correct name
  end;
exception when others then
  null; -- table may not exist yet (CREATE above handles that)
end;
$$","-- ── 5. RLS ────────────────────────────────────────────────────

alter table public.chapter_roles enable row level security","alter table public.chapter_members enable row level security","alter table public.role_assignments enable row level security","-- chapter_roles
create policy \"Anon can view chapter_roles\" on public.chapter_roles
  for select using (true)","create policy \"Admins can insert chapter_roles\" on public.chapter_roles
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update chapter_roles\" on public.chapter_roles
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete chapter_roles\" on public.chapter_roles
  for delete using (public.is_super_admin() or public.is_admin())","-- chapter_members
create policy \"Anon can view chapter_members\" on public.chapter_members
  for select using (true)","create policy \"Admins can insert chapter_members\" on public.chapter_members
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update chapter_members\" on public.chapter_members
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete chapter_members\" on public.chapter_members
  for delete using (public.is_super_admin() or public.is_admin())","-- role_assignments
create policy \"Anon can view role_assignments\" on public.role_assignments
  for select using (true)","create policy \"Admins can insert role_assignments\" on public.role_assignments
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update role_assignments\" on public.role_assignments
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete role_assignments\" on public.role_assignments
  for delete using (public.is_super_admin() or public.is_admin())","-- ── 6. Reload PostgREST schema cache ─────────────────────────

notify pgrst, ''reload schema''"}', 'board_positions');
INSERT INTO supabase_migrations.schema_migrations VALUES ('008', '{"-- ============================================================
-- EO Learning Chair -- AI Contract Action Items
-- Run AFTER 007_board_positions.sql
-- Adds JSONB column for AI-extracted coordinator requirements
-- ============================================================

-- Add ai_action_items column to event_documents
-- Format: [{\"text\": \"Provide electricity at lectern\", \"category\": \"Setup\", \"done\": false}, ...]
alter table public.event_documents
  add column if not exists ai_action_items jsonb default null","-- Add ai_parsed_at timestamp to track when parsing was last run
alter table public.event_documents
  add column if not exists ai_parsed_at timestamptz default null","-- Reload schema cache
notify pgrst, ''reload schema''"}', 'contract_ai_items');
INSERT INTO supabase_migrations.schema_migrations VALUES ('009', '{"-- ============================================================
-- EO Learning Chair -- Speaker Document Uploads (Contract + W-9)
-- Run AFTER 008_contract_ai_items.sql
-- Adds storage path columns for speaker-level documents
-- ============================================================

-- Speaker contract document
alter table public.speakers
  add column if not exists contract_storage_path text default null,
  add column if not exists contract_file_name text default null","-- Speaker W-9 document
alter table public.speakers
  add column if not exists w9_storage_path text default null,
  add column if not exists w9_file_name text default null","-- Reload schema cache
notify pgrst, ''reload schema''"}', 'speaker_documents');
INSERT INTO supabase_migrations.schema_migrations VALUES ('010', '{"-- ============================================================
-- EO Learning Chair -- Budget Three-Value Model
-- Run AFTER 009_speaker_documents.sql
-- Renames estimated_amount → budget_amount, adds contracted_amount,
-- updates category enum (drop marketing, add dinner)
-- ============================================================

-- Migrate any existing ''marketing'' items to ''other'' BEFORE updating constraint
UPDATE public.budget_items SET category = ''other'' WHERE category = ''marketing''","-- Rename estimated_amount → budget_amount
ALTER TABLE public.budget_items RENAME COLUMN estimated_amount TO budget_amount","-- Add contracted_amount
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS contracted_amount integer DEFAULT 0","-- Update category check constraint: drop marketing, add dinner
ALTER TABLE public.budget_items DROP CONSTRAINT IF EXISTS budget_items_category_check","ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_category_check
  CHECK (category IN (''speaker_fee'', ''food_beverage'', ''venue_rental'', ''av_production'', ''travel'', ''dinner'', ''other''))","-- Reload schema cache
NOTIFY pgrst, ''reload schema''"}', 'budget_three_values');
INSERT INTO supabase_migrations.schema_migrations VALUES ('011', '{"-- 011_venue_archive.sql
-- Add archive tracking fields and update pipeline_stage constraint

-- Add new columns
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text DEFAULT '''',
  ADD COLUMN IF NOT EXISTS program_year text DEFAULT ''''","-- Drop old constraint and add new one that includes ''archived''
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_pipeline_stage_check","ALTER TABLE public.venues ADD CONSTRAINT venues_pipeline_stage_check
  CHECK (pipeline_stage IN (''researching'', ''quote_requested'', ''site_visit'', ''negotiating'', ''contract'', ''confirmed'', ''archived''))","-- Migrate any existing ''passed'' venues to ''archived''
UPDATE public.venues SET pipeline_stage = ''archived'' WHERE pipeline_stage = ''passed''"}', 'venue_archive');
INSERT INTO supabase_migrations.schema_migrations VALUES ('012', '{"-- 012_member_engagement.sql
-- Member Engagement Chair: Navigators, Pairings, Conversation Library, Sessions
-- Plus the Compass spine: a single per-member personalized signal table.

-- ── 1. navigators ─────────────────────────────────────────────
-- Members designated as navigators by the Engagement Chair.
-- Separate from chapter_members so we keep history (who appointed,
-- when, why retired) and navigator-specific fields (bio, capacity).
create table if not exists public.navigators (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  appointed_by uuid references public.chapter_members(id) on delete set null,
  appointed_at timestamptz not null default now(),
  status text not null default ''active'' check (status in (''active'', ''paused'', ''retired'')),
  retired_at timestamptz,
  bio text default '''',
  max_concurrent_pairings int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, chapter_member_id)
)","create index if not exists idx_navigators_chapter on public.navigators(chapter_id)","create index if not exists idx_navigators_status on public.navigators(status)","-- ── 2. navigator_pairings ─────────────────────────────────────
-- A navigator-to-new-member relationship.
create table if not exists public.navigator_pairings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  navigator_id uuid not null references public.navigators(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cadence text not null default ''biweekly'' check (cadence in (''weekly'', ''biweekly'', ''monthly'', ''custom'')),
  status text not null default ''active'' check (status in (''active'', ''paused'', ''completed'', ''reassigned'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_navigator_pairings_chapter on public.navigator_pairings(chapter_id)","create index if not exists idx_navigator_pairings_navigator on public.navigator_pairings(navigator_id)","create index if not exists idx_navigator_pairings_member on public.navigator_pairings(member_id)","create index if not exists idx_navigator_pairings_status on public.navigator_pairings(status)","-- ── 3. navigator_resources ────────────────────────────────────
-- The Conversation Library: FAQs, \"Ways to Get Value from EO\" items,
-- talking points, etc. Curated by the Engagement Chair, contributed
-- to by tenured members and external coaches with attribution.
create table if not exists public.navigator_resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  summary text default '''',
  body text default '''',
  link_url text default '''',
  category text not null default ''faq'' check (category in (
    ''faq'',
    ''university'',
    ''leadership_path'',
    ''seed_moderator_training'',
    ''moderator_training'',
    ''coaching'',
    ''next_level'',
    ''myeo_events'',
    ''international'',
    ''learning_calendar'',
    ''forum_journey'',
    ''other''
  )),
  contributor_name text default '''',
  contributor_role text default '''' check (contributor_role in ('''', ''chair'', ''tenured_member'', ''external_coach'')),
  status text not null default ''published'' check (status in (''draft'', ''published'', ''archived'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_navigator_resources_chapter on public.navigator_resources(chapter_id)","create index if not exists idx_navigator_resources_category on public.navigator_resources(category)","create index if not exists idx_navigator_resources_status on public.navigator_resources(status)","-- ── 4. navigator_sessions ─────────────────────────────────────
-- A logged touchpoint between navigator and new member.
-- Notes are private (navigator + chair only — enforced client-side for now).
create table if not exists public.navigator_sessions (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid not null references public.navigator_pairings(id) on delete cascade,
  session_date date not null default current_date,
  notes text default '''',
  created_at timestamptz not null default now()
)","create index if not exists idx_navigator_sessions_pairing on public.navigator_sessions(pairing_id)","-- ── 5. compass_items ──────────────────────────────────────────
-- THE SPINE. A single table that any chair module can write into.
-- Each row is one \"thing\" surfaced on a specific member''s Compass.
-- source_type identifies which chair module produced it; source_ref
-- points back to the originating record (resource_id, event_id, etc).
-- Title/summary/link are denormalized so Compass keeps rendering even
-- if the source record is later edited — preserving the assigner''s
-- intent at the moment of tagging.
create table if not exists public.compass_items (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  source_type text not null,
  source_ref uuid,
  title text not null,
  summary text default '''',
  link_url text default '''',
  assigned_by uuid references public.chapter_members(id) on delete set null,
  assigned_at timestamptz not null default now(),
  personal_note text default '''',
  member_status text not null default ''new'' check (member_status in (''new'', ''interested'', ''done'', ''not_for_me'')),
  member_status_at timestamptz,
  created_at timestamptz not null default now()
)","create index if not exists idx_compass_items_member on public.compass_items(member_id)","create index if not exists idx_compass_items_chapter on public.compass_items(chapter_id)","create index if not exists idx_compass_items_source on public.compass_items(source_type, source_ref)","create index if not exists idx_compass_items_status on public.compass_items(member_status)","-- ── 6. RLS ────────────────────────────────────────────────────
-- Match the existing permissive pattern in this codebase: anon can view,
-- admins can write. Tighten later (compass_items in particular has stronger
-- per-member privacy needs we should revisit before this is in real use).
alter table public.navigators enable row level security","alter table public.navigator_pairings enable row level security","alter table public.navigator_resources enable row level security","alter table public.navigator_sessions enable row level security","alter table public.compass_items enable row level security","-- navigators
create policy \"Anon can view navigators\" on public.navigators
  for select using (true)","create policy \"Admins can insert navigators\" on public.navigators
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update navigators\" on public.navigators
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete navigators\" on public.navigators
  for delete using (public.is_super_admin() or public.is_admin())","-- navigator_pairings
create policy \"Anon can view navigator_pairings\" on public.navigator_pairings
  for select using (true)","create policy \"Admins can insert navigator_pairings\" on public.navigator_pairings
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update navigator_pairings\" on public.navigator_pairings
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete navigator_pairings\" on public.navigator_pairings
  for delete using (public.is_super_admin() or public.is_admin())","-- navigator_resources
create policy \"Anon can view navigator_resources\" on public.navigator_resources
  for select using (true)","create policy \"Admins can insert navigator_resources\" on public.navigator_resources
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update navigator_resources\" on public.navigator_resources
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete navigator_resources\" on public.navigator_resources
  for delete using (public.is_super_admin() or public.is_admin())","-- navigator_sessions
create policy \"Anon can view navigator_sessions\" on public.navigator_sessions
  for select using (true)","create policy \"Admins can insert navigator_sessions\" on public.navigator_sessions
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update navigator_sessions\" on public.navigator_sessions
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete navigator_sessions\" on public.navigator_sessions
  for delete using (public.is_super_admin() or public.is_admin())","-- compass_items
create policy \"Anon can view compass_items\" on public.compass_items
  for select using (true)","create policy \"Admins can insert compass_items\" on public.compass_items
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update compass_items\" on public.compass_items
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete compass_items\" on public.compass_items
  for delete using (public.is_super_admin() or public.is_admin())","-- ── 7. Reload PostgREST schema cache ──────────────────────────
notify pgrst, ''reload schema''"}', 'member_engagement');
INSERT INTO supabase_migrations.schema_migrations VALUES ('013', '{"-- 013_engagement_chair_role.sql
-- Adds the ''engagement_chair'' role and grants it admin privileges
-- so it can manage navigators, pairings, resources, sessions, and compass_items.

-- ── 1. Add ''engagement_chair'' to profiles role check ──────────
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- ── 2. Add ''engagement_chair'' to member_invites role check ────
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- ── 3. Update is_admin() to include engagement_chair ──────────
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","-- ── 4. Update is_chapter_admin() to include engagement_chair ──
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","notify pgrst, ''reload schema''"}', 'engagement_chair_role');
INSERT INTO supabase_migrations.schema_migrations VALUES ('014', '{"-- 013_reflections.sql
-- Reflections module: per-forum journaling + parking lot.
-- Three templates (Modern, Hesse Classic, EO Standard) driven by JSONB schemas.
-- Feelings library seeded from NVC + Hesse 5 Core Emotions; grows globally.
-- Reflections are strictly private to the author until declared to the parking lot.
-- Parking lot entries are visible to members of the same forum, author-only edit.

-- ── 0. Helper: resolve current auth user → chapter_members row ───
-- Links Supabase auth user to their chapter_members record via email match.
create or replace function public.current_chapter_member_id()
returns uuid as $$
  select cm.id
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$ language sql security definer stable","-- Helper: current user''s forum (text label from chapter_members.forum)
create or replace function public.current_member_forum()
returns text as $$
  select cm.forum
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$ language sql security definer stable","-- ── 1. reflection_feelings (global library) ──────────────────
create table if not exists public.reflection_feelings (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  source text not null default ''user'' check (source in (''nvc'', ''hesse'', ''user'')),
  polarity text check (polarity in (''satisfied'', ''unsatisfied'')),
  parent_group text,
  intensity text check (intensity in (''strong'', ''moderate'', ''low'')),
  created_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now()
)","create index if not exists idx_reflection_feelings_word on public.reflection_feelings(lower(word))","create index if not exists idx_reflection_feelings_source on public.reflection_feelings(source)","-- ── 2. reflection_templates ──────────────────────────────────
-- Seeded, read-only from app. The schema JSONB drives the editor UI.
create table if not exists public.reflection_templates (
  slug text primary key,
  name text not null,
  description text not null default '''',
  sort_order int not null default 0,
  schema jsonb not null,
  created_at timestamptz not null default now()
)","-- ── 3. reflections ───────────────────────────────────────────
-- Per-member, per-forum journal entries. Strictly private to author.
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum text not null,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  template_slug text not null references public.reflection_templates(slug),
  category text check (category in (''business'', ''personal'', ''community'')),
  content jsonb not null default ''{}''::jsonb,
  feelings text[] not null default ''{}'',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_reflections_member on public.reflections(member_id)","create index if not exists idx_reflections_forum on public.reflections(chapter_id, forum)","-- ── 4. parking_lot_entries ───────────────────────────────────
-- Per-forum shared parking lot. Author-authored name + scores.
-- Standalone: no link back to reflection. Survives clearing.
create table if not exists public.parking_lot_entries (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum text not null,
  author_member_id uuid not null references public.chapter_members(id) on delete cascade,
  name text not null,
  importance int not null check (importance between 1 and 10),
  urgency int not null check (urgency between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_parking_lot_forum on public.parking_lot_entries(chapter_id, forum)","create index if not exists idx_parking_lot_author on public.parking_lot_entries(author_member_id)","-- ── 5. RLS ────────────────────────────────────────────────────
alter table public.reflection_feelings enable row level security","alter table public.reflection_templates enable row level security","alter table public.reflections enable row level security","alter table public.parking_lot_entries enable row level security","-- reflection_feelings: anyone auth can read + insert (grows globally, no moderation v1)
create policy \"Anyone can view feelings\" on public.reflection_feelings
  for select using (true)","create policy \"Authenticated can add feelings\" on public.reflection_feelings
  for insert with check (auth.uid() is not null)","-- reflection_templates: read-only to everyone
create policy \"Anyone can view templates\" on public.reflection_templates
  for select using (true)","-- reflections: strictly author-only (select/insert/update/delete)
create policy \"Author can view own reflections\" on public.reflections
  for select using (member_id = public.current_chapter_member_id())","create policy \"Author can insert own reflections\" on public.reflections
  for insert with check (member_id = public.current_chapter_member_id())","create policy \"Author can update own reflections\" on public.reflections
  for update using (member_id = public.current_chapter_member_id())","create policy \"Author can delete own reflections\" on public.reflections
  for delete using (member_id = public.current_chapter_member_id())","-- parking_lot_entries: forum-mates can read; author-only write
create policy \"Forum members can view parking lot\" on public.parking_lot_entries
  for select using (
    chapter_id = public.user_chapter_id()
    and forum = public.current_member_forum()
  )","create policy \"Author can insert parking lot entry\" on public.parking_lot_entries
  for insert with check (
    author_member_id = public.current_chapter_member_id()
    and forum = public.current_member_forum()
  )","create policy \"Author can update own parking lot entry\" on public.parking_lot_entries
  for update using (author_member_id = public.current_chapter_member_id())","create policy \"Author can delete own parking lot entry\" on public.parking_lot_entries
  for delete using (author_member_id = public.current_chapter_member_id())","-- ── 6. Seed templates ────────────────────────────────────────
insert into public.reflection_templates (slug, name, description, sort_order, schema) values
(
  ''modern'',
  ''Modern'',
  ''A single deep dive. Pick a topic, name your feelings, then ladder through three \"why is that important?\" prompts to uncover what it really says about you.'',
  1,
  ''{
    \"kind\": \"single\",
    \"fields\": [
      { \"key\": \"feelings\",     \"type\": \"feelings_pills\", \"label\": \"Feelings\",                                  \"help\": \"What feelings come up around this topic?\" },
      { \"key\": \"headline\",     \"type\": \"short_text\",     \"label\": \"Headline\",                                  \"help\": \"In your own words — what are you trying to say?\" },
      { \"key\": \"context\",      \"type\": \"long_text\",      \"label\": \"Context\",                                    \"help\": \"A paragraph around the headline so others could understand it.\" },
      { \"key\": \"significance\", \"type\": \"long_text\",      \"label\": \"Significance\",                              \"help\": \"Why is this significant to you?\" },
      { \"key\": \"why_1\",        \"type\": \"long_text\",      \"label\": \"Why is that important?\",                     \"help\": \"\" },
      { \"key\": \"why_2\",        \"type\": \"long_text\",      \"label\": \"Why is that important? (again)\",             \"help\": \"\" },
      { \"key\": \"why_3\",        \"type\": \"long_text\",      \"label\": \"Why is that important? (one more time)\",     \"help\": \"\" },
      { \"key\": \"self_insight\", \"type\": \"long_text\",      \"label\": \"What does this say about me?\",               \"help\": \"Closing paragraph.\" }
    ]
  }''::jsonb
),
(
  ''hesse_classic'',
  ''Hesse Classic'',
  ''The traditional full-surface check-in. MEPS one-word read, life-area grid, a challenge to explore, topics to bring, and an update on where you left things last time.'',
  2,
  ''{
    \"kind\": \"grid\",
    \"meps\": [
      { \"key\": \"mental\",    \"label\": \"Mental\"    },
      { \"key\": \"emotional\", \"label\": \"Emotional\" },
      { \"key\": \"physical\",  \"label\": \"Physical\"  },
      { \"key\": \"spiritual\", \"label\": \"Spiritual\" }
    ],
    \"rows\": [
      { \"key\": \"professional\",  \"label\": \"Professional\"           },
      { \"key\": \"personal\",      \"label\": \"Personal / Family\"      }
    ],
    \"columns\": [
      { \"key\": \"headline\",     \"label\": \"Headline\",     \"type\": \"short_text\" },
      { \"key\": \"emotions\",     \"label\": \"Emotions\",     \"type\": \"feelings_pills\" },
      { \"key\": \"significance\", \"label\": \"Significance and impact for me\", \"type\": \"long_text\" }
    ],
    \"footers\": [
      { \"key\": \"eq_challenge\", \"type\": \"long_text\", \"label\": \"EQ — Challenge / Opportunity to explore\" },
      { \"key\": \"iq_topics\",    \"type\": \"long_text\", \"label\": \"IQ — Topics\" },
      { \"key\": \"update\",       \"type\": \"long_text\", \"label\": \"Update\" }
    ]
  }''::jsonb
),
(
  ''eo_standard'',
  ''EO Standard'',
  ''The classic 5% worksheet. Strongest feelings of the past month across Work, Family, Personal, and the 30–60 days ahead.'',
  3,
  ''{
    \"kind\": \"grid\",
    \"rows\": [
      { \"key\": \"work\",     \"label\": \"Work\"                },
      { \"key\": \"family\",   \"label\": \"Family\"              },
      { \"key\": \"personal\", \"label\": \"Personal\"            },
      { \"key\": \"next\",     \"label\": \"Next 30–60 days\"     }
    ],
    \"columns\": [
      { \"key\": \"feelings\",     \"label\": \"Feelings\",                            \"type\": \"feelings_pills\", \"help\": \"Strongest feelings this past month. Single words. 3–5 per row.\" },
      { \"key\": \"headline\",     \"label\": \"Headline\",                            \"type\": \"short_text\",     \"help\": \"What caused these feelings? Only one sentence.\" },
      { \"key\": \"significance\", \"label\": \"Significance (5%)\",                   \"type\": \"long_text\",      \"help\": \"How was this personally significant to me? Dig deep.\" }
    ],
    \"footers\": [
      { \"key\": \"explore\", \"type\": \"long_text\", \"label\": \"A challenge or opportunity I would like to explore further with the group is…\" }
    ]
  }''::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  schema = excluded.schema","-- ── 7. Seed feelings library ─────────────────────────────────
-- Hesse 5 Core Emotions (with intensity metadata)
insert into public.reflection_feelings (word, source, parent_group, intensity) values
-- MAD
(''Furious'',''hesse'',''mad'',''strong''),(''Betrayed'',''hesse'',''mad'',''strong''),(''Outraged'',''hesse'',''mad'',''strong''),(''Angry'',''hesse'',''mad'',''strong''),(''Irate'',''hesse'',''mad'',''strong''),(''Irritated'',''hesse'',''mad'',''strong''),
(''Frustrated'',''hesse'',''mad'',''moderate''),(''Agitated'',''hesse'',''mad'',''moderate''),(''Disgusted'',''hesse'',''mad'',''moderate''),(''Annoyed'',''hesse'',''mad'',''moderate''),
(''Upset'',''hesse'',''mad'',''low''),(''Resistant'',''hesse'',''mad'',''low''),
-- GLAD
(''Elated'',''hesse'',''glad'',''strong''),(''Passionate'',''hesse'',''glad'',''strong''),(''Overjoyed'',''hesse'',''glad'',''strong''),(''Thrilled'',''hesse'',''glad'',''strong''),(''Ecstatic'',''hesse'',''glad'',''strong''),(''Enthusiastic'',''hesse'',''glad'',''strong''),
(''Relieved'',''hesse'',''glad'',''moderate''),(''Satisfied'',''hesse'',''glad'',''moderate''),(''Happy'',''hesse'',''glad'',''moderate''),(''Pleased'',''hesse'',''glad'',''moderate''),
(''Content'',''hesse'',''glad'',''low''),(''Delighted'',''hesse'',''glad'',''low''),
-- SAD
(''Depressed'',''hesse'',''sad'',''strong''),(''Miserable'',''hesse'',''sad'',''strong''),(''Alone'',''hesse'',''sad'',''strong''),(''Hurt'',''hesse'',''sad'',''strong''),(''Hopeless'',''hesse'',''sad'',''strong''),(''Insecure'',''hesse'',''sad'',''strong''),
(''Somber'',''hesse'',''sad'',''moderate''),(''Heartbroken'',''hesse'',''sad'',''moderate''),(''Discouraged'',''hesse'',''sad'',''moderate''),(''Disappointed'',''hesse'',''sad'',''moderate''),
(''Unhappy'',''hesse'',''sad'',''low''),(''Dissatisfied'',''hesse'',''sad'',''low''),
-- SCARED
(''Terrified'',''hesse'',''scared'',''strong''),(''Horrified'',''hesse'',''scared'',''strong''),(''Frantic'',''hesse'',''scared'',''strong''),(''Petrified'',''hesse'',''scared'',''strong''),(''Frightened'',''hesse'',''scared'',''strong''),(''Distressed'',''hesse'',''scared'',''strong''),
(''Threatened'',''hesse'',''scared'',''moderate''),(''Apprehensive'',''hesse'',''scared'',''moderate''),(''Intimidated'',''hesse'',''scared'',''moderate''),(''Anxious'',''hesse'',''scared'',''moderate''),
(''Worried'',''hesse'',''scared'',''low''),(''Cautious'',''hesse'',''scared'',''low''),
-- ASHAMED
(''Mortified'',''hesse'',''ashamed'',''strong''),(''Remorseful'',''hesse'',''ashamed'',''strong''),(''Humiliated'',''hesse'',''ashamed'',''strong''),(''Worthless'',''hesse'',''ashamed'',''strong''),(''Disgraced'',''hesse'',''ashamed'',''strong''),(''Exposed'',''hesse'',''ashamed'',''strong''),
(''Unworthy'',''hesse'',''ashamed'',''moderate''),(''Apologetic'',''hesse'',''ashamed'',''moderate''),(''Guilty'',''hesse'',''ashamed'',''moderate''),(''Secretive'',''hesse'',''ashamed'',''moderate''),
(''Regretful'',''hesse'',''ashamed'',''low''),(''Embarrassed'',''hesse'',''ashamed'',''low'')
on conflict (word) do nothing","-- NVC inventory — needs satisfied
insert into public.reflection_feelings (word, source, polarity, parent_group) values
(''Compassionate'',''nvc'',''satisfied'',''affectionate''),(''Friendly'',''nvc'',''satisfied'',''affectionate''),(''Loving'',''nvc'',''satisfied'',''affectionate''),(''Open-hearted'',''nvc'',''satisfied'',''affectionate''),(''Sympathetic'',''nvc'',''satisfied'',''affectionate''),(''Tender'',''nvc'',''satisfied'',''affectionate''),(''Warm'',''nvc'',''satisfied'',''affectionate''),
(''Absorbed'',''nvc'',''satisfied'',''engaged''),(''Alert'',''nvc'',''satisfied'',''engaged''),(''Curious'',''nvc'',''satisfied'',''engaged''),(''Engrossed'',''nvc'',''satisfied'',''engaged''),(''Enchanted'',''nvc'',''satisfied'',''engaged''),(''Entranced'',''nvc'',''satisfied'',''engaged''),(''Fascinated'',''nvc'',''satisfied'',''engaged''),(''Interested'',''nvc'',''satisfied'',''engaged''),(''Intrigued'',''nvc'',''satisfied'',''engaged''),(''Involved'',''nvc'',''satisfied'',''engaged''),(''Spellbound'',''nvc'',''satisfied'',''engaged''),(''Stimulated'',''nvc'',''satisfied'',''engaged''),
(''Expectant'',''nvc'',''satisfied'',''hopeful''),(''Encouraged'',''nvc'',''satisfied'',''hopeful''),(''Optimistic'',''nvc'',''satisfied'',''hopeful''),
(''Empowered'',''nvc'',''satisfied'',''confident''),(''Open'',''nvc'',''satisfied'',''confident''),(''Proud'',''nvc'',''satisfied'',''confident''),(''Safe'',''nvc'',''satisfied'',''confident''),(''Secure'',''nvc'',''satisfied'',''confident''),
(''Amazed'',''nvc'',''satisfied'',''excited''),(''Animated'',''nvc'',''satisfied'',''excited''),(''Ardent'',''nvc'',''satisfied'',''excited''),(''Aroused'',''nvc'',''satisfied'',''excited''),(''Astonished'',''nvc'',''satisfied'',''excited''),(''Dazzled'',''nvc'',''satisfied'',''excited''),(''Eager'',''nvc'',''satisfied'',''excited''),(''Energetic'',''nvc'',''satisfied'',''excited''),(''Giddy'',''nvc'',''satisfied'',''excited''),(''Invigorated'',''nvc'',''satisfied'',''excited''),(''Lively'',''nvc'',''satisfied'',''excited''),(''Surprised'',''nvc'',''satisfied'',''excited''),(''Vibrant'',''nvc'',''satisfied'',''excited''),
(''Appreciative'',''nvc'',''satisfied'',''grateful''),(''Moved'',''nvc'',''satisfied'',''grateful''),(''Thankful'',''nvc'',''satisfied'',''grateful''),(''Touched'',''nvc'',''satisfied'',''grateful''),
(''Awed'',''nvc'',''satisfied'',''inspired''),(''Wonder'',''nvc'',''satisfied'',''inspired''),
(''Amused'',''nvc'',''satisfied'',''joyful''),(''Glad'',''nvc'',''satisfied'',''joyful''),(''Jubilant'',''nvc'',''satisfied'',''joyful''),(''Tickled'',''nvc'',''satisfied'',''joyful''),
(''Blissful'',''nvc'',''satisfied'',''exhilarated''),(''Enthralled'',''nvc'',''satisfied'',''exhilarated''),(''Exuberant'',''nvc'',''satisfied'',''exhilarated''),(''Radiant'',''nvc'',''satisfied'',''exhilarated''),(''Rapturous'',''nvc'',''satisfied'',''exhilarated''),
(''Calm'',''nvc'',''satisfied'',''peaceful''),(''Clear-headed'',''nvc'',''satisfied'',''peaceful''),(''Comfortable'',''nvc'',''satisfied'',''peaceful''),(''Centered'',''nvc'',''satisfied'',''peaceful''),(''Equanimous'',''nvc'',''satisfied'',''peaceful''),(''Fulfilled'',''nvc'',''satisfied'',''peaceful''),(''Mellow'',''nvc'',''satisfied'',''peaceful''),(''Quiet'',''nvc'',''satisfied'',''peaceful''),(''Relaxed'',''nvc'',''satisfied'',''peaceful''),(''Serene'',''nvc'',''satisfied'',''peaceful''),(''Still'',''nvc'',''satisfied'',''peaceful''),(''Tranquil'',''nvc'',''satisfied'',''peaceful''),(''Trusting'',''nvc'',''satisfied'',''peaceful''),
(''Enlivened'',''nvc'',''satisfied'',''refreshed''),(''Rejuvenated'',''nvc'',''satisfied'',''refreshed''),(''Renewed'',''nvc'',''satisfied'',''refreshed''),(''Rested'',''nvc'',''satisfied'',''refreshed''),(''Restored'',''nvc'',''satisfied'',''refreshed''),(''Revived'',''nvc'',''satisfied'',''refreshed'')
on conflict (word) do nothing","-- NVC inventory — needs not satisfied
insert into public.reflection_feelings (word, source, polarity, parent_group) values
(''Apprehensive'',''nvc'',''unsatisfied'',''afraid''),(''Dread'',''nvc'',''unsatisfied'',''afraid''),(''Foreboding'',''nvc'',''unsatisfied'',''afraid''),(''Mistrustful'',''nvc'',''unsatisfied'',''afraid''),(''Panicked'',''nvc'',''unsatisfied'',''afraid''),(''Scared'',''nvc'',''unsatisfied'',''afraid''),(''Suspicious'',''nvc'',''unsatisfied'',''afraid''),(''Wary'',''nvc'',''unsatisfied'',''afraid''),
(''Aggravated'',''nvc'',''unsatisfied'',''annoyed''),(''Dismayed'',''nvc'',''unsatisfied'',''annoyed''),(''Disgruntled'',''nvc'',''unsatisfied'',''annoyed''),(''Displeased'',''nvc'',''unsatisfied'',''annoyed''),(''Exasperated'',''nvc'',''unsatisfied'',''annoyed''),(''Impatient'',''nvc'',''unsatisfied'',''annoyed''),(''Irked'',''nvc'',''unsatisfied'',''annoyed''),
(''Enraged'',''nvc'',''unsatisfied'',''angry''),(''Incensed'',''nvc'',''unsatisfied'',''angry''),(''Indignant'',''nvc'',''unsatisfied'',''angry''),(''Livid'',''nvc'',''unsatisfied'',''angry''),(''Resentful'',''nvc'',''unsatisfied'',''angry''),
(''Animosity'',''nvc'',''unsatisfied'',''aversion''),(''Appalled'',''nvc'',''unsatisfied'',''aversion''),(''Contempt'',''nvc'',''unsatisfied'',''aversion''),(''Dislike'',''nvc'',''unsatisfied'',''aversion''),(''Hate'',''nvc'',''unsatisfied'',''aversion''),(''Hostile'',''nvc'',''unsatisfied'',''aversion''),(''Repulsed'',''nvc'',''unsatisfied'',''aversion''),
(''Ambivalent'',''nvc'',''unsatisfied'',''confused''),(''Baffled'',''nvc'',''unsatisfied'',''confused''),(''Bewildered'',''nvc'',''unsatisfied'',''confused''),(''Dazed'',''nvc'',''unsatisfied'',''confused''),(''Hesitant'',''nvc'',''unsatisfied'',''confused''),(''Lost'',''nvc'',''unsatisfied'',''confused''),(''Mystified'',''nvc'',''unsatisfied'',''confused''),(''Perplexed'',''nvc'',''unsatisfied'',''confused''),(''Puzzled'',''nvc'',''unsatisfied'',''confused''),(''Torn'',''nvc'',''unsatisfied'',''confused''),
(''Alienated'',''nvc'',''unsatisfied'',''disconnected''),(''Aloof'',''nvc'',''unsatisfied'',''disconnected''),(''Apathetic'',''nvc'',''unsatisfied'',''disconnected''),(''Bored'',''nvc'',''unsatisfied'',''disconnected''),(''Cold'',''nvc'',''unsatisfied'',''disconnected''),(''Detached'',''nvc'',''unsatisfied'',''disconnected''),(''Distant'',''nvc'',''unsatisfied'',''disconnected''),(''Distracted'',''nvc'',''unsatisfied'',''disconnected''),(''Indifferent'',''nvc'',''unsatisfied'',''disconnected''),(''Numb'',''nvc'',''unsatisfied'',''disconnected''),(''Removed'',''nvc'',''unsatisfied'',''disconnected''),(''Uninterested'',''nvc'',''unsatisfied'',''disconnected''),(''Withdrawn'',''nvc'',''unsatisfied'',''disconnected''),
(''Alarmed'',''nvc'',''unsatisfied'',''disquiet''),(''Discombobulated'',''nvc'',''unsatisfied'',''disquiet''),(''Disconcerted'',''nvc'',''unsatisfied'',''disquiet''),(''Disturbed'',''nvc'',''unsatisfied'',''disquiet''),(''Perturbed'',''nvc'',''unsatisfied'',''disquiet''),(''Rattled'',''nvc'',''unsatisfied'',''disquiet''),(''Restless'',''nvc'',''unsatisfied'',''disquiet''),(''Shocked'',''nvc'',''unsatisfied'',''disquiet''),(''Startled'',''nvc'',''unsatisfied'',''disquiet''),(''Troubled'',''nvc'',''unsatisfied'',''disquiet''),(''Turbulent'',''nvc'',''unsatisfied'',''disquiet''),(''Turmoil'',''nvc'',''unsatisfied'',''disquiet''),(''Uncomfortable'',''nvc'',''unsatisfied'',''disquiet''),(''Uneasy'',''nvc'',''unsatisfied'',''disquiet''),(''Unnerved'',''nvc'',''unsatisfied'',''disquiet''),(''Unsettled'',''nvc'',''unsatisfied'',''disquiet''),
(''Ashamed'',''nvc'',''unsatisfied'',''embarrassed''),(''Chagrined'',''nvc'',''unsatisfied'',''embarrassed''),(''Flustered'',''nvc'',''unsatisfied'',''embarrassed''),(''Self-conscious'',''nvc'',''unsatisfied'',''embarrassed''),
(''Beat'',''nvc'',''unsatisfied'',''fatigue''),(''Burnt out'',''nvc'',''unsatisfied'',''fatigue''),(''Depleted'',''nvc'',''unsatisfied'',''fatigue''),(''Exhausted'',''nvc'',''unsatisfied'',''fatigue''),(''Lethargic'',''nvc'',''unsatisfied'',''fatigue''),(''Listless'',''nvc'',''unsatisfied'',''fatigue''),(''Sleepy'',''nvc'',''unsatisfied'',''fatigue''),(''Tired'',''nvc'',''unsatisfied'',''fatigue''),(''Weary'',''nvc'',''unsatisfied'',''fatigue''),(''Worn out'',''nvc'',''unsatisfied'',''fatigue''),
(''Agony'',''nvc'',''unsatisfied'',''pain''),(''Anguished'',''nvc'',''unsatisfied'',''pain''),(''Bereaved'',''nvc'',''unsatisfied'',''pain''),(''Devastated'',''nvc'',''unsatisfied'',''pain''),(''Grief'',''nvc'',''unsatisfied'',''pain''),(''Lonely'',''nvc'',''unsatisfied'',''pain''),(''Regretful'',''nvc'',''unsatisfied'',''pain''),
(''Dejected'',''nvc'',''unsatisfied'',''sad''),(''Despair'',''nvc'',''unsatisfied'',''sad''),(''Despondent'',''nvc'',''unsatisfied'',''sad''),(''Disheartened'',''nvc'',''unsatisfied'',''sad''),(''Forlorn'',''nvc'',''unsatisfied'',''sad''),(''Gloomy'',''nvc'',''unsatisfied'',''sad''),(''Heavy-hearted'',''nvc'',''unsatisfied'',''sad''),(''Melancholy'',''nvc'',''unsatisfied'',''sad''),(''Wretched'',''nvc'',''unsatisfied'',''sad''),
(''Cranky'',''nvc'',''unsatisfied'',''tense''),(''Distraught'',''nvc'',''unsatisfied'',''tense''),(''Edgy'',''nvc'',''unsatisfied'',''tense''),(''Fidgety'',''nvc'',''unsatisfied'',''tense''),(''Frazzled'',''nvc'',''unsatisfied'',''tense''),(''Irritable'',''nvc'',''unsatisfied'',''tense''),(''Jittery'',''nvc'',''unsatisfied'',''tense''),(''Nervous'',''nvc'',''unsatisfied'',''tense''),(''Overwhelmed'',''nvc'',''unsatisfied'',''tense''),(''Stressed-out'',''nvc'',''unsatisfied'',''tense''),
(''Fragile'',''nvc'',''unsatisfied'',''vulnerable''),(''Guarded'',''nvc'',''unsatisfied'',''vulnerable''),(''Helpless'',''nvc'',''unsatisfied'',''vulnerable''),(''Leery'',''nvc'',''unsatisfied'',''vulnerable''),(''Reserved'',''nvc'',''unsatisfied'',''vulnerable''),(''Sensitive'',''nvc'',''unsatisfied'',''vulnerable''),(''Shaky'',''nvc'',''unsatisfied'',''vulnerable''),
(''Envious'',''nvc'',''unsatisfied'',''yearning''),(''Jealous'',''nvc'',''unsatisfied'',''yearning''),(''Longing'',''nvc'',''unsatisfied'',''yearning''),(''Nostalgic'',''nvc'',''unsatisfied'',''yearning''),(''Pining'',''nvc'',''unsatisfied'',''yearning''),(''Wistful'',''nvc'',''unsatisfied'',''yearning'')
on conflict (word) do nothing","-- ── 8. Reload PostgREST schema cache ──────────────────────────
notify pgrst, ''reload schema''"}', 'reflections');
INSERT INTO supabase_migrations.schema_migrations VALUES ('015', '{"-- 015_sap_partners.sql
-- Evolve SAPs from person-level to company-level records with tiered
-- partnership levels and a dedicated contacts table.
-- Adds forum-trained tracking per contact (affects what meetings they can attend).

-- ── 1. Evolve saps table → partner (company-level) record ──────

-- Add tier and industry columns
alter table public.saps
  add column if not exists tier text not null default ''gold''
    check (tier in (''platinum'', ''gold'', ''silver'', ''in_kind'')),
  add column if not exists industry text default '''',
  add column if not exists website text default '''',
  add column if not exists status text not null default ''active''
    check (status in (''active'', ''inactive''))","-- Migrate existing data: move \"name\" → primary contact (done in seed),
-- \"company\" → name. For any rows where company is populated, use it.
-- (Safe: only one mock SAP row exists in production data.)
update public.saps
  set name = company
  where company is not null and company != '''' and company != name","-- Drop person-level columns from the company record
-- (keep contact_email/phone temporarily for back-compat until contacts table is populated)
alter table public.saps
  drop column if exists role","-- ── 2. sap_contacts ─────────────────────────────────────────────
-- Per-person contacts at each SAP partner company.
-- One partner has 1–N contacts; exactly one is primary.

create table if not exists public.sap_contacts (
  id uuid primary key default gen_random_uuid(),
  sap_id uuid not null references public.saps(id) on delete cascade,
  name text not null,
  role text default '''',
  email text default '''',
  phone text default '''',
  is_primary boolean not null default false,
  forum_trained boolean not null default false,
  forum_trained_date date,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_sap_contacts_sap on public.sap_contacts(sap_id)","create index if not exists idx_sap_contacts_forum_trained on public.sap_contacts(forum_trained)","-- ── 3. RLS for sap_contacts ────────────────────────────────────

alter table public.sap_contacts enable row level security","create policy \"Anon can view sap_contacts\" on public.sap_contacts
  for select using (true)","create policy \"Chapter scoped insert sap_contacts\" on public.sap_contacts
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and (public.is_chapter_admin(s.chapter_id) or public.user_chapter_id() = s.chapter_id)
    )
  )","create policy \"Chapter scoped update sap_contacts\" on public.sap_contacts
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and public.is_chapter_admin(s.chapter_id)
    )
  )","create policy \"Chapter scoped delete sap_contacts\" on public.sap_contacts
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and public.is_chapter_admin(s.chapter_id)
    )
  )"}', 'sap_partners');
INSERT INTO supabase_migrations.schema_migrations VALUES ('016', '{"-- 016_parking_lot_admin_bypass.sql
-- Allow admins + super admins to update/delete any parking lot entry.
-- Previously only the original author (via current_chapter_member_id()) could write.
-- This is needed for:
--   1. Author reassignment (engagement chair entering items on behalf of forum mates)
--   2. General admin housekeeping

-- Drop and recreate update policy with admin bypass
drop policy if exists \"Author can update own parking lot entry\" on public.parking_lot_entries","create policy \"Author or admin can update parking lot entry\" on public.parking_lot_entries
  for update using (
    author_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  )","-- Drop and recreate delete policy with admin bypass
drop policy if exists \"Author can delete own parking lot entry\" on public.parking_lot_entries","create policy \"Author or admin can delete parking lot entry\" on public.parking_lot_entries
  for delete using (
    author_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  )","-- Also add admin bypass to insert policy (so admin can create entries on behalf of others)
drop policy if exists \"Author can insert parking lot entry\" on public.parking_lot_entries","create policy \"Author or admin can insert parking lot entry\" on public.parking_lot_entries
  for insert with check (
    (
      author_member_id = public.current_chapter_member_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  )","notify pgrst, ''reload schema''"}', 'parking_lot_admin_bypass');
INSERT INTO supabase_migrations.schema_migrations VALUES ('017', '{"-- 017_parking_lot_forum_edit.sql
-- All forum mates can edit/delete any parking lot entry in their forum.
-- \"None of us are admins over anybody else\" — everyone is equal in forum.

-- Update: any forum mate can update
drop policy if exists \"Author or admin can update parking lot entry\" on public.parking_lot_entries","drop policy if exists \"Author can update own parking lot entry\" on public.parking_lot_entries","create policy \"Forum mates can update parking lot entries\" on public.parking_lot_entries
  for update using (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  )","-- Delete: any forum mate can delete
drop policy if exists \"Author or admin can delete parking lot entry\" on public.parking_lot_entries","drop policy if exists \"Author can delete own parking lot entry\" on public.parking_lot_entries","create policy \"Forum mates can delete parking lot entries\" on public.parking_lot_entries
  for delete using (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  )","-- Insert: any forum mate can add (not just for their own author_member_id)
drop policy if exists \"Author or admin can insert parking lot entry\" on public.parking_lot_entries","drop policy if exists \"Author can insert parking lot entry\" on public.parking_lot_entries","create policy \"Forum mates can insert parking lot entries\" on public.parking_lot_entries
  for insert with check (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  )","notify pgrst, ''reload schema''"}', 'parking_lot_forum_edit');
INSERT INTO supabase_migrations.schema_migrations VALUES ('018', '{"-- Add fiscal_year column to year-scoped tables
-- Backfill existing rows with current FY \"2025-2026\"

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT ''''","ALTER TABLE public.chair_reports
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT ''''","ALTER TABLE public.member_scorecards
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT ''''","ALTER TABLE public.navigator_pairings
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT ''''","-- Indexes for fiscal year filtering
CREATE INDEX IF NOT EXISTS idx_events_fiscal_year ON public.events(fiscal_year)","CREATE INDEX IF NOT EXISTS idx_chair_reports_fiscal_year ON public.chair_reports(fiscal_year)","CREATE INDEX IF NOT EXISTS idx_member_scorecards_fiscal_year ON public.member_scorecards(fiscal_year)","CREATE INDEX IF NOT EXISTS idx_navigator_pairings_fiscal_year ON public.navigator_pairings(fiscal_year)","-- Backfill existing data as current fiscal year
UPDATE public.events SET fiscal_year = ''2025-2026'' WHERE fiscal_year = ''''","UPDATE public.chair_reports SET fiscal_year = ''2025-2026'' WHERE fiscal_year = ''''","UPDATE public.member_scorecards SET fiscal_year = ''2025-2026'' WHERE fiscal_year = ''''","UPDATE public.navigator_pairings SET fiscal_year = ''2025-2026'' WHERE fiscal_year = ''''"}', 'fiscal_year_columns');
INSERT INTO supabase_migrations.schema_migrations VALUES ('019', '{"-- Add fiscal_year to scenarios (year-scoped like events)
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT ''''","CREATE INDEX IF NOT EXISTS idx_scenarios_fiscal_year ON public.scenarios(fiscal_year)","-- Backfill existing scenarios as 2026-2027 (current planning year)
UPDATE public.scenarios SET fiscal_year = ''2026-2027'' WHERE fiscal_year = ''''"}', 'scenarios_fiscal_year');
INSERT INTO supabase_migrations.schema_migrations VALUES ('033', '{"-- 033_saps_add_missing_columns.sql
-- The saps table was missing columns that the app code and CSV import expect:
-- tier, status, industry, website. Without these, every insert silently failed
-- because Supabase rejected the unknown columns. CSV-imported partners appeared
-- in the UI (optimistic state) but vanished on reload (never persisted).

alter table public.saps add column if not exists tier text default ''gold''","alter table public.saps add column if not exists status text default ''active''","alter table public.saps add column if not exists industry text default ''''","alter table public.saps add column if not exists website text default ''''","notify pgrst, ''reload schema''"}', 'saps_add_missing_columns');
INSERT INTO supabase_migrations.schema_migrations VALUES ('020', '{"-- Speaker Pipeline: year-scoped booking pipeline separated from the persistent speaker library.
-- The `speakers` table remains the library (who the speaker is).
-- This table tracks where they are in the booking process for a given fiscal year.

create table if not exists public.speaker_pipeline (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  fiscal_year text not null default '''',
  pipeline_stage text not null default ''researching''
    check (pipeline_stage in (''researching'', ''outreach'', ''negotiating'', ''contracted'', ''confirmed'', ''passed'')),
  fit_score integer check (fit_score is null or fit_score between 1 and 10),
  fee_estimated integer,
  fee_actual integer,
  contract_storage_path text,
  contract_file_name text,
  w9_storage_path text,
  w9_file_name text,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(speaker_id, fiscal_year, chapter_id)
)","create index if not exists idx_speaker_pipeline_chapter_fy
  on public.speaker_pipeline(chapter_id, fiscal_year)","create index if not exists idx_speaker_pipeline_speaker
  on public.speaker_pipeline(speaker_id)","-- RLS: same pattern as speakers table
alter table public.speaker_pipeline enable row level security","create policy \"Anon can read speaker_pipeline\"
  on public.speaker_pipeline for select
  to anon, authenticated
  using (true)","create policy \"Authenticated can insert speaker_pipeline\"
  on public.speaker_pipeline for insert
  to authenticated
  with check (true)","create policy \"Authenticated can update speaker_pipeline\"
  on public.speaker_pipeline for update
  to authenticated
  using (true)","create policy \"Authenticated can delete speaker_pipeline\"
  on public.speaker_pipeline for delete
  to authenticated
  using (true)","-- Backfill: create pipeline entries from existing speaker rows
-- All existing data is for FY 2026-2027
insert into public.speaker_pipeline
  (chapter_id, speaker_id, fiscal_year, pipeline_stage, fit_score,
   fee_estimated, fee_actual,
   contract_storage_path, contract_file_name,
   w9_storage_path, w9_file_name, notes)
select
  chapter_id, id, ''2026-2027'',
  coalesce(pipeline_stage, ''researching''), fit_score,
  fee_estimated, fee_actual,
  contract_storage_path, contract_file_name,
  w9_storage_path, w9_file_name, coalesce(notes, '''')
from public.speakers
on conflict (speaker_id, fiscal_year, chapter_id) do nothing"}', 'speaker_pipeline');
INSERT INTO supabase_migrations.schema_migrations VALUES ('021', '{"-- Add president and finance_chair as first-class app roles
-- Create fiscal_year_budgets table for FY-level budget with per-chair line items

-- ── 1. Add president + finance_chair to profiles role check ──
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- ── 2. Add to member_invites role check ──
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member''
  ))","-- ── 3. Update is_admin() to include president + finance_chair ──
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      ''president'',
      ''finance_chair'',
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","-- ── 4. Update is_chapter_admin() ──
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (
      ''president'',
      ''finance_chair'',
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","-- ── 5. Fiscal year budgets table ──
-- Each FY has one master budget set by the president, with per-chair line items
create table if not exists public.fiscal_year_budgets (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_year text not null,
  total_budget integer not null default 0,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chapter_id, fiscal_year)
)","create index if not exists idx_fy_budgets_chapter_fy
  on public.fiscal_year_budgets(chapter_id, fiscal_year)","-- Per-chair budget line items within a fiscal year
create table if not exists public.fiscal_year_budget_lines (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_budget_id uuid not null references public.fiscal_year_budgets(id) on delete cascade,
  role_key text not null,
  label text not null default '''',
  amount integer not null default 0,
  notes text default '''',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_fy_budget_lines_budget
  on public.fiscal_year_budget_lines(fiscal_year_budget_id)","-- RLS
alter table public.fiscal_year_budgets enable row level security","alter table public.fiscal_year_budget_lines enable row level security","create policy \"Anon can read fiscal_year_budgets\" on public.fiscal_year_budgets for select to anon, authenticated using (true)","create policy \"Authenticated can insert fiscal_year_budgets\" on public.fiscal_year_budgets for insert to authenticated with check (true)","create policy \"Authenticated can update fiscal_year_budgets\" on public.fiscal_year_budgets for update to authenticated using (true)","create policy \"Authenticated can delete fiscal_year_budgets\" on public.fiscal_year_budgets for delete to authenticated using (true)","create policy \"Anon can read fiscal_year_budget_lines\" on public.fiscal_year_budget_lines for select to anon, authenticated using (true)","create policy \"Authenticated can insert fiscal_year_budget_lines\" on public.fiscal_year_budget_lines for insert to authenticated with check (true)","create policy \"Authenticated can update fiscal_year_budget_lines\" on public.fiscal_year_budget_lines for update to authenticated using (true)","create policy \"Authenticated can delete fiscal_year_budget_lines\" on public.fiscal_year_budget_lines for delete to authenticated using (true)","notify pgrst, ''reload schema''"}', 'president_roles_and_budgets');
INSERT INTO supabase_migrations.schema_migrations VALUES ('022', '{"-- Add theme_description to role_assignments for president to explain
-- what their theme means and how chairs should bring it to life.
ALTER TABLE public.role_assignments
  ADD COLUMN IF NOT EXISTS theme_description text DEFAULT ''''"}', 'theme_description');
INSERT INTO supabase_migrations.schema_migrations VALUES ('023', '{"-- Add President Elect-Elect and Learning Chair Elect to chapter_roles
-- These roles get started earlier than other board positions

INSERT INTO public.chapter_roles (chapter_id, role_key, label, is_staff, sort_order)
SELECT c.id, ''president_elect_elect'', ''President Elect-Elect'', false, 2
FROM public.chapters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapter_roles cr
  WHERE cr.chapter_id = c.id AND cr.role_key = ''president_elect_elect''
)","INSERT INTO public.chapter_roles (chapter_id, role_key, label, is_staff, sort_order)
SELECT c.id, ''learning_chair_elect'', ''Learning Chair Elect'', false, 9
FROM public.chapters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapter_roles cr
  WHERE cr.chapter_id = c.id AND cr.role_key = ''learning_chair_elect''
)"}', 'elect_roles');
INSERT INTO supabase_migrations.schema_migrations VALUES ('024', '{"-- 024_mentors.sql
-- Mentors: like Navigators but for any member at any tenure.
-- Managed by the Engagement Chair.

-- ── 1. mentors ───────────────────────────────────────────────
create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  appointed_by uuid references public.chapter_members(id) on delete set null,
  appointed_at timestamptz not null default now(),
  status text not null default ''active'' check (status in (''active'', ''paused'', ''retired'')),
  retired_at timestamptz,
  bio text default '''',
  max_concurrent_pairings int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, chapter_member_id)
)","create index if not exists idx_mentors_chapter on public.mentors(chapter_id)","create index if not exists idx_mentors_status on public.mentors(status)","-- ── 2. mentor_pairings ───────────────────────────────────────
create table if not exists public.mentor_pairings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cadence text not null default ''biweekly'' check (cadence in (''weekly'', ''biweekly'', ''monthly'', ''custom'')),
  status text not null default ''active'' check (status in (''active'', ''paused'', ''completed'', ''reassigned'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_mentor_pairings_chapter on public.mentor_pairings(chapter_id)","create index if not exists idx_mentor_pairings_mentor on public.mentor_pairings(mentor_id)","create index if not exists idx_mentor_pairings_member on public.mentor_pairings(member_id)","create index if not exists idx_mentor_pairings_status on public.mentor_pairings(status)","-- ── 3. RLS ───────────────────────────────────────────────────
alter table public.mentors enable row level security","alter table public.mentor_pairings enable row level security","-- mentors
create policy \"Anon can view mentors\" on public.mentors
  for select using (true)","create policy \"Admins can insert mentors\" on public.mentors
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update mentors\" on public.mentors
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete mentors\" on public.mentors
  for delete using (public.is_super_admin() or public.is_admin())","-- mentor_pairings
create policy \"Anon can view mentor_pairings\" on public.mentor_pairings
  for select using (true)","create policy \"Admins can insert mentor_pairings\" on public.mentor_pairings
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update mentor_pairings\" on public.mentor_pairings
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete mentor_pairings\" on public.mentor_pairings
  for delete using (public.is_super_admin() or public.is_admin())","-- ── 4. Reload PostgREST schema cache ─────────────────────────
notify pgrst, ''reload schema''"}', 'mentors');
INSERT INTO supabase_migrations.schema_migrations VALUES ('025', '{"-- 025_event_sap_contacts.sql
-- Track which contact (person) from each linked SAP is the speaker for an event.
-- Stored as a JSON object: { \"sap_id\": \"contact_id\", ... }
-- The sap_ids uuid[] array remains the source of truth for which SAPs are linked;
-- this column adds the optional contact-level detail.

alter table public.events
  add column if not exists sap_contact_ids jsonb default ''{}''","notify pgrst, ''reload schema''"}', 'event_sap_contacts');
INSERT INTO supabase_migrations.schema_migrations VALUES ('026', '{"-- 026_venue_extra_fields.sql
-- Add missing venue columns that the UI form already sends,
-- and add ''theater'' to the venue_type constraint.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS fb_notes text DEFAULT '''',
  ADD COLUMN IF NOT EXISTS fb_estimated_cost numeric,
  ADD COLUMN IF NOT EXISTS fb_vendor text DEFAULT '''',
  ADD COLUMN IF NOT EXISTS parking_notes text DEFAULT '''',
  ADD COLUMN IF NOT EXISTS setup_notes text DEFAULT ''''","-- Update venue_type constraint to include ''theater''
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_venue_type_check","ALTER TABLE public.venues ADD CONSTRAINT venues_venue_type_check
  CHECK (venue_type IN (''hotel'', ''museum'', ''outdoor'', ''restaurant'', ''private'', ''theater'', ''other''))","-- Allow staff_rating of 0 (no rating) — original constraint was between 1 and 5
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_staff_rating_check","ALTER TABLE public.venues ADD CONSTRAINT venues_staff_rating_check
  CHECK (staff_rating IS NULL OR staff_rating BETWEEN 0 AND 5)","notify pgrst, ''reload schema''"}', 'venue_extra_fields');
INSERT INTO supabase_migrations.schema_migrations VALUES ('027', '{"-- 027_forum_constitution.sql
-- Digital forum constitutions with versioning and member ratification.
-- Lean v1: plain-text sections, unanimous ratification required to adopt.

-- ── 1. forum_constitutions ───────────────────────────────────
-- One row per forum. Holds the pointer to the current adopted version.
create table if not exists public.forum_constitutions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (forum_id)
)","create index if not exists idx_forum_constitutions_chapter on public.forum_constitutions(chapter_id)","-- ── 2. forum_constitution_versions ───────────────────────────
-- Every version — draft, proposed, adopted, archived.
-- sections is a jsonb array: [{ id, heading, body }]
create table if not exists public.forum_constitution_versions (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.forum_constitutions(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  version_number int not null,
  status text not null default ''draft'' check (status in (''draft'', ''proposed'', ''adopted'', ''archived'')),
  title text not null default ''Forum Constitution'',
  preamble text default '''',
  sections jsonb not null default ''[]''::jsonb,
  authored_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  proposed_at timestamptz,
  adopted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (constitution_id, version_number)
)","create index if not exists idx_forum_constitution_versions_constitution on public.forum_constitution_versions(constitution_id)","create index if not exists idx_forum_constitution_versions_status on public.forum_constitution_versions(status)","create index if not exists idx_forum_constitution_versions_chapter on public.forum_constitution_versions(chapter_id)","-- ── 3. forum_constitution_ratifications ──────────────────────
-- One row per member signature on a specific version.
create table if not exists public.forum_constitution_ratifications (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.forum_constitution_versions(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  signed_at timestamptz not null default now(),
  unique (version_id, member_id)
)","create index if not exists idx_forum_constitution_ratifications_version on public.forum_constitution_ratifications(version_id)","create index if not exists idx_forum_constitution_ratifications_chapter on public.forum_constitution_ratifications(chapter_id)","-- ── 4. RLS ───────────────────────────────────────────────────
alter table public.forum_constitutions enable row level security","alter table public.forum_constitution_versions enable row level security","alter table public.forum_constitution_ratifications enable row level security","-- forum_constitutions
create policy \"Anon can view forum_constitutions\" on public.forum_constitutions
  for select using (true)","create policy \"Admins can insert forum_constitutions\" on public.forum_constitutions
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update forum_constitutions\" on public.forum_constitutions
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete forum_constitutions\" on public.forum_constitutions
  for delete using (public.is_super_admin() or public.is_admin())","-- forum_constitution_versions
create policy \"Anon can view forum_constitution_versions\" on public.forum_constitution_versions
  for select using (true)","create policy \"Admins can insert forum_constitution_versions\" on public.forum_constitution_versions
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update forum_constitution_versions\" on public.forum_constitution_versions
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete forum_constitution_versions\" on public.forum_constitution_versions
  for delete using (public.is_super_admin() or public.is_admin())","-- forum_constitution_ratifications: any authenticated forum member can sign,
-- but the client controls who (matches existing permissive pattern).
create policy \"Anon can view forum_constitution_ratifications\" on public.forum_constitution_ratifications
  for select using (true)","create policy \"Anon can insert forum_constitution_ratifications\" on public.forum_constitution_ratifications
  for insert with check (true)","create policy \"Admins can delete forum_constitution_ratifications\" on public.forum_constitution_ratifications
  for delete using (public.is_super_admin() or public.is_admin())","notify pgrst, ''reload schema''"}', 'forum_constitution');
INSERT INTO supabase_migrations.schema_migrations VALUES ('028', '{"-- 028_backfill_forums_from_members.sql
-- Backfill public.forums with a row for every distinct (chapter_id, forum)
-- combination present in public.chapter_members that doesn''t already have one.
--
-- Why: Forum-scoped tables (forum_agendas, forum_calendar_events, forum_documents,
-- forum_constitutions, etc.) reference forums.id as a FK. When a member''s
-- chapter_members.forum text doesn''t have a matching row in forums, the client
-- can''t resolve a forum_id — and every forum_id-scoped query silently returns
-- empty for that member. This shipped as a \"non-moderator Agenda tab is empty\"
-- bug discovered during a live demo.
--
-- This migration is idempotent and safe to re-run.

insert into public.forums (chapter_id, name, is_active, created_at, updated_at)
select distinct
  cm.chapter_id,
  cm.forum as name,
  true as is_active,
  now() as created_at,
  now() as updated_at
from public.chapter_members cm
where
  cm.forum is not null
  and length(trim(cm.forum)) > 0
  and not exists (
    select 1
    from public.forums f
    where f.chapter_id = cm.chapter_id
      and f.name = cm.forum
  )","notify pgrst, ''reload schema''"}', 'backfill_forums_from_members');
INSERT INTO supabase_migrations.schema_migrations VALUES ('029', '{"-- 029_navigator_broadcasts.sql
-- Navigator broadcasts: the Engagement Chair fires one message to every
-- active navigator (e.g. \"How''s your connection going — Y / N?\") and
-- navigators tap a single option to respond. Aggregated response view
-- solves the \"too many 1:1 threads to keep alive\" failure mode that kills
-- navigator follow-through today.
--
-- Two tables:
--   1. navigator_broadcasts           — the prompts, with response options
--   2. navigator_broadcast_responses  — one row per navigator per broadcast

-- ── 1. navigator_broadcasts ──────────────────────────────────
create table if not exists public.navigator_broadcasts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_year text not null,
  sender_member_id uuid references public.chapter_members(id) on delete set null,
  prompt text not null,
  -- JSON array of { value: string, label: string } objects.
  -- Default is yes/no but the chair can customize per-broadcast.
  options jsonb not null default ''[
    { \"value\": \"yes\", \"label\": \"Yes\" },
    { \"value\": \"no\",  \"label\": \"No\"  }
  ]''::jsonb,
  status text not null default ''open'' check (status in (''open'', ''closed'')),
  sent_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_navigator_broadcasts_chapter on public.navigator_broadcasts(chapter_id)","create index if not exists idx_navigator_broadcasts_fy on public.navigator_broadcasts(fiscal_year)","create index if not exists idx_navigator_broadcasts_status on public.navigator_broadcasts(status)","-- ── 2. navigator_broadcast_responses ─────────────────────────
create table if not exists public.navigator_broadcast_responses (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.navigator_broadcasts(id) on delete cascade,
  navigator_id uuid not null references public.navigators(id) on delete cascade,
  -- chapter_member_id denormalized for faster aggregation queries
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  response_value text not null,
  note text default '''',
  responded_at timestamptz not null default now(),
  unique (broadcast_id, navigator_id)
)","create index if not exists idx_nbr_broadcast on public.navigator_broadcast_responses(broadcast_id)","create index if not exists idx_nbr_navigator on public.navigator_broadcast_responses(navigator_id)","create index if not exists idx_nbr_member on public.navigator_broadcast_responses(chapter_member_id)","-- ── 3. RLS ────────────────────────────────────────────────────
-- Match the permissive pattern used elsewhere: anyone authenticated can read,
-- admins can write broadcasts, any navigator can insert their own response.
alter table public.navigator_broadcasts enable row level security","alter table public.navigator_broadcast_responses enable row level security","-- navigator_broadcasts: admin-only write, anyone can read
create policy \"Anon can view navigator_broadcasts\" on public.navigator_broadcasts
  for select using (true)","create policy \"Admins can insert navigator_broadcasts\" on public.navigator_broadcasts
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admins can update navigator_broadcasts\" on public.navigator_broadcasts
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admins can delete navigator_broadcasts\" on public.navigator_broadcasts
  for delete using (public.is_super_admin() or public.is_admin())","-- navigator_broadcast_responses:
--   select: anyone authenticated (chair needs to see all; navigators see everyone''s count)
--   insert: the responding navigator (their chapter_member_id must match their auth),
--           or an admin (so chair can log a response on someone''s behalf if needed)
--   update: same as insert (navigator can change their mind)
--   delete: admin only
create policy \"Anon can view navigator_broadcast_responses\" on public.navigator_broadcast_responses
  for select using (true)","create policy \"Navigator or admin can insert response\" on public.navigator_broadcast_responses
  for insert with check (
    public.is_super_admin()
    or public.is_admin()
    or chapter_member_id = public.current_chapter_member_id()
  )","create policy \"Navigator or admin can update own response\" on public.navigator_broadcast_responses
  for update using (
    public.is_super_admin()
    or public.is_admin()
    or chapter_member_id = public.current_chapter_member_id()
  )","create policy \"Admin can delete response\" on public.navigator_broadcast_responses
  for delete using (public.is_super_admin() or public.is_admin())","-- ── 4. Reload PostgREST schema cache ──────────────────────────
notify pgrst, ''reload schema''"}', 'navigator_broadcasts');
INSERT INTO supabase_migrations.schema_migrations VALUES ('030', '{"-- 030_profile_checkins.sql
-- Profile freshness ping: periodically ask members \"has anything changed?\"
-- so member data doesn''t rot silently. A single table captures both the
-- \"nothing changed\" confirmations AND the \"here''s what changed\" requests
-- the admin team needs to action.
--
-- From JS live demo: \"I''m going to build in a deal that occasionally pings
-- us that says, hey, has anything changed in your world that needs to be
-- reflected in your profile?\"

create table if not exists public.profile_checkins (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  -- ''no_change'' = member confirmed nothing changed (no admin action needed)
  -- ''change_requested'' = member flagged a change; admin needs to update profile + resolve
  kind text not null check (kind in (''no_change'', ''change_requested'')),
  note text default '''',
  status text not null default ''open'' check (status in (''open'', ''resolved'')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.chapter_members(id) on delete set null
)","create index if not exists idx_profile_checkins_member on public.profile_checkins(member_id)","create index if not exists idx_profile_checkins_chapter on public.profile_checkins(chapter_id)","create index if not exists idx_profile_checkins_kind_status on public.profile_checkins(kind, status)","create index if not exists idx_profile_checkins_created on public.profile_checkins(created_at)","-- RLS
alter table public.profile_checkins enable row level security","-- Select: admins see all; members see only their own
create policy \"Admins or self can view profile_checkins\" on public.profile_checkins
  for select using (
    public.is_super_admin()
    or public.is_admin()
    or member_id = public.current_chapter_member_id()
  )","-- Insert: members can insert their own check-in; admins can insert on behalf
create policy \"Self or admin can insert profile_checkins\" on public.profile_checkins
  for insert with check (
    public.is_super_admin()
    or public.is_admin()
    or member_id = public.current_chapter_member_id()
  )","-- Update: admin only (to resolve change_requested rows)
create policy \"Admins can update profile_checkins\" on public.profile_checkins
  for update using (public.is_super_admin() or public.is_admin())","-- Delete: admin only
create policy \"Admins can delete profile_checkins\" on public.profile_checkins
  for delete using (public.is_super_admin() or public.is_admin())","notify pgrst, ''reload schema''"}', 'profile_checkins');
INSERT INTO supabase_migrations.schema_migrations VALUES ('031', '{"-- 031_lifeline.sql
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
)","-- ── 2. Enums for life_events ─────────────────────────────────
do $$ begin
  create type public.life_event_valence as enum (''positive'', ''negative'');
exception when duplicate_object then null; end $$","do $$ begin
  create type public.life_event_time_type as enum (''year'', ''age'');
exception when duplicate_object then null; end $$","-- ── 3. life_events ───────────────────────────────────────────
-- Ports the original Lifeline schema:
--   time_type = ''year'' → time_value is a literal year, computed_year = time_value
--   time_type = ''age''  → time_value is the member''s age, computed_year = birth_year + age
-- computed_year is denormalized for sort; app recomputes on insert/update and
-- backfills when birth_year changes.
create table if not exists public.life_events (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.chapter_members(id) on delete cascade,
  title         text not null,
  summary       text not null default '''',
  valence       public.life_event_valence not null,
  intensity     int not null check (intensity between 1 and 5),
  time_type     public.life_event_time_type not null,
  time_value    int not null,
  computed_year int not null,
  sort_order    int not null default 0,
  brief         boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
)","create index if not exists idx_life_events_member
  on public.life_events(member_id)","create index if not exists idx_life_events_member_timeline
  on public.life_events(member_id, computed_year, sort_order)","-- ── 4. RLS — strictly owner-only for both tables ─────────────
alter table public.member_private enable row level security","alter table public.life_events    enable row level security","-- member_private: owner-only (select / insert / update / delete)
create policy \"Owner can view own private fields\" on public.member_private
  for select using (member_id = public.current_chapter_member_id())","create policy \"Owner can insert own private fields\" on public.member_private
  for insert with check (member_id = public.current_chapter_member_id())","create policy \"Owner can update own private fields\" on public.member_private
  for update using (member_id = public.current_chapter_member_id())","create policy \"Owner can delete own private fields\" on public.member_private
  for delete using (member_id = public.current_chapter_member_id())","-- life_events: author-only (select / insert / update / delete)
create policy \"Author can view own life events\" on public.life_events
  for select using (member_id = public.current_chapter_member_id())","create policy \"Author can insert own life events\" on public.life_events
  for insert with check (member_id = public.current_chapter_member_id())","create policy \"Author can update own life events\" on public.life_events
  for update using (member_id = public.current_chapter_member_id())","create policy \"Author can delete own life events\" on public.life_events
  for delete using (member_id = public.current_chapter_member_id())","-- ── 5. Reload PostgREST schema cache ─────────────────────────
notify pgrst, ''reload schema''"}', 'lifeline');
INSERT INTO supabase_migrations.schema_migrations VALUES ('032', '{"-- 032_multi_tenant_rls_hardening.sql
-- Multi-tenant RLS hardening: close cross-chapter data leaks.
--
-- PROBLEM: 30+ tables use \"Anon can view X\" / \"Anyone can view X\" with
-- `using (true)` for SELECT. Since both PERMISSIVE policies OR together,
-- the chapter-scoped policies that DO exist are meaningless — the anon
-- policy always passes first. Any authenticated user from any chapter can
-- read every other chapter''s data via raw Supabase calls.
--
-- FIX: Drop every permissive `using (true)` SELECT policy on tenant-owned
-- tables. For tables that already have a chapter-scoped SELECT policy,
-- that becomes the sole gate. For tables that don''t, create one.
--
-- GLOBAL REFERENCE tables (no chapter_id, intentionally shared) are NOT
-- touched: reflection_feelings, reflection_templates.
--
-- ALREADY PROPERLY SCOPED tables are NOT touched: parking_lot_entries,
-- reflections, life_events, member_private, notifications, profile_checkins,
-- profiles, sap_forum_ratings.

-- ════════════════════════════════════════════════════════════════
-- GROUP 1: Tables with BOTH an \"Anon\" policy AND a chapter-scoped
--          SELECT policy. Just drop the anon one — the scoped one
--          becomes the sole gate.
-- ════════════════════════════════════════════════════════════════

drop policy if exists \"Anon can view chair_reports\" on public.chair_reports","drop policy if exists \"Anon can view chapter_communications\" on public.chapter_communications","drop policy if exists \"Anon can view forums\" on public.forums","drop policy if exists \"Anon can view member_scorecards\" on public.member_scorecards","drop policy if exists \"Anon can view events\" on public.events","drop policy if exists \"Anon can view venues\" on public.venues","drop policy if exists \"Anon can view speakers\" on public.speakers","drop policy if exists \"Anon can view saps\" on public.saps","drop policy if exists \"Anon can view scenarios\" on public.scenarios","drop policy if exists \"Anon can view budget_items\" on public.budget_items","drop policy if exists \"Anon can view contract_checklists\" on public.contract_checklists","-- chapters: drop the anon policy, keep \"Users can view own chapter\"
drop policy if exists \"Anon can view chapters\" on public.chapters","-- ════════════════════════════════════════════════════════════════
-- GROUP 2: Tables with ONLY an \"Anon/Anyone\" using(true) SELECT
--          policy and a direct chapter_id column.
--          Drop the old, create chapter-scoped replacement.
-- ════════════════════════════════════════════════════════════════

-- chapter_members
drop policy if exists \"Anon can view chapter_members\" on public.chapter_members","create policy \"Chapter scoped select chapter_members\" on public.chapter_members
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- chapter_roles
drop policy if exists \"Anon can view chapter_roles\" on public.chapter_roles","create policy \"Chapter scoped select chapter_roles\" on public.chapter_roles
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- role_assignments
drop policy if exists \"Anon can view role_assignments\" on public.role_assignments","create policy \"Chapter scoped select role_assignments\" on public.role_assignments
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- compass_items
drop policy if exists \"Anon can view compass_items\" on public.compass_items","create policy \"Chapter scoped select compass_items\" on public.compass_items
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- navigators
drop policy if exists \"Anon can view navigators\" on public.navigators","create policy \"Chapter scoped select navigators\" on public.navigators
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- navigator_pairings
drop policy if exists \"Anon can view navigator_pairings\" on public.navigator_pairings","create policy \"Chapter scoped select navigator_pairings\" on public.navigator_pairings
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- navigator_resources
drop policy if exists \"Anon can view navigator_resources\" on public.navigator_resources","create policy \"Chapter scoped select navigator_resources\" on public.navigator_resources
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- navigator_broadcasts
drop policy if exists \"Anon can view navigator_broadcasts\" on public.navigator_broadcasts","create policy \"Chapter scoped select navigator_broadcasts\" on public.navigator_broadcasts
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- mentors
drop policy if exists \"Anon can view mentors\" on public.mentors","create policy \"Chapter scoped select mentors\" on public.mentors
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- mentor_pairings
drop policy if exists \"Anon can view mentor_pairings\" on public.mentor_pairings","create policy \"Chapter scoped select mentor_pairings\" on public.mentor_pairings
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_agendas
drop policy if exists \"Anyone can view forum_agendas\" on public.forum_agendas","create policy \"Chapter scoped select forum_agendas\" on public.forum_agendas
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_calendar_events
drop policy if exists \"Anyone can view forum_calendar_events\" on public.forum_calendar_events","create policy \"Chapter scoped select forum_calendar_events\" on public.forum_calendar_events
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_constitutions
drop policy if exists \"Anon can view forum_constitutions\" on public.forum_constitutions","create policy \"Chapter scoped select forum_constitutions\" on public.forum_constitutions
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_constitution_versions
drop policy if exists \"Anon can view forum_constitution_versions\" on public.forum_constitution_versions","create policy \"Chapter scoped select forum_constitution_versions\" on public.forum_constitution_versions
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_constitution_ratifications
drop policy if exists \"Anon can view forum_constitution_ratifications\" on public.forum_constitution_ratifications","create policy \"Chapter scoped select forum_constitution_ratifications\" on public.forum_constitution_ratifications
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_documents
drop policy if exists \"Anyone can view forum_documents\" on public.forum_documents","create policy \"Chapter scoped select forum_documents\" on public.forum_documents
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_history_members
drop policy if exists \"Anyone can view forum_history_members\" on public.forum_history_members","create policy \"Chapter scoped select forum_history_members\" on public.forum_history_members
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- forum_role_assignments
drop policy if exists \"Anyone can view forum_role_assignments\" on public.forum_role_assignments","create policy \"Chapter scoped select forum_role_assignments\" on public.forum_role_assignments
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- sap_forum_interest
drop policy if exists \"Anyone can view sap_forum_interest\" on public.sap_forum_interest","create policy \"Chapter scoped select sap_forum_interest\" on public.sap_forum_interest
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- speaker_pipeline
drop policy if exists \"Anon can read speaker_pipeline\" on public.speaker_pipeline","create policy \"Chapter scoped select speaker_pipeline\" on public.speaker_pipeline
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- event_documents
drop policy if exists \"Anon can view event_documents\" on public.event_documents","create policy \"Chapter scoped select event_documents\" on public.event_documents
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- fiscal_year_budgets
drop policy if exists \"Anon can read fiscal_year_budgets\" on public.fiscal_year_budgets","create policy \"Chapter scoped select fiscal_year_budgets\" on public.fiscal_year_budgets
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id())","-- ════════════════════════════════════════════════════════════════
-- GROUP 3: Child tables WITHOUT a direct chapter_id column.
--          Drop the old, create policy via EXISTS subquery on parent.
-- ════════════════════════════════════════════════════════════════

-- navigator_sessions (parent: navigator_pairings via pairing_id)
drop policy if exists \"Anon can view navigator_sessions\" on public.navigator_sessions","create policy \"Chapter scoped select navigator_sessions\" on public.navigator_sessions
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.navigator_pairings np
      where np.id = navigator_sessions.pairing_id
        and np.chapter_id = public.user_chapter_id()
    )
  )","-- navigator_broadcast_responses (parent: navigator_broadcasts via broadcast_id)
drop policy if exists \"Anon can view navigator_broadcast_responses\" on public.navigator_broadcast_responses","create policy \"Chapter scoped select navigator_broadcast_responses\" on public.navigator_broadcast_responses
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.navigator_broadcasts nb
      where nb.id = navigator_broadcast_responses.broadcast_id
        and nb.chapter_id = public.user_chapter_id()
    )
  )","-- forum_agenda_items (parent: forum_agendas via agenda_id)
drop policy if exists \"Anyone can view forum_agenda_items\" on public.forum_agenda_items","create policy \"Chapter scoped select forum_agenda_items\" on public.forum_agenda_items
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.forum_agendas fa
      where fa.id = forum_agenda_items.agenda_id
        and fa.chapter_id = public.user_chapter_id()
    )
  )","-- fiscal_year_budget_lines (parent: fiscal_year_budgets via fiscal_year_budget_id)
drop policy if exists \"Anon can read fiscal_year_budget_lines\" on public.fiscal_year_budget_lines","create policy \"Chapter scoped select fiscal_year_budget_lines\" on public.fiscal_year_budget_lines
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.fiscal_year_budgets fyb
      where fyb.id = fiscal_year_budget_lines.fiscal_year_budget_id
        and fyb.chapter_id = public.user_chapter_id()
    )
  )","-- ════════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache
-- ════════════════════════════════════════════════════════════════
notify pgrst, ''reload schema''"}', 'multi_tenant_rls_hardening');
INSERT INTO supabase_migrations.schema_migrations VALUES ('034', '{"-- 034_sap_contacts_table.sql
-- The sap_contacts table was referenced by sapStore but never created.
-- This caused the entire sapStore hydrate to fail (Promise.all rejected),
-- leaving partners stuck on mock data.

create table if not exists public.sap_contacts (
  id uuid primary key default gen_random_uuid(),
  sap_id uuid not null references public.saps(id) on delete cascade,
  name text not null,
  role text default '''',
  email text default '''',
  phone text default '''',
  is_primary boolean default false,
  forum_trained boolean default false,
  forum_trained_date date,
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_sap_contacts_sap on public.sap_contacts(sap_id)","alter table public.sap_contacts enable row level security","create policy \"Chapter scoped select sap_contacts\" on public.sap_contacts
  for select using (
    public.is_super_admin()
    or exists (select 1 from public.saps s where s.id = sap_contacts.sap_id and s.chapter_id = public.user_chapter_id())
  )","create policy \"Admin can insert sap_contacts\" on public.sap_contacts
  for insert with check (public.is_super_admin() or public.is_admin())","create policy \"Admin can update sap_contacts\" on public.sap_contacts
  for update using (public.is_super_admin() or public.is_admin())","create policy \"Admin can delete sap_contacts\" on public.sap_contacts
  for delete using (public.is_super_admin() or public.is_admin())","notify pgrst, ''reload schema''"}', 'sap_contacts_table');
INSERT INTO supabase_migrations.schema_migrations VALUES ('035', '{"-- 035_sap_portal_auth.sql
-- Add sap_contact as a first-class app role so SAP partner contacts
-- can authenticate via magic link and access their own portal.

-- ── 1. Add sap_contact to profiles role CHECK ──────────────────

alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''president_elect'',
    ''president_elect_elect'',
    ''finance_chair'',
    ''learning_chair'',
    ''learning_chair_elect'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact''
  ))","-- ── 2. Add sap_contact to member_invites role CHECK ────────────

alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''president_elect'',
    ''president_elect_elect'',
    ''finance_chair'',
    ''learning_chair'',
    ''learning_chair_elect'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact''
  ))","-- ── 3. Add sap_contact_id FK on profiles ──────────────────────

alter table public.profiles
  add column if not exists sap_contact_id uuid references public.sap_contacts(id) on delete set null","-- ── 4. Add profile_id back-reference on sap_contacts ──────────

alter table public.sap_contacts
  add column if not exists profile_id uuid references public.profiles(id) on delete set null","-- ── 5. Update handle_new_user() trigger ────────────────────────
-- When the claimed invite is for sap_contact, resolve the link.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  resolved_sap_contact_id uuid;
begin
  select * into invite from public.member_invites
    where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, chapter_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
    coalesce(invite.role, ''member''),
    invite.chapter_id
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  -- Link SAP contact profile ↔ sap_contacts record
  if invite.role = ''sap_contact'' then
    select id into resolved_sap_contact_id
      from public.sap_contacts
      where lower(email) = lower(new.email)
      limit 1;

    if resolved_sap_contact_id is not null then
      update public.profiles
        set sap_contact_id = resolved_sap_contact_id
        where id = new.id;

      update public.sap_contacts
        set profile_id = new.id
        where id = resolved_sap_contact_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer","-- ── 6. RLS helper: is_sap_contact() ───────────────────────────

create or replace function public.is_sap_contact()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = ''sap_contact''
  );
$$ language sql security definer stable","-- ── 7. RLS: SAP contacts can read their own sap_contacts row ──

create policy \"SAP contact can view own contact record\" on public.sap_contacts
  for select using (
    profile_id = auth.uid()
  )","create policy \"SAP contact can update own contact record\" on public.sap_contacts
  for update using (
    profile_id = auth.uid()
  )","-- ── 8. RLS: SAP contacts can read their own saps (partner) row ─

create policy \"SAP contact can view own partner\" on public.saps
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      where sc.sap_id = id
        and sc.profile_id = auth.uid()
    )
  )","-- ── 9. RLS: SAP contacts can read events they''re invited to ───

create policy \"SAP contact can view invited events\" on public.events
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = any(sap_ids)
    )
  )"}', 'sap_portal_auth');
INSERT INTO supabase_migrations.schema_migrations VALUES ('041', '{"-- 041_events_open_to_saps.sql
-- Add open_to_saps flag to events. Defaults to true — most events are
-- open to SAP partners. Toggle off for the rare members-only events.

alter table public.events
  add column if not exists open_to_saps boolean not null default true"}', 'events_open_to_saps');
INSERT INTO supabase_migrations.schema_migrations VALUES ('042', '{"-- Whitelist Karl Bickmore (President Elect, EO Arizona) in the auth allowlist.
insert into public.member_invites (email, full_name, role, chapter_id)
values (
  ''kbickmore@snaptechit.com'',
  ''Karl Bickmore'',
  ''president_elect'',
  (select id from public.chapters where name = ''EO Arizona'')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id"}', 'whitelist_karl_bickmore');
INSERT INTO supabase_migrations.schema_migrations VALUES ('043', '{"-- Backfill public.member_invites from public.chapter_members.
--
-- Guarantees that every active member in the directory is on the auth
-- allowlist so they can sign in via magic link. The existing UI only calls
-- syncMemberInvites on bulk-import and single-add paths, so any member
-- seeded directly (or imported before that sync was wired up) may be
-- missing from the allowlist.
--
-- Idempotent: on conflict do nothing — never overwrites a claimed invite
-- or a manually-set role.

insert into public.member_invites (email, full_name, role, chapter_id)
select
  lower(trim(cm.email)),
  coalesce(nullif(cm.name, ''''), trim(cm.first_name || '' '' || cm.last_name)),
  ''member'',
  cm.chapter_id
from public.chapter_members cm
where cm.email is not null
  and cm.email <> ''''
  and cm.status = ''active''
on conflict (email) do nothing"}', 'backfill_member_invites_from_members');
INSERT INTO supabase_migrations.schema_migrations VALUES ('044', '{"-- Add ''demo_user'' to allowed app roles.
--
-- A demo_user is an account provisioned by a super-admin (via Settings →
-- Demo Users) so external stakeholders — regional chairs, global chairs,
-- board members, prospective buyers — can self-serve through the demo
-- without being on a screenshare. The client-side auth layer locks a
-- demo_user session permanently into Mock Mode, so they never read or write
-- real chapter data regardless of what URL they hit.
--
-- We add the role to both constraints:
--   1. profiles.role — controls what a claimed account can be
--   2. member_invites.role — controls what roles can be pre-seeded in the
--      allowlist before someone accepts a magic-link invite
--
-- Idempotent: safe to re-run.

-- ── 1. profiles.role ──────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","-- ── 2. member_invites.role ────────────────────────────────────────
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","notify pgrst, ''reload schema''"}', 'demo_user_role');
INSERT INTO supabase_migrations.schema_migrations VALUES ('045', '{"-- Fix: public.is_admin() was missing ''super_admin'' in its allowed-roles list.
-- Every RLS policy using is_admin() (member_invites insert/delete/select,
-- and others) was silently rejecting super-admin actions — the bug only
-- surfaced when a super-admin tried to create a chapter and directly invite
-- a Learning Chair via ChapterConfigPage. Previous workflows used the
-- upsertStaffInvite RPC (security definer) which bypassed RLS, so nobody
-- noticed until now.
--
-- Also fixes is_chapter_admin() to give super_admin a global bypass:
-- super-admins oversee every chapter, so the chapter_id comparison should
-- not gate them.
--
-- Idempotent: re-runnable.

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      ''super_admin'',
      ''president'',
      ''finance_chair'',
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = ''super_admin''
      or (
        chapter_id = check_chapter_id
        and role in (
          ''president'',
          ''finance_chair'',
          ''learning_chair'',
          ''engagement_chair'',
          ''chapter_experience_coordinator'',
          ''chapter_executive_director''
        )
      )
    )
  );
$$ language sql security definer stable","notify pgrst, ''reload schema''"}', 'super_admin_is_admin');
INSERT INTO supabase_migrations.schema_migrations VALUES ('046', '{"-- Add currency + timezone columns to chapters so each chapter can display
-- budget figures and event times in its own local context.
--
-- `currency` — ISO 4217 three-letter code (USD, EUR, GBP, CNY, JPY, AUD, CAD…).
--              Defaults to USD for backward compatibility; EO Arizona stays USD.
-- `timezone` — IANA timezone identifier (America/Phoenix, Europe/Madrid,
--              Asia/Shanghai, etc.). Defaults to America/Phoenix for EO Arizona.
--
-- Both are plain text so we don''t have to maintain an enum; the UI will
-- constrain inputs to sensible choices.
--
-- Idempotent: safe to re-run.

alter table public.chapters
  add column if not exists currency text not null default ''USD''","alter table public.chapters
  add column if not exists timezone text not null default ''America/Phoenix''","notify pgrst, ''reload schema''"}', 'chapter_currency_timezone');
INSERT INTO supabase_migrations.schema_migrations VALUES ('047', '{"-- Platform-wide feedback inbox. Every \"Send Feedback\" / \"Report Bug\"
-- submission lands here so the builder can triage without scattered DMs.
--
-- Anyone signed in can insert (authenticated users only — super-admins and
-- chapter users alike can send feedback). Only super-admins can read the
-- inbox.

create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  chapter_id uuid references public.chapters(id) on delete set null,
  feedback_type text not null default ''suggestion''
    check (feedback_type in (''suggestion'', ''bug'', ''praise'', ''question'')),
  message text not null,
  url text,
  user_agent text,
  status text not null default ''new''
    check (status in (''new'', ''triaged'', ''in_progress'', ''resolved'', ''wont_fix'')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
)","create index if not exists idx_platform_feedback_status
  on public.platform_feedback(status, created_at desc)","create index if not exists idx_platform_feedback_chapter
  on public.platform_feedback(chapter_id)","alter table public.platform_feedback enable row level security","-- Anyone authenticated can insert their own feedback
create policy \"Authenticated users can submit feedback\"
  on public.platform_feedback for insert
  to authenticated
  with check (true)","-- Only super-admins can read or update the inbox
create policy \"Super admins read all feedback\"
  on public.platform_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = ''super_admin''
    )
  )","create policy \"Super admins update feedback\"
  on public.platform_feedback for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = ''super_admin''
    )
  )","notify pgrst, ''reload schema''"}', 'platform_feedback');
INSERT INTO supabase_migrations.schema_migrations VALUES ('048', '{"-- Add ''sap_chair'' to allowed chapter-level roles.
--
-- The SAP Chair owns the Strategic Alliance Partners (SAPs) program
-- for a chapter: sponsor recruitment, tier management, renewals, event
-- engagements. This is the primary owner; Learning Chair / President /
-- Chapter Staff retain read-only reference access.
--
-- Adds the role to both check constraints (profiles + member_invites)
-- and grants it chapter-admin status via the existing is_admin() /
-- is_chapter_admin() functions.
--
-- Idempotent: safe to re-run.

-- ── 1. profiles.role ──────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''sap_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","-- ── 2. member_invites.role ────────────────────────────────────────
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''president'',
    ''finance_chair'',
    ''learning_chair'',
    ''engagement_chair'',
    ''sap_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","-- ── 3. is_admin() includes sap_chair ──────────────────────────────
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      ''super_admin'',
      ''president'',
      ''finance_chair'',
      ''learning_chair'',
      ''engagement_chair'',
      ''sap_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","-- ── 4. is_chapter_admin() includes sap_chair ─────────────────────
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = ''super_admin''
      or (
        chapter_id = check_chapter_id
        and role in (
          ''president'',
          ''finance_chair'',
          ''learning_chair'',
          ''engagement_chair'',
          ''sap_chair'',
          ''chapter_experience_coordinator'',
          ''chapter_executive_director''
        )
      )
    )
  );
$$ language sql security definer stable","notify pgrst, ''reload schema''"}', 'sap_chair_role');
INSERT INTO supabase_migrations.schema_migrations VALUES ('049', '{"-- Allow chapter members to update their own profile row.
--
-- Previously chapter_members.update was admin-only. To support a
-- self-service member profile page, members can now update the row
-- whose email matches their auth email. Status, role, forum, and
-- chapter_id remain admin-controlled (see the column-level guards in
-- the app — and a forthcoming column-grant tightening).
--
-- Idempotent: safe to re-run.

create policy \"Members can update own row\" on public.chapter_members
  for update
  using (
    public.current_chapter_member_id() = id
  )
  with check (
    public.current_chapter_member_id() = id
  )","notify pgrst, ''reload schema''"}', 'member_self_edit');
INSERT INTO supabase_migrations.schema_migrations VALUES ('051', '{"-- Beta Terms versioning + per-user acknowledgment.
--
-- Our Chapter OS is in active beta with chapters across 30+ countries
-- requesting access. We need an enforceable record that every user has
-- accepted the beta terms (assumption of risk + indemnification of JSD,
-- Aidan Taylor LLC, and EO Arizona) before using the product.
--
-- Two tables:
--   beta_terms_versions          immutable history of every published terms version
--   beta_terms_acknowledgments   per-user record of which version they accepted, when
--
-- Re-acknowledgment: when a new terms version is published (e.g. Chair Chat
-- adds AI-translation disclaimers), the app gates returning users on a
-- blocking modal until they accept the new version.
--
-- \"Current\" terms = row with the latest effective_date <= today. Helper
-- function current_beta_terms_version() returns the row to the client.
--
-- Idempotent: safe to re-run.

create table if not exists public.beta_terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,                       -- \"1.0\", \"1.1\", ...
  effective_date date not null,
  content_md text not null,                           -- full markdown shown in modal
  summary text not null default '''',                   -- one-liner for re-ack diff card
  created_at timestamptz not null default now()
)","create index if not exists idx_beta_terms_versions_effective on public.beta_terms_versions(effective_date desc)","create table if not exists public.beta_terms_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id uuid not null references public.beta_terms_versions(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  user_agent text,                                    -- captured for audit; nullable
  unique (user_id, version_id)
)","create index if not exists idx_beta_terms_acks_user on public.beta_terms_acknowledgments(user_id)","-- RLS
alter table public.beta_terms_versions enable row level security","alter table public.beta_terms_acknowledgments enable row level security","-- Anyone (including unauthenticated, for the login-page modal) can read terms.
drop policy if exists \"anyone reads terms versions\" on public.beta_terms_versions","create policy \"anyone reads terms versions\" on public.beta_terms_versions
  for select to anon, authenticated
  using (true)","-- Only super_admin can insert/update/delete versions (publishing happens via SQL or admin tooling).
drop policy if exists \"super admin manages terms versions\" on public.beta_terms_versions","create policy \"super admin manages terms versions\" on public.beta_terms_versions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin())","-- Users read their own acks; super_admin reads all (audit).
drop policy if exists \"users read own acks\" on public.beta_terms_acknowledgments","create policy \"users read own acks\" on public.beta_terms_acknowledgments
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin())","-- Users insert their own acks only.
drop policy if exists \"users insert own acks\" on public.beta_terms_acknowledgments","create policy \"users insert own acks\" on public.beta_terms_acknowledgments
  for insert to authenticated
  with check (user_id = auth.uid())","-- No update/delete from clients (acks are immutable historical records).

-- Current-terms helper: returns the single most recent in-effect version.
create or replace function public.current_beta_terms_version()
returns table (
  id uuid,
  version text,
  effective_date date,
  content_md text,
  summary text
)
language sql
stable
security definer
as $$
  select id, version, effective_date, content_md, summary
  from public.beta_terms_versions
  where effective_date <= current_date
  order by effective_date desc, version desc
  limit 1;
$$","grant execute on function public.current_beta_terms_version() to anon, authenticated","-- Convenience helper: did the current authenticated user ack the current terms?
create or replace function public.has_acked_current_beta_terms()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.beta_terms_acknowledgments a
    join public.current_beta_terms_version() c on c.id = a.version_id
    where a.user_id = auth.uid()
  );
$$","grant execute on function public.has_acked_current_beta_terms() to authenticated","-- Seed v1.0
insert into public.beta_terms_versions (version, effective_date, content_md, summary)
values (
  ''1.0'',
  ''2026-04-19'',
  $tmd$# Our Chapter OS — Beta Program Terms

## What this is

Our Chapter OS is an **independent software project** built by John-Scott Dixon, an Entrepreneurs'' Organization member, for use by other EO members and chapters. It is **not a product of, sponsored by, endorsed by, or affiliated with** Entrepreneurs'' Organization, EO Global, EO Arizona, or any EO chapter, region, or governing body. References to EO terminology, roles, or structure are descriptive only.

The software is provided through Aidan Taylor, LLC, a private Arizona limited liability company.

## Beta status

This software is in **active beta**. By requesting access (including by requesting a magic-link sign-in email) and by acknowledging these terms, you acknowledge and agree that:

1. **Bugs and outages are expected.** Features may change, regress, or be removed without notice. Data displayed may be incomplete, incorrect, or temporarily unavailable.
2. **Data may be lost.** Although reasonable backup measures are in place, no guarantee is made that any data you enter will be preserved, recoverable, or retained for any period. **You are solely responsible for maintaining your own backups.** A \"Download Backup\" function is provided in the application for this purpose, and you are encouraged to use it regularly.
3. **No warranty.** The software is provided **\"AS IS\" and \"AS AVAILABLE,\"** without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, accuracy, reliability, availability, or non-infringement.
4. **No fitness for any decision.** Outputs of the software (including budget figures, member rosters, attendance counts, financial calculations, AI-generated suggestions, translations, contract reviews, and recommendations) are informational only and **must not be relied upon for legal, financial, fiduciary, contractual, or governance decisions** without independent verification.
5. **AI-generated content.** Where the software uses generative AI to produce translations, summaries, contract reviews, recommendations, or other output, that output may be inaccurate, incomplete, biased, or fabricated. **AI output is not legal, financial, or professional advice** and must be independently verified before any reliance.
6. **No support obligation.** No service-level commitment, response time, uptime guarantee, or feature roadmap commitment is made or implied.

## Assumption of risk and indemnification

By using the software, you, on behalf of yourself, your chapter, and any entity you represent:

1. **Assume all risk** arising from your use of the software, including but not limited to data loss, data exposure, downtime, incorrect outputs, miscommunications with members or partners, and any operational, financial, or reputational consequences.
2. **Release and indemnify** John-Scott Dixon (personally), Aidan Taylor, LLC, **and the EO Arizona chapter** (collectively, the \"Released Parties\") from any and all claims, demands, losses, damages, liabilities, costs, and expenses (including reasonable attorneys'' fees) arising out of or relating to your use of, or inability to use, the software, whether based in contract, tort, statute, or otherwise.
3. **Maximum aggregate liability.** The maximum aggregate liability of the Released Parties to you, for any cause whatsoever, shall not exceed **one hundred U.S. dollars ($100.00)**, regardless of the form of action.
4. **Waive consequential damages.** In no event shall the Released Parties be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, or business interruption, even if advised of the possibility.

## Data handling

Your chapter''s data is stored in a multi-tenant database with row-level security scoping data to your chapter. Reasonable measures are taken to prevent cross-chapter data exposure, but **no security guarantee is made**. Do not enter information into the software that you cannot afford to have lost, exposed, or made available to other users in error.

## Termination

Access to the software may be suspended or terminated at any time, for any reason or no reason, with or without notice. Upon termination, your data may be deleted; you are responsible for retaining backups before termination.

## Governing law

These terms are governed by the laws of the State of Arizona, without regard to conflict-of-law principles. Any dispute shall be resolved exclusively in the state or federal courts located in Maricopa County, Arizona.

## Updates to these terms

These terms may be updated from time to time. Material changes will require renewed acknowledgment before continued use of the software. Continued use after the effective date of an updated version constitutes acceptance of the updated terms.

## Acknowledgment

By acknowledging these terms (whether at sign-in or in-application), you confirm that you have read, understood, and agreed to them. A record of your acknowledgment, including timestamp and the version of these terms in effect, will be retained.

---
*Beta Terms version 1.0 — effective 2026-04-19*
$tmd$,
  ''Initial beta terms — assumption of risk + indemnification of JSD, Aidan Taylor LLC, and EO Arizona.''
)
on conflict (version) do nothing","notify pgrst, ''reload schema''"}', 'beta_terms_acknowledgment');
INSERT INTO supabase_migrations.schema_migrations VALUES ('052', '{"-- Fee privacy flags on speaker_pipeline.
--
-- Speakers may request that we keep negotiated fees confidential — e.g.
-- \"I''ll give your chapter a discounted rate, but please don''t share
-- this number with other chapters.\" These flags let chapter staff mark
-- which fee values are confidential per pipeline entry.
--
-- Within-chapter behavior (today): fees stay visible to chapter admins
-- (they need to see what they''re paying). The UI shows a Lock indicator
-- next to private values as a reminder not to share externally.
--
-- Cross-chapter behavior (future, see speaker library sharing #5):
-- private fees will be omitted from the cross-chapter shared view.
--
-- Idempotent: safe to re-run.

alter table public.speaker_pipeline
  add column if not exists fee_estimated_private boolean not null default false","alter table public.speaker_pipeline
  add column if not exists fee_actual_private boolean not null default false","notify pgrst, ''reload schema''"}', 'speaker_fee_privacy');
INSERT INTO supabase_migrations.schema_migrations VALUES ('053', '{"-- Feature recommendations module — Learning Chair scope.
--
-- Purpose: collect cross-chapter feedback from Learning Chairs about
-- what to build next. Recommendations submitted by any Learning Chair
-- (or Learning Chair Elect, or super_admin) are visible to all
-- authenticated users; LCs upvote what they want; super_admin marks
-- effort, status, and the version each recommendation shipped in.
--
-- Tables:
--   feature_recommendations          one row per submitted recommendation
--   feature_recommendation_votes     one row per (recommendation, voter)
--
-- Surface field is hardcoded to ''learning_chair'' for v1; future PRs
-- can extend to other chair surfaces (engagement, finance, etc.) by
-- adding submission rights for those roles.
--
-- Idempotent: safe to re-run.

create table if not exists public.feature_recommendations (
  id uuid primary key default gen_random_uuid(),
  surface text not null default ''learning_chair'',          -- which chair area this targets
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  submitted_by_chapter_id uuid references public.chapters(id) on delete set null,
  submitter_name text default '''',                          -- snapshot for display if user is later removed
  submitter_chapter_name text default '''',                  -- snapshot
  title text not null,
  body text not null default '''',
  effort text check (effort is null or effort in (''easy'',''medium'',''difficult'')),
  status text not null default ''open''
    check (status in (''open'',''in_progress'',''shipped'',''closed'',''duplicate'')),
  shipped_in_version text,
  shipped_at timestamptz,
  duplicate_of uuid references public.feature_recommendations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_feature_recs_surface on public.feature_recommendations(surface)","create index if not exists idx_feature_recs_status on public.feature_recommendations(status)","create table if not exists public.feature_recommendation_votes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.feature_recommendations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recommendation_id, user_id)
)","create index if not exists idx_feature_rec_votes_rec on public.feature_recommendation_votes(recommendation_id)","-- RLS
alter table public.feature_recommendations enable row level security","alter table public.feature_recommendation_votes enable row level security","-- Anyone authenticated can read (cross-chapter visibility).
drop policy if exists \"auth reads recommendations\" on public.feature_recommendations","create policy \"auth reads recommendations\" on public.feature_recommendations
  for select to authenticated
  using (true)","-- Helper: is this user allowed to submit/vote on Learning Chair recommendations?
create or replace function public.can_submit_lc_recommendations()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (''learning_chair'',''learning_chair_elect'',''super_admin'')
  );
$$","grant execute on function public.can_submit_lc_recommendations() to authenticated","-- Insert: only LCs (and super_admin) can submit, and only for their own user_id.
drop policy if exists \"lc submits recommendations\" on public.feature_recommendations","create policy \"lc submits recommendations\" on public.feature_recommendations
  for insert to authenticated
  with check (
    public.can_submit_lc_recommendations()
    and submitted_by_user_id = auth.uid()
  )","-- Update: only super_admin (effort, status, shipped_in_version, etc.).
drop policy if exists \"super admin updates recommendations\" on public.feature_recommendations","create policy \"super admin updates recommendations\" on public.feature_recommendations
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin())","-- Delete: super_admin or own submission.
drop policy if exists \"delete own or super admin\" on public.feature_recommendations","create policy \"delete own or super admin\" on public.feature_recommendations
  for delete to authenticated
  using (public.is_super_admin() or submitted_by_user_id = auth.uid())","-- Votes: anyone authenticated can read.
drop policy if exists \"auth reads recommendation votes\" on public.feature_recommendation_votes","create policy \"auth reads recommendation votes\" on public.feature_recommendation_votes
  for select to authenticated
  using (true)","-- Insert: same gate as submission (LCs + super_admin), and user_id must be self.
drop policy if exists \"lc votes recommendations\" on public.feature_recommendation_votes","create policy \"lc votes recommendations\" on public.feature_recommendation_votes
  for insert to authenticated
  with check (
    public.can_submit_lc_recommendations()
    and user_id = auth.uid()
  )","-- Delete own vote (toggle off).
drop policy if exists \"delete own vote\" on public.feature_recommendation_votes","create policy \"delete own vote\" on public.feature_recommendation_votes
  for delete to authenticated
  using (user_id = auth.uid())","notify pgrst, ''reload schema''"}', 'feature_recommendations');
INSERT INTO supabase_migrations.schema_migrations VALUES ('054', '{"-- Survey responses cross-tenant scoping fix.
--
-- BUG: survey_responses had no chapter_id column. The only read gate
-- was the broad \"Admins can read all surveys\" RLS policy, which used
-- public.is_admin() with no chapter scope. Result: any chapter admin
-- could see survey responses from members of OTHER chapters when they
-- opened Survey Results, and a super_admin viewing as a chair in
-- chapter X saw their own response (made in chapter Y) as if it were
-- a chapter-X member''s response.
--
-- This violates the multi-tenant isolation guarantee that v1.48.0 /
-- migration 032 established for the rest of the schema.
--
-- Fix:
--   1. Add chapter_id column (denormalized for query speed).
--   2. Backfill from profiles.chapter_id where the user has one.
--   3. Replace the broad admin read policy with a chapter-scoped one.
--      Super_admin still sees all (cross-chapter support); regular
--      chapter admins see only their own chapter''s responses.
--   4. Client (SurveyPage submit) writes chapter_id from the active
--      chapter context. Client (SurveyResultsPage) filters reads by
--      active chapter.
--
-- Idempotent: safe to re-run.

alter table public.survey_responses
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade","create index if not exists idx_survey_responses_chapter on public.survey_responses(chapter_id)","-- Backfill from profiles
update public.survey_responses sr
set chapter_id = p.chapter_id
from public.profiles p
where sr.user_id = p.id
  and sr.chapter_id is null
  and p.chapter_id is not null","-- Replace the broad admin-read policy with chapter-scoped read.
drop policy if exists \"Admins can read all surveys\" on public.survey_responses","drop policy if exists \"Admins read own chapter surveys\" on public.survey_responses","create policy \"Admins read own chapter surveys\" on public.survey_responses
  for select using (
    public.is_super_admin()
    or (public.is_admin() and chapter_id = public.user_chapter_id())
  )","notify pgrst, ''reload schema''"}', 'survey_responses_chapter_scope');
INSERT INTO supabase_migrations.schema_migrations VALUES ('036', '{"-- 036_vendor_sap_tier.sql
-- Add tier and SAP linkage to vendors so SAP partners surface
-- as premium vendors in the Vendor Exchange.

alter table public.vendors
  add column if not exists tier text not null default ''community''
    check (tier in (''community'', ''sap_partner'')),
  add column if not exists sap_id uuid references public.saps(id) on delete set null","create index if not exists idx_vendors_sap on public.vendors(sap_id) where sap_id is not null","create index if not exists idx_vendors_tier on public.vendors(tier) where tier = ''sap_partner''"}', 'vendor_sap_tier');
INSERT INTO supabase_migrations.schema_migrations VALUES ('037', '{"-- 037_sap_connect_requests.sql
-- Members can request to connect with an SAP partner.
-- SAP contacts see these as leads in their portal.

create table if not exists public.sap_connect_requests (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  member_name text not null default '''',
  member_company text default '''',
  message text default '''',
  status text not null default ''pending''
    check (status in (''pending'', ''contacted'', ''closed'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_sap_connect_sap on public.sap_connect_requests(sap_id)","create index if not exists idx_sap_connect_status on public.sap_connect_requests(sap_id, status)","-- RLS
alter table public.sap_connect_requests enable row level security","-- Members can create their own requests
create policy \"Members can insert connect requests\" on public.sap_connect_requests
  for insert with check (auth.uid() = member_id)","-- Members can view their own requests
create policy \"Members can view own connect requests\" on public.sap_connect_requests
  for select using (auth.uid() = member_id)","-- SAP contacts can view requests for their partner
create policy \"SAP contacts can view partner connect requests\" on public.sap_connect_requests
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  )","-- SAP contacts can update status on requests for their partner
create policy \"SAP contacts can update partner connect requests\" on public.sap_connect_requests
  for update using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  )","-- Admins have full access
create policy \"Admins can manage connect requests\" on public.sap_connect_requests
  for all using (public.is_admin() or public.is_super_admin())"}', 'sap_connect_requests');
INSERT INTO supabase_migrations.schema_migrations VALUES ('038', '{"-- 038_sap_forum_appearances.sql
-- SAP contacts can log forums they''ve spoken at.

create table if not exists public.sap_forum_appearances (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid not null references public.sap_contacts(id) on delete cascade,
  forum_name text not null default '''',
  appearance_date date,
  topic text default '''',
  created_at timestamptz not null default now()
)","create index if not exists idx_sap_forum_appearances_contact on public.sap_forum_appearances(sap_contact_id)","-- RLS
alter table public.sap_forum_appearances enable row level security","-- SAP contacts can manage their own appearances
create policy \"SAP contacts can manage own appearances\" on public.sap_forum_appearances
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  )","-- Admins can read all
create policy \"Admins can view all forum appearances\" on public.sap_forum_appearances
  for select using (public.is_admin() or public.is_super_admin())"}', 'sap_forum_appearances');
INSERT INTO supabase_migrations.schema_migrations VALUES ('039', '{"-- 039_sap_chapter_feedback.sql
-- SAP contacts can rate the chapter and provide recommendations.
-- Anonymous feedback has null sap_contact_id — only sap_id identifies the company.

create table if not exists public.sap_chapter_feedback (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  sap_id uuid not null references public.saps(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback_text text default '''',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
)","create index if not exists idx_sap_chapter_feedback_sap on public.sap_chapter_feedback(sap_id)","-- RLS
alter table public.sap_chapter_feedback enable row level security","-- SAP contacts can insert feedback
create policy \"SAP contacts can submit feedback\" on public.sap_chapter_feedback
  for insert with check (public.is_sap_contact())","-- SAP contacts can view their own feedback
create policy \"SAP contacts can view own feedback\" on public.sap_chapter_feedback
  for select using (
    sap_contact_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.sap_contact_id = sap_contact_id
    )
  )","-- Leadership can view all feedback
create policy \"Leadership can view all SAP feedback\" on public.sap_chapter_feedback
  for select using (public.is_admin() or public.is_super_admin())"}', 'sap_chapter_feedback');
INSERT INTO supabase_migrations.schema_migrations VALUES ('040', '{"-- 040_sap_event_engagements.sql
-- SAP partners can be invited to attend OR present at events.
-- Presenting involves logistics: topic, AV, run of show, materials.
-- One row per SAP contact per event.

create table if not exists public.sap_event_engagements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  role text not null default ''attending''
    check (role in (''attending'', ''presenting'')),
  -- Presenting logistics (filled by partner, reviewed by chapter)
  topic text default '''',
  topic_description text default '''',
  time_slot text default '''',
  run_of_show_notes text default '''',
  av_needs text default '''',
  materials_notes text default '''',
  materials_url text default '''',
  -- Engagement status
  status text not null default ''invited''
    check (status in (''invited'', ''confirmed'', ''declined'')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_sap_engagements_event on public.sap_event_engagements(event_id)","create index if not exists idx_sap_engagements_sap on public.sap_event_engagements(sap_id)","create index if not exists idx_sap_engagements_contact on public.sap_event_engagements(sap_contact_id)","-- RLS
alter table public.sap_event_engagements enable row level security","-- SAP contacts can view their own engagements
create policy \"SAP contacts can view own engagements\" on public.sap_event_engagements
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  )","-- SAP contacts can update their own engagements (logistics fields)
create policy \"SAP contacts can update own engagements\" on public.sap_event_engagements
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  )","-- Admins have full access
create policy \"Admins can manage engagements\" on public.sap_event_engagements
  for all using (public.is_admin() or public.is_super_admin())","-- Authenticated users can view engagements for open events
create policy \"Authenticated can view open event engagements\" on public.sap_event_engagements
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.open_to_saps = true
    )
  )"}', 'sap_event_engagements');
INSERT INTO supabase_migrations.schema_migrations VALUES ('050', '{"-- Significant Life Partners (SLPs).
--
-- One SLP per chapter member, linked to the member''s row. Captures the
-- info chapter staff need to plan SLP-attending events (Key Relationships
-- night, anniversaries, dietary needs).
--
-- Access model:
--   - Member can read/insert/update/delete their own SLP record
--   - Chapter admin (super_admin / president / president_elect / president_elect_elect /
--     chapter_executive_director / chapter_experience_coordinator /
--     learning_chair) can read/insert/update/delete any SLP in their chapter
--   - Nobody else can see SLP data
--
-- Idempotent: safe to re-run.

create table if not exists public.slps (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null unique references public.chapter_members(id) on delete cascade,
  name text not null default '''',
  relationship_type text not null default ''spouse'',
  dob date,
  anniversary date,
  kids text default '''',
  dietary_restrictions text default '''',
  allergies text default '''',
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_slps_chapter on public.slps(chapter_id)","create index if not exists idx_slps_member on public.slps(member_id)","-- RLS
alter table public.slps enable row level security","-- Helper: list of roles that count as \"chapter admin\" for SLP access.
-- Inlined here to avoid a separate function migration; matches the
-- canonical chapter-admin list with Learning Chair added per request.
create or replace function public.is_slp_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = ''super_admin''
      or (
        chapter_id = check_chapter_id
        and role in (
          ''president'',
          ''president_elect'',
          ''president_elect_elect'',
          ''learning_chair'',
          ''learning_chair_elect'',
          ''chapter_executive_director'',
          ''chapter_experience_coordinator''
        )
      )
    )
  );
$$ language sql security definer stable","drop policy if exists \"Member or admin can read SLP\" on public.slps","create policy \"Member or admin can read SLP\" on public.slps
  for select using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can insert SLP\" on public.slps","create policy \"Member or admin can insert SLP\" on public.slps
  for insert with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can update SLP\" on public.slps","create policy \"Member or admin can update SLP\" on public.slps
  for update using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  ) with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can delete SLP\" on public.slps","create policy \"Member or admin can delete SLP\" on public.slps
  for delete using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","notify pgrst, ''reload schema''"}', 'slps_table');
INSERT INTO supabase_migrations.schema_migrations VALUES ('056', '{"-- Cross-chapter speaker library sharing — V1.
--
-- Adds a per-speaker `share_scope` toggle. When set to ''global'', the
-- speaker becomes visible to other chapters via the Shared Library tab,
-- where they can fork a copy into their own chapter via \"Add to my
-- pipeline.\" The fork creates a fresh speakers row in the importing
-- chapter (bio/topic/contact/fee_range copied) plus a blank
-- speaker_pipeline entry for the importer''s active fiscal year.
--
-- Design notes:
--   - Forked copy model: importer gets their own row. No live reference
--     back. Importer has full sovereignty (edit, re-share, delete).
--   - Provenance: imported_from_speaker_id points back at the source
--     row for attribution + (future) \"check for updates\" UI.
--   - Source chapter name denormalized at share time onto
--     shared_chapter_name so the Shared Library can display it without
--     opening up cross-chapter chapters.* reads.
--   - Fee privacy flags (fee_estimated_private, fee_actual_private)
--     live on speaker_pipeline (FY-scoped) and are NOT involved in V1.
--     V1 does not aggregate cross-chapter pipeline data; only the
--     library entry (bio/topic/range) is shared. Cross-chapter pipeline
--     aggregation with privacy enforcement is a follow-up.
--
-- Idempotent: safe to re-run.

alter table public.speakers
  add column if not exists share_scope text not null default ''chapter_only''","-- Add CHECK separately (alter constraint isn''t if-not-exists; do it via DO block).
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = ''speakers_share_scope_check''
  ) then
    alter table public.speakers
      add constraint speakers_share_scope_check
      check (share_scope in (''chapter_only'', ''global''));
  end if;
end $$","alter table public.speakers
  add column if not exists shared_chapter_name text","alter table public.speakers
  add column if not exists imported_from_speaker_id uuid references public.speakers(id) on delete set null","create index if not exists idx_speakers_share_scope on public.speakers(share_scope) where share_scope = ''global''","-- Replace the chapter-scoped SELECT policy to also allow reading
-- globally-shared speakers from other chapters.
drop policy if exists \"Chapter scoped select speakers\" on public.speakers","drop policy if exists \"Speakers visible by chapter or global share\" on public.speakers","create policy \"Speakers visible by chapter or global share\" on public.speakers
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or share_scope = ''global''
  )","notify pgrst, ''reload schema''"}', 'speaker_global_sharing');
INSERT INTO supabase_migrations.schema_migrations VALUES ('057', '{"-- Drop stale CHECK constraint on events.strategic_importance.
--
-- The original constraint (from 001_add_app_tables.sql) allowed:
--   ''kickoff'', ''momentum'', ''renewal_critical'', ''sustain'', ''strong_close''
--
-- Over time the client vocabulary diverged from this. CalendarPage now
-- derives strategic_importance from STRATEGIC_MAP labels:
--   ''kickoff'', ''momentum'', ''no_event'', ''renewal'', ''sustain'', ''gratitude_gala''
--
-- Result: creating any event in February (RENEWAL), May (GRATITUDE
-- GALA), or December (NO EVENT) failed silently with
--   \"new row for relation ''events'' violates check constraint
--    events_strategic_importance_check\"
--
-- The local optimistic insert succeeded so the user saw the event in
-- their UI, but it never persisted to Supabase. Subsequent operations
-- on that \"zombie event\" silently fail.
--
-- Fix: drop the constraint. The field is informational metadata derived
-- from month_index via STRATEGIC_MAP and doesn''t need DB-level
-- validation. If validation becomes useful again later, a non-breaking
-- text-based check or enum can be reintroduced.
--
-- Idempotent: safe to re-run.

alter table public.events
  drop constraint if exists events_strategic_importance_check","notify pgrst, ''reload schema''"}', 'drop_events_strategic_importance_check');
INSERT INTO supabase_migrations.schema_migrations VALUES ('058', '{"-- ============================================================
-- 058 SMS-OTP sign-in (phone-based auth as parallel to email magic link)
-- ============================================================
-- Adds phone-based authentication so members can sign in via SMS one-time
-- passcode when email magic links are unreliable (corporate gateway
-- filtering, members on the road without inbox access, etc.).
--
-- Mirrors the email allowlist pattern: phone numbers populated on
-- public.member_invites act as the auth gate for the SMS-OTP path,
-- exactly as email does for the magic-link path.
--
-- Phone storage convention: digits only, no ''+'' prefix
-- (matches existing public.chapter_members.phone format, e.g. ''14802422455'').
-- Matching strips non-digits on both sides, so input format on the client
-- is forgiving.

-- ── 1. Add phone column to member_invites ───────────────────────────
alter table public.member_invites
  add column if not exists phone text","create index if not exists idx_member_invites_phone
  on public.member_invites (phone)
  where phone is not null and phone <> ''''","-- ── 2. Backfill from chapter_members ────────────────────────────────
-- Idempotent: only fills empty phone values, never overwrites.
update public.member_invites mi
set phone = regexp_replace(cm.phone, ''[^0-9]'', '''', ''g'')
from public.chapter_members cm
where lower(mi.email) = lower(cm.email)
  and cm.phone is not null
  and cm.phone <> ''''
  and (mi.phone is null or mi.phone = '''')","-- ── 3. is_invited_member: accept email OR phone ─────────────────────
-- Existing callers passing only check_email continue to work (named args).
create or replace function public.is_invited_member(
  check_email text default null,
  check_phone text default null
)
returns boolean as $$
  select exists (
    select 1 from public.member_invites
    where (
      check_email is not null
      and check_email <> ''''
      and lower(email) = lower(check_email)
    )
    or (
      check_phone is not null
      and check_phone <> ''''
      and phone is not null
      and phone <> ''''
      and regexp_replace(phone, ''[^0-9]'', '''', ''g'')
        = regexp_replace(check_phone, ''[^0-9]'', '''', ''g'')
    )
  );
$$ language sql security definer","-- ── 4. handle_new_user: support phone-only signups ──────────────────
-- Supabase phone auth creates auth.users with phone in E.164 (''+14802422455'')
-- and email NULL. We try email lookup first (preserves prior behavior for
-- magic-link signups), then fall back to a digits-only phone match.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  normalized_phone text;
begin
  normalized_phone := regexp_replace(coalesce(new.phone, ''''), ''[^0-9]'', '''', ''g'');

  if new.email is not null and new.email <> '''' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
  end if;

  if invite.id is null and normalized_phone <> '''' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''''
        and regexp_replace(phone, ''[^0-9]'', '''', ''g'') = normalized_phone
      limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    coalesce(nullif(new.email, ''''), invite.email, ''''),
    coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
    coalesce(invite.role, ''member''),
    coalesce(nullif(new.phone, ''''), invite.phone, '''')
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  return new;
end;
$$ language plpgsql security definer"}', 'phone_auth');
INSERT INTO supabase_migrations.schema_migrations VALUES ('059', '{"-- ============================================================
-- 059 Fix is_invited_member overload introduced by 058
-- ============================================================
-- Migration 058 added defaults to two arguments. PostgreSQL determines
-- function signatures by argument types only (defaults are ignored), so
-- the new is_invited_member(text, text) was created ALONGSIDE the
-- original is_invited_member(text) instead of replacing it.
--
-- Result: PostgREST receives a call like { check_email: ''...'' } and
-- finds two candidate functions (the old one matches exactly; the new
-- one matches via the default for check_phone). Resolution fails and
-- the RPC returns an error — which the LoginPage surfaces as
-- \"this email isn''t registered.\" Members get locked out.
--
-- Fix: drop the old single-arg signature. Only the dual-arg version
-- remains. Both email-only and phone-only calls then resolve cleanly.

drop function if exists public.is_invited_member(text)"}', 'fix_is_invited_member_overload');
INSERT INTO supabase_migrations.schema_migrations VALUES ('060', '{"-- ============================================================
-- 060 NANP-aware phone normalization in is_invited_member + trigger
-- ============================================================
-- chapter_members.phone (and the values backfilled into member_invites.phone
-- by 058) are inconsistent: some entries store 10 digits (''6027411075'')
-- and others store 11 with a leading ''1'' (''16268402799''). Both refer to
-- the same NANP (US/Canada) number.
--
-- The Supabase phone-OTP path delivers E.164 (''+16027411075'') which our
-- trigger digit-strips to 11 digits with a leading ''1''. Comparing this
-- to a 10-digit stored value fails — Celia''s number was backfilled but
-- couldn''t be matched at sign-in.
--
-- Fix: a small helper that strips a leading ''1'' from any 11-digit string
-- so all NANP variants normalize to the same 10-digit form. Non-NANP
-- international numbers (length != 11) pass through unchanged.

create or replace function public._normalize_phone(p text)
returns text as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p, ''''), ''[^0-9]'', '''', ''g'');
  if length(d) = 11 and substring(d, 1, 1) = ''1'' then
    d := substring(d, 2);
  end if;
  return d;
end;
$$ language plpgsql immutable","-- Replace the comparison logic in is_invited_member.
create or replace function public.is_invited_member(
  check_email text default null,
  check_phone text default null
)
returns boolean as $$
  select exists (
    select 1 from public.member_invites
    where (
      check_email is not null
      and check_email <> ''''
      and lower(email) = lower(check_email)
    )
    or (
      check_phone is not null
      and check_phone <> ''''
      and phone is not null
      and phone <> ''''
      and public._normalize_phone(phone) = public._normalize_phone(check_phone)
      and public._normalize_phone(check_phone) <> ''''
    )
  );
$$ language sql security definer","-- Same normalization in the new-user trigger so phone-OTP signups link
-- to the right invite regardless of stored format.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''''));

  if new.email is not null and new.email <> '''' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
  end if;

  if invite.id is null and normalized_phone <> '''' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    coalesce(nullif(new.email, ''''), invite.email, ''''),
    coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
    coalesce(invite.role, ''member''),
    coalesce(nullif(new.phone, ''''), invite.phone, '''')
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  return new;
end;
$$ language plpgsql security definer"}', 'phone_nanp_normalization');
INSERT INTO supabase_migrations.schema_migrations VALUES ('061', '{"-- ============================================================
-- 061 Fix handle_new_user record-not-assigned error on phone signup
-- ============================================================
-- Migration 060 left a PL/pgSQL bug: the email-match SELECT INTO is
-- inside an IF block that''s skipped on phone-only signups (when
-- new.email is null). That left the `invite` record unassigned, and
-- the subsequent `IF invite.id IS NULL` raised
-- \"record ''invite'' is not assigned yet | The tuple structure of a
-- not-yet-assigned record is indeterminate\" (SQLSTATE 55000).
--
-- GoTrue catches the trigger error and returns \"Database error saving
-- new user\" to the client. Both phone-OTP and any future email signup
-- path that fails to enter the email IF would hit this.
--
-- Fix: track success with a FOUND-style boolean instead of accessing
-- invite.id, and split the INSERT into matched/unmatched branches so
-- we never read invite fields when the record isn''t assigned.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''''));

  if coalesce(new.email, '''') <> '''' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  if not invite_found and normalized_phone <> '''' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), invite.email, ''''),
      coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
      coalesce(invite.role, ''member''),
      coalesce(nullif(new.phone, ''''), invite.phone, '''')
    );
    update public.member_invites set claimed_at = now() where id = invite.id;
  else
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), ''''),
      coalesce(new.raw_user_meta_data->>''full_name'', ''''),
      ''member'',
      coalesce(nullif(new.phone, ''''), '''')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer"}', 'handle_new_user_unassigned_record_fix');
INSERT INTO supabase_migrations.schema_migrations VALUES ('062', '{"-- Whitelist Melissa Groen (EO Arizona) in the auth allowlist.
-- Default role is ''member''; upgrade via admin UI if she needs more.
insert into public.member_invites (email, full_name, role, chapter_id)
values (
  ''melissa.groen@arizonaeo.com'',
  ''Melissa Groen'',
  ''member'',
  (select id from public.chapters where name = ''EO Arizona'')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id"}', 'whitelist_melissa_groen');
INSERT INTO supabase_migrations.schema_migrations VALUES ('063', '{"-- ============================================================
-- 063 Re-apply 050 (Significant Life Partners) DDL
-- ============================================================
-- Migration 050 was marked applied in the Supabase migration
-- tracker but the `public.slps` table was never actually created in
-- production (part of the 035/037-040/050 schema drift). Member
-- profile saves now fail with:
--   Could not find the table ''public.slps'' in the schema cache
--
-- 050''s DDL is fully idempotent (`create table if not exists`,
-- `create or replace function`, `drop policy if exists` + create).
-- Re-running it is safe everywhere the table already exists and
-- creates it where it doesn''t. Migration 063 is a verbatim re-run
-- of 050 so Supabase will actually execute the DDL this time.
-- ============================================================

create table if not exists public.slps (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null unique references public.chapter_members(id) on delete cascade,
  name text not null default '''',
  relationship_type text not null default ''spouse'',
  dob date,
  anniversary date,
  kids text default '''',
  dietary_restrictions text default '''',
  allergies text default '''',
  notes text default '''',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","create index if not exists idx_slps_chapter on public.slps(chapter_id)","create index if not exists idx_slps_member on public.slps(member_id)","alter table public.slps enable row level security","create or replace function public.is_slp_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = ''super_admin''
      or (
        chapter_id = check_chapter_id
        and role in (
          ''president'',
          ''president_elect'',
          ''president_elect_elect'',
          ''learning_chair'',
          ''learning_chair_elect'',
          ''chapter_executive_director'',
          ''chapter_experience_coordinator''
        )
      )
    )
  );
$$ language sql security definer stable","drop policy if exists \"Member or admin can read SLP\" on public.slps","create policy \"Member or admin can read SLP\" on public.slps
  for select using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can insert SLP\" on public.slps","create policy \"Member or admin can insert SLP\" on public.slps
  for insert with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can update SLP\" on public.slps","create policy \"Member or admin can update SLP\" on public.slps
  for update using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  ) with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","drop policy if exists \"Member or admin can delete SLP\" on public.slps","create policy \"Member or admin can delete SLP\" on public.slps
  for delete using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  )","notify pgrst, ''reload schema''"}', 'slps_table_recreate');
INSERT INTO supabase_migrations.schema_migrations VALUES ('064', '{"-- Restore super_admin to public.is_admin() and public.is_chapter_admin().
--
-- Migration 045 was supposed to add ''super_admin'' to is_admin()''s allowed-
-- role list, but it didn''t stick in production (schema drift — same pattern
-- as 035/037-040). Symptom: a super-admin creates a chapter via
-- ChapterConfigPage, invites a member, and the invite silently vanishes from
-- the \"Pending Invites\" section. The row IS in member_invites, but the
-- SELECT policy (\"for select using (public.is_admin())\") rejects the read
-- because is_admin() doesn''t recognize super_admin.
--
-- This migration re-runs 045 verbatim. Idempotent — CREATE OR REPLACE on
-- the same signature as the existing function, so no overload collision.

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      ''super_admin'',
      ''president'',
      ''finance_chair'',
      ''learning_chair'',
      ''engagement_chair'',
      ''chapter_experience_coordinator'',
      ''chapter_executive_director''
    )
  );
$$ language sql security definer stable","create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = ''super_admin''
      or (
        chapter_id = check_chapter_id
        and role in (
          ''president'',
          ''finance_chair'',
          ''learning_chair'',
          ''engagement_chair'',
          ''chapter_experience_coordinator'',
          ''chapter_executive_director''
        )
      )
    )
  );
$$ language sql security definer stable","notify pgrst, ''reload schema''"}', 'super_admin_is_admin_restore');
INSERT INTO supabase_migrations.schema_migrations VALUES ('065', '{"-- ============================================================
-- 065 Restore chapter_id linkage in handle_new_user + backfill
-- ============================================================
-- Regression: migration 060 rewrote handle_new_user to support phone OTP
-- signups, but dropped `chapter_id` from the INSERT into profiles.
-- Migration 061 fixed the \"record not assigned\" PL/pgSQL bug but carried
-- forward the same omission. Result: when an invited user signs up, their
-- profile is created with chapter_id = NULL even when the matched invite
-- has a chapter_id. Symptom: super-admin invites a Learning Chair to a
-- new chapter, user signs in, profile is orphaned (no chapter binding),
-- user doesn''t appear in the chapter''s Members table.
--
-- Fix has two parts:
--   1. Re-define handle_new_user to copy invite.chapter_id into the new
--      profile row (restoring behavior from migration 002).
--   2. Backfill any existing orphaned profiles whose email matches a
--      claimed invite — set profile.chapter_id from invite.chapter_id.
--
-- Idempotent: CREATE OR REPLACE and an UPDATE that only touches rows
-- where chapter_id is currently NULL. Safe to re-run.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''''));

  if coalesce(new.email, '''') <> '''' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  if not invite_found and normalized_phone <> '''' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), invite.email, ''''),
      coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
      coalesce(invite.role, ''member''),
      coalesce(nullif(new.phone, ''''), invite.phone, ''''),
      invite.chapter_id
    );
    update public.member_invites set claimed_at = now() where id = invite.id;
  else
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), ''''),
      coalesce(new.raw_user_meta_data->>''full_name'', ''''),
      ''member'',
      coalesce(nullif(new.phone, ''''), '''')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer","-- ── Backfill: fix orphaned profiles whose invite had a chapter_id ──
-- Only touches profiles where chapter_id is currently NULL, so safe
-- for users who have been manually reassigned.
update public.profiles p
set chapter_id = i.chapter_id
from public.member_invites i
where p.chapter_id is null
  and i.chapter_id is not null
  and lower(i.email) = lower(p.email)","notify pgrst, ''reload schema''"}', 'handle_new_user_chapter_id_restore');
INSERT INTO supabase_migrations.schema_migrations VALUES ('066', '{"-- ============================================================
-- 066 Regional Learning Chair Expert role + region field
-- ============================================================
-- Introduces the first regional-scoped role: a regional Learning Chair
-- Expert oversees all chapter-level Learning Chairs in a given region
-- (e.g. \"U.S. West\"). She has no chapter_id — she spans multiple — and
-- her dashboard aggregates across every chapter tagged with her region.
--
-- Changes:
--   1. chapters.region (text, nullable) — tag each chapter with a region.
--   2. profiles.region (text, nullable) — for regional-role users.
--   3. member_invites.region (text, nullable) — so an invite can carry
--      region metadata into the profile when the user signs up.
--   4. Add ''regional_learning_chair_expert'' to the role check constraints
--      on profiles and member_invites.
--   5. Update handle_new_user to copy invite.region into the new profile.
--   6. Helper function is_regional_learning_chair_expert_for(chapter_id)
--      returns true when the caller has that role AND their region matches
--      the chapter''s region. Intended for future cross-chapter read policies
--      (not added in this migration; existing SELECT policies on events /
--      speakers / chapters are already permissive enough for V1 demo).
--
-- Idempotent: all ADD COLUMN / CREATE OR REPLACE / constraint swaps are
-- re-runnable.

-- ── 1. chapters.region ─────────────────────────────────────────────
alter table public.chapters
  add column if not exists region text","-- ── 2. profiles.region ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists region text","-- ── 3. member_invites.region ───────────────────────────────────────
alter table public.member_invites
  add column if not exists region text","-- ── 4a. profiles.role constraint includes regional_learning_chair_expert
alter table public.profiles drop constraint if exists profiles_role_check","alter table public.profiles add constraint profiles_role_check
  check (role in (
    ''super_admin'',
    ''regional_learning_chair_expert'',
    ''president'',
    ''president_elect'',
    ''president_elect_elect'',
    ''finance_chair'',
    ''learning_chair'',
    ''learning_chair_elect'',
    ''engagement_chair'',
    ''sap_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","-- ── 4b. member_invites.role constraint matches
alter table public.member_invites drop constraint if exists member_invites_role_check","alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    ''super_admin'',
    ''regional_learning_chair_expert'',
    ''president'',
    ''president_elect'',
    ''president_elect_elect'',
    ''finance_chair'',
    ''learning_chair'',
    ''learning_chair_elect'',
    ''engagement_chair'',
    ''sap_chair'',
    ''chapter_experience_coordinator'',
    ''chapter_executive_director'',
    ''committee_member'',
    ''board_liaison'',
    ''member'',
    ''sap_contact'',
    ''demo_user''
  ))","-- ── 5. handle_new_user copies region from invite ──────────────────
-- Same shape as 065 but now also copies region from matched invite.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''''));

  if coalesce(new.email, '''') <> '''' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  if not invite_found and normalized_phone <> '''' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id, region)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), invite.email, ''''),
      coalesce(nullif(invite.full_name, ''''), new.raw_user_meta_data->>''full_name'', ''''),
      coalesce(invite.role, ''member''),
      coalesce(nullif(new.phone, ''''), invite.phone, ''''),
      invite.chapter_id,
      invite.region
    );
    update public.member_invites set claimed_at = now() where id = invite.id;
  else
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''''), ''''),
      coalesce(new.raw_user_meta_data->>''full_name'', ''''),
      ''member'',
      coalesce(nullif(new.phone, ''''), '''')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer","-- ── 6. Helper for future cross-chapter read policies ──────────────
-- Not yet used by any RLS policy — existing SELECT policies on events /
-- speakers / chapters are already permissive for authenticated users, so
-- V1 frontend can query directly. This helper is the building block for
-- tightening those policies later without losing regional access.
create or replace function public.is_regional_learning_chair_expert_for(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join public.chapters c on c.id = check_chapter_id
    where p.id = auth.uid()
      and p.role = ''regional_learning_chair_expert''
      and p.region is not null
      and p.region = c.region
  );
$$ language sql security definer stable","notify pgrst, ''reload schema''"}', 'regional_learning_chair_expert');
INSERT INTO supabase_migrations.schema_migrations VALUES ('067', '{"-- ============================================================
-- 067 Surface last_sign_in_at on profiles + sync trigger
-- ============================================================
-- Regional oversight roles (and platform admins on the super-admin
-- dashboard) want to see \"is this chair actually using the app?\"
-- auth.users.last_sign_in_at has the data; denormalize it to
-- public.profiles so the frontend can query it alongside role and
-- full_name in a single SELECT without punching through to auth.
--
-- Three parts:
--   1. Add profiles.last_sign_in_at (nullable timestamptz).
--   2. Sync trigger on auth.users that copies last_sign_in_at into
--      public.profiles whenever it changes (i.e. on every sign-in).
--   3. One-time backfill from auth.users so historical data is
--      present immediately, not just from the next sign-in forward.
--
-- Idempotent. The trigger uses CREATE OR REPLACE FUNCTION + a
-- DROP TRIGGER / CREATE TRIGGER pair so re-runs are safe.

alter table public.profiles
  add column if not exists last_sign_in_at timestamptz","create or replace function public.sync_profile_last_sign_in()
returns trigger as $$
begin
  -- Only fire when the value actually changes. Avoids redundant
  -- writes on UPDATE statements that touch other auth.users columns.
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles
    set last_sign_in_at = new.last_sign_in_at
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer","drop trigger if exists sync_profile_last_sign_in_trigger on auth.users","create trigger sync_profile_last_sign_in_trigger
  after update on auth.users
  for each row execute function public.sync_profile_last_sign_in()","-- Backfill: copy current auth.users.last_sign_in_at into profiles
-- for any profile where the column is still null.
update public.profiles p
set last_sign_in_at = u.last_sign_in_at
from auth.users u
where u.id = p.id
  and p.last_sign_in_at is null
  and u.last_sign_in_at is not null","notify pgrst, ''reload schema''"}', 'profiles_last_sign_in_at');


--
-- PostgreSQL database dump complete
--


