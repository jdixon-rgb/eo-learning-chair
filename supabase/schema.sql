-- ============================================================
-- EO Learning Chair Command Center — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database
-- ============================================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member'
    check (role in (
      'learning_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director',
      'committee_member',
      'board_liaison',
      'member'
    )),
  chapter_id uuid,
  avatar_url text,
  phone text,
  company text,
  eo_member_since integer,
  is_active boolean not null default true,
  survey_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Survey Responses (one row per member, typed columns for direct SQL querying)
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Section 1: Energy & Engagement
  energy_drivers text[] default '{}',
  format_ranking jsonb default '[]',
  topic_preferences text[] default '{}',
  -- Section 2: Growth Edge & Challenge
  disagreement_style text,
  conversation_role text,
  challenge_type text,
  friction_tolerance integer check (friction_tolerance between 1 and 5),
  -- Section 3: Affinity & Joy
  conversation_enjoyment text[] default '{}',
  natural_role text,
  environment_preferences text[] default '{}',
  -- Section 4: Perspective & Diversity
  underrepresented_perspectives text[] default '{}',
  opinion_formation_style text,
  -- Section 5: Open Signals
  strong_opinion_topic text,
  curiosity_topic text,
  waste_of_time_trigger text,
  -- Meta
  current_section integer not null default 1,
  is_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 3. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('event_announced', 'event_updated', 'event_reminder', 'survey_request', 'general')),
  title text not null,
  body text not null,
  event_id text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient
  on public.notifications(recipient_id, is_read, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.survey_responses enable row level security;
alter table public.notifications enable row level security;

-- Helper: check if requesting user is an admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director')
  );
$$ language sql security definer stable;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can update any profile" on public.profiles
  for update using (public.is_admin());

-- Survey policies
create policy "Users can manage own survey" on public.survey_responses
  for all using (auth.uid() = user_id);
create policy "Admins can read all surveys" on public.survey_responses
  for select using (public.is_admin());

-- Notification policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = recipient_id);
create policy "Admins can insert notifications" on public.notifications
  for insert with check (public.is_admin());
create policy "Admins can view all notifications" on public.notifications
  for select using (public.is_admin());
