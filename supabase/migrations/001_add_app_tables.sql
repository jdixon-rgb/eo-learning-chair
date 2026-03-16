-- ============================================================
-- EO Learning Chair — App Data Tables
-- Run this AFTER schema.sql (which creates auth tables)
-- ============================================================

-- 1. Chapters
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fiscal_year_start integer not null check (fiscal_year_start between 1 and 12),
  total_budget integer not null default 0,
  president_theme text default '',
  president_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Link profiles to chapters (column already exists, just add FK)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'fk_profiles_chapter'
  ) then
    alter table public.profiles
      add constraint fk_profiles_chapter
      foreign key (chapter_id) references public.chapters(id);
  end if;
end $$;

-- 2. Venues
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  address text default '',
  capacity integer,
  base_rental_cost integer,
  av_quality text check (av_quality in ('excellent', 'good', 'fair', 'byob')),
  av_cost_estimate integer,
  venue_type text check (venue_type in ('hotel', 'museum', 'outdoor', 'restaurant', 'private', 'other')),
  pipeline_stage text not null check (pipeline_stage in ('researching', 'quote_requested', 'site_visit', 'negotiating', 'contract', 'confirmed')),
  staff_rating integer check (staff_rating between 1 and 5),
  image_url text,
  description text default '',
  notes text default '',
  contact_name text default '',
  contact_email text default '',
  contact_phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Speakers
create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  topic text default '',
  bio text default '',
  fee_range_low integer,
  fee_range_high integer,
  fee_estimated integer,
  fee_actual integer,
  contact_email text default '',
  contact_phone text default '',
  agency_name text default '',
  agency_contact text default '',
  contact_method text check (contact_method in ('direct', 'agency', 'linkedin', 'referral')),
  pipeline_stage text not null check (pipeline_stage in ('researching', 'outreach', 'negotiating', 'contracted', 'confirmed', 'passed')),
  fit_score integer check (fit_score between 1 and 10),
  notes text default '',
  sizzle_reel_url text default '',
  routing_flexibility boolean default false,
  multi_chapter_interest boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Strategic Alliance Partners (SAPs)
create table if not exists public.saps (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  company text default '',
  role text default '',
  description text default '',
  contribution_type text check (contribution_type in ('workshop', 'sponsorship', 'service', 'other')),
  contribution_description text default '',
  contact_email text default '',
  contact_phone text default '',
  annual_sponsorship integer,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  event_date date,
  event_time text,
  month_index integer check (month_index between 0 and 9),
  event_type text check (event_type in ('traditional', 'experiential', 'social', 'key_relationships')),
  event_format text check (event_format in ('keynote', 'workshop_2hr', 'workshop_4hr', 'workshop_8hr', 'tour', 'dinner')),
  strategic_importance text check (strategic_importance in ('kickoff', 'momentum', 'renewal_critical', 'sustain', 'strong_close')),
  status text not null default 'planning' check (status in ('planning', 'speaker_confirmed', 'venue_confirmed', 'fully_confirmed', 'marketing', 'completed', 'cancelled')),
  speaker_id uuid references public.speakers(id) on delete set null,
  candidate_speaker_ids uuid[] default '{}',
  sap_ids uuid[] default '{}',
  venue_id uuid references public.venues(id) on delete set null,
  day_chair_name text default '',
  day_chair_phone text default '',
  expected_attendance integer,
  actual_attendance integer,
  nps_score numeric(3,1),
  nps_top_takeaway text,
  theme_connection text default '',
  notes text default '',
  title_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Budget Items
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null check (category in ('speaker_fee', 'food_beverage', 'venue_rental', 'av_production', 'travel', 'marketing', 'other')),
  description text default '',
  estimated_amount integer default 0,
  actual_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_budget_items_event on public.budget_items(event_id);

-- 7. Contract Checklists (one per event)
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
  contract_notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Scenarios (what-if planning)
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  overrides jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.chapters enable row level security;
alter table public.venues enable row level security;
alter table public.speakers enable row level security;
alter table public.saps enable row level security;
alter table public.events enable row level security;
alter table public.budget_items enable row level security;
alter table public.contract_checklists enable row level security;
alter table public.scenarios enable row level security;

-- Authenticated users can read all app data
-- Admins (learning_chair, CEC, CED) can write

-- Chapters
create policy "Authenticated users can view chapters" on public.chapters
  for select using (auth.uid() is not null);
create policy "Admins can insert chapters" on public.chapters
  for insert with check (public.is_admin());
create policy "Admins can update chapters" on public.chapters
  for update using (public.is_admin());
create policy "Admins can delete chapters" on public.chapters
  for delete using (public.is_admin());

-- Venues
create policy "Authenticated users can view venues" on public.venues
  for select using (auth.uid() is not null);
create policy "Admins can insert venues" on public.venues
  for insert with check (public.is_admin());
create policy "Admins can update venues" on public.venues
  for update using (public.is_admin());
create policy "Admins can delete venues" on public.venues
  for delete using (public.is_admin());

-- Speakers
create policy "Authenticated users can view speakers" on public.speakers
  for select using (auth.uid() is not null);
create policy "Admins can insert speakers" on public.speakers
  for insert with check (public.is_admin());
create policy "Admins can update speakers" on public.speakers
  for update using (public.is_admin());
create policy "Admins can delete speakers" on public.speakers
  for delete using (public.is_admin());

-- SAPs
create policy "Authenticated users can view saps" on public.saps
  for select using (auth.uid() is not null);
create policy "Admins can insert saps" on public.saps
  for insert with check (public.is_admin());
create policy "Admins can update saps" on public.saps
  for update using (public.is_admin());
create policy "Admins can delete saps" on public.saps
  for delete using (public.is_admin());

-- Events
create policy "Authenticated users can view events" on public.events
  for select using (auth.uid() is not null);
create policy "Admins can insert events" on public.events
  for insert with check (public.is_admin());
create policy "Admins can update events" on public.events
  for update using (public.is_admin());
create policy "Admins can delete events" on public.events
  for delete using (public.is_admin());

-- Budget Items
create policy "Authenticated users can view budget_items" on public.budget_items
  for select using (auth.uid() is not null);
create policy "Admins can insert budget_items" on public.budget_items
  for insert with check (public.is_admin());
create policy "Admins can update budget_items" on public.budget_items
  for update using (public.is_admin());
create policy "Admins can delete budget_items" on public.budget_items
  for delete using (public.is_admin());

-- Contract Checklists
create policy "Authenticated users can view contract_checklists" on public.contract_checklists
  for select using (auth.uid() is not null);
create policy "Admins can insert contract_checklists" on public.contract_checklists
  for insert with check (public.is_admin());
create policy "Admins can update contract_checklists" on public.contract_checklists
  for update using (public.is_admin());
create policy "Admins can delete contract_checklists" on public.contract_checklists
  for delete using (public.is_admin());

-- Scenarios
create policy "Authenticated users can view scenarios" on public.scenarios
  for select using (auth.uid() is not null);
create policy "Admins can insert scenarios" on public.scenarios
  for insert with check (public.is_admin());
create policy "Admins can update scenarios" on public.scenarios
  for update using (public.is_admin());
create policy "Admins can delete scenarios" on public.scenarios
  for delete using (public.is_admin());
