-- 018_forum_roles_and_home.sql
-- Forum role assignments (per-forum, per-fiscal-year) and supporting tables
-- for the forum home in the member portal.

-- ── 1. forum_role_assignments ─────────────────────────────────
-- Tracks who holds what role within each forum, per fiscal year.
-- Moderator pipeline: moderator → moderator_elect → moderator_elect_elect
-- Other roles: timer, technology, retreat_planner, social
-- A member can hold multiple roles (rare but possible), so no unique
-- constraint on (member + forum + year). One person per role per year though.
create table if not exists public.forum_role_assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  role text not null check (role in (
    'moderator',
    'moderator_elect',
    'moderator_elect_elect',
    'timer',
    'technology',
    'retreat_planner',
    'social'
  )),
  fiscal_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only one person per role per forum per year
  unique (forum_id, role, fiscal_year)
);

create index if not exists idx_fra_chapter on public.forum_role_assignments(chapter_id);
create index if not exists idx_fra_forum on public.forum_role_assignments(forum_id);
create index if not exists idx_fra_member on public.forum_role_assignments(chapter_member_id);
create index if not exists idx_fra_fy on public.forum_role_assignments(fiscal_year);

-- ── 2. forum_documents ────────────────────────────────────────
-- Uploaded documents for a forum (constitution, etc.)
create table if not exists public.forum_documents (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  title text not null,
  doc_type text not null default 'constitution' check (doc_type in ('constitution', 'other')),
  file_url text not null,
  file_name text default '',
  uploaded_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_docs_forum on public.forum_documents(forum_id);

-- ── 3. forum_calendar_events ──────────────────────────────────
-- Per-forum calendar (meetings, retreats, SAP visits, socials)
create table if not exists public.forum_calendar_events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null default 'meeting' check (event_type in (
    'meeting', 'retreat', 'sap_visit', 'social', 'other'
  )),
  location text default '',
  notes text default '',
  sap_id uuid references public.saps(id) on delete set null,
  fiscal_year text not null,
  created_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_cal_forum on public.forum_calendar_events(forum_id);
create index if not exists idx_forum_cal_date on public.forum_calendar_events(event_date);
create index if not exists idx_forum_cal_fy on public.forum_calendar_events(fiscal_year);

-- ── 4. sap_forum_interest ─────────────────────────────────────
-- Member-level interest signal: "I want to hear more about this SAP"
create table if not exists public.sap_forum_interest (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  interested boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sap_id, chapter_member_id)
);

create index if not exists idx_sap_interest_sap on public.sap_forum_interest(sap_id);
create index if not exists idx_sap_interest_forum on public.sap_forum_interest(forum_id);
create index if not exists idx_sap_interest_member on public.sap_forum_interest(chapter_member_id);

-- ── 5. sap_forum_ratings ──────────────────────────────────────
-- Anonymous per-member ratings of SAP partners (internal, for SAP Chair)
create table if not exists public.sap_forum_ratings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sap_id, chapter_member_id)
);

create index if not exists idx_sap_ratings_sap on public.sap_forum_ratings(sap_id);
create index if not exists idx_sap_ratings_forum on public.sap_forum_ratings(forum_id);

-- ── 6. forum_history_members ──────────────────────────────────
-- Archive of members who were once in the forum but have since left.
-- Founding members flagged separately.
create table if not exists public.forum_history_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  chapter_member_id uuid references public.chapter_members(id) on delete set null,
  member_name text not null,
  is_founding_member boolean not null default false,
  joined_year text default '',
  left_year text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_fhm_forum on public.forum_history_members(forum_id);

-- ── 7. Add founded_year to forums table ───────────────────────
alter table public.forums
  add column if not exists founded_year text default '';

-- ── 8. RLS ────────────────────────────────────────────────────
alter table public.forum_role_assignments enable row level security;
alter table public.forum_documents enable row level security;
alter table public.forum_calendar_events enable row level security;
alter table public.sap_forum_interest enable row level security;
alter table public.sap_forum_ratings enable row level security;
alter table public.forum_history_members enable row level security;

-- Forum role assignments: forum mates can view; moderator + admin can write
create policy "Anyone can view forum_role_assignments" on public.forum_role_assignments
  for select using (true);
create policy "Admins can manage forum_role_assignments" on public.forum_role_assignments
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_role_assignments" on public.forum_role_assignments
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_role_assignments" on public.forum_role_assignments
  for delete using (public.is_super_admin() or public.is_admin());

-- Forum documents: forum mates can view; moderator + admin can write
create policy "Anyone can view forum_documents" on public.forum_documents
  for select using (true);
create policy "Admins can manage forum_documents" on public.forum_documents
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_documents" on public.forum_documents
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_documents" on public.forum_documents
  for delete using (public.is_super_admin() or public.is_admin());

-- Forum calendar events: forum mates can view; moderator + admin can write
create policy "Anyone can view forum_calendar_events" on public.forum_calendar_events
  for select using (true);
create policy "Admins can manage forum_calendar_events" on public.forum_calendar_events
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_calendar_events" on public.forum_calendar_events
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_calendar_events" on public.forum_calendar_events
  for delete using (public.is_super_admin() or public.is_admin());

-- SAP interest: anyone can view; authenticated can insert/update their own
create policy "Anyone can view sap_forum_interest" on public.sap_forum_interest
  for select using (true);
create policy "Members can manage own sap_forum_interest" on public.sap_forum_interest
  for insert with check (
    chapter_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );
create policy "Members can update own sap_forum_interest" on public.sap_forum_interest
  for update using (
    chapter_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );

-- SAP ratings: admins + SAP chair can view all; members can manage own
create policy "Admins can view all sap_forum_ratings" on public.sap_forum_ratings
  for select using (public.is_super_admin() or public.is_admin());
create policy "Members can view own sap_forum_ratings" on public.sap_forum_ratings
  for select using (chapter_member_id = public.current_chapter_member_id());
create policy "Members can manage own sap_forum_ratings" on public.sap_forum_ratings
  for insert with check (
    chapter_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );
create policy "Members can update own sap_forum_ratings" on public.sap_forum_ratings
  for update using (
    chapter_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );

-- Forum history: anyone can view; admins can write
create policy "Anyone can view forum_history_members" on public.forum_history_members
  for select using (true);
create policy "Admins can manage forum_history_members" on public.forum_history_members
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_history_members" on public.forum_history_members
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_history_members" on public.forum_history_members
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
