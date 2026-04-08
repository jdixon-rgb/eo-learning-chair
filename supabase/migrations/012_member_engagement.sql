-- 012_member_engagement.sql
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
  status text not null default 'active' check (status in ('active', 'paused', 'retired')),
  retired_at timestamptz,
  bio text default '',
  max_concurrent_pairings int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, chapter_member_id)
);

create index if not exists idx_navigators_chapter on public.navigators(chapter_id);
create index if not exists idx_navigators_status on public.navigators(status);

-- ── 2. navigator_pairings ─────────────────────────────────────
-- A navigator-to-new-member relationship.
create table if not exists public.navigator_pairings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  navigator_id uuid not null references public.navigators(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cadence text not null default 'biweekly' check (cadence in ('weekly', 'biweekly', 'monthly', 'custom')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'reassigned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_navigator_pairings_chapter on public.navigator_pairings(chapter_id);
create index if not exists idx_navigator_pairings_navigator on public.navigator_pairings(navigator_id);
create index if not exists idx_navigator_pairings_member on public.navigator_pairings(member_id);
create index if not exists idx_navigator_pairings_status on public.navigator_pairings(status);

-- ── 3. navigator_resources ────────────────────────────────────
-- The Conversation Library: FAQs, "Ways to Get Value from EO" items,
-- talking points, etc. Curated by the Engagement Chair, contributed
-- to by tenured members and external coaches with attribution.
create table if not exists public.navigator_resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  summary text default '',
  body text default '',
  link_url text default '',
  category text not null default 'faq' check (category in (
    'faq',
    'university',
    'leadership_path',
    'seed_moderator_training',
    'moderator_training',
    'coaching',
    'next_level',
    'myeo_events',
    'international',
    'learning_calendar',
    'forum_journey',
    'other'
  )),
  contributor_name text default '',
  contributor_role text default '' check (contributor_role in ('', 'chair', 'tenured_member', 'external_coach')),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_navigator_resources_chapter on public.navigator_resources(chapter_id);
create index if not exists idx_navigator_resources_category on public.navigator_resources(category);
create index if not exists idx_navigator_resources_status on public.navigator_resources(status);

-- ── 4. navigator_sessions ─────────────────────────────────────
-- A logged touchpoint between navigator and new member.
-- Notes are private (navigator + chair only — enforced client-side for now).
create table if not exists public.navigator_sessions (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid not null references public.navigator_pairings(id) on delete cascade,
  session_date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_navigator_sessions_pairing on public.navigator_sessions(pairing_id);

-- ── 5. compass_items ──────────────────────────────────────────
-- THE SPINE. A single table that any chair module can write into.
-- Each row is one "thing" surfaced on a specific member's Compass.
-- source_type identifies which chair module produced it; source_ref
-- points back to the originating record (resource_id, event_id, etc).
-- Title/summary/link are denormalized so Compass keeps rendering even
-- if the source record is later edited — preserving the assigner's
-- intent at the moment of tagging.
create table if not exists public.compass_items (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  source_type text not null,
  source_ref uuid,
  title text not null,
  summary text default '',
  link_url text default '',
  assigned_by uuid references public.chapter_members(id) on delete set null,
  assigned_at timestamptz not null default now(),
  personal_note text default '',
  member_status text not null default 'new' check (member_status in ('new', 'interested', 'done', 'not_for_me')),
  member_status_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_compass_items_member on public.compass_items(member_id);
create index if not exists idx_compass_items_chapter on public.compass_items(chapter_id);
create index if not exists idx_compass_items_source on public.compass_items(source_type, source_ref);
create index if not exists idx_compass_items_status on public.compass_items(member_status);

-- ── 6. RLS ────────────────────────────────────────────────────
-- Match the existing permissive pattern in this codebase: anon can view,
-- admins can write. Tighten later (compass_items in particular has stronger
-- per-member privacy needs we should revisit before this is in real use).
alter table public.navigators enable row level security;
alter table public.navigator_pairings enable row level security;
alter table public.navigator_resources enable row level security;
alter table public.navigator_sessions enable row level security;
alter table public.compass_items enable row level security;

-- navigators
create policy "Anon can view navigators" on public.navigators
  for select using (true);
create policy "Admins can insert navigators" on public.navigators
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update navigators" on public.navigators
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete navigators" on public.navigators
  for delete using (public.is_super_admin() or public.is_admin());

-- navigator_pairings
create policy "Anon can view navigator_pairings" on public.navigator_pairings
  for select using (true);
create policy "Admins can insert navigator_pairings" on public.navigator_pairings
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update navigator_pairings" on public.navigator_pairings
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete navigator_pairings" on public.navigator_pairings
  for delete using (public.is_super_admin() or public.is_admin());

-- navigator_resources
create policy "Anon can view navigator_resources" on public.navigator_resources
  for select using (true);
create policy "Admins can insert navigator_resources" on public.navigator_resources
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update navigator_resources" on public.navigator_resources
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete navigator_resources" on public.navigator_resources
  for delete using (public.is_super_admin() or public.is_admin());

-- navigator_sessions
create policy "Anon can view navigator_sessions" on public.navigator_sessions
  for select using (true);
create policy "Admins can insert navigator_sessions" on public.navigator_sessions
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update navigator_sessions" on public.navigator_sessions
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete navigator_sessions" on public.navigator_sessions
  for delete using (public.is_super_admin() or public.is_admin());

-- compass_items
create policy "Anon can view compass_items" on public.compass_items
  for select using (true);
create policy "Admins can insert compass_items" on public.compass_items
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update compass_items" on public.compass_items
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete compass_items" on public.compass_items
  for delete using (public.is_super_admin() or public.is_admin());

-- ── 7. Reload PostgREST schema cache ──────────────────────────
notify pgrst, 'reload schema';
