-- ============================================================
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
  chair_name text not null default '',
  submitted_by uuid references auth.users(id),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  highlights text default '',
  challenges text default '',
  metrics jsonb default '{}',
  next_month_plan text default '',
  board_notes text default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chair_reports_chapter on public.chair_reports(chapter_id);

-- Chapter Communications (messages sent to chapter members)
create table if not exists public.chapter_communications (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sent_by uuid references auth.users(id),
  subject text not null,
  body text not null,
  audience text not null default 'all_members' check (audience in ('all_members', 'board_only', 'chairs_only', 'custom')),
  audience_roles text[] default '{}',
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'both')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chapter_comms_chapter on public.chapter_communications(chapter_id);

-- Forums (EO forum/mastermind groups within a chapter)
create table if not exists public.forums (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  moderator_name text default '',
  moderator_email text default '',
  meeting_cadence text default 'monthly' check (meeting_cadence in ('weekly', 'biweekly', 'monthly')),
  member_count integer default 0,
  health_score integer check (health_score between 1 and 10),
  health_notes text default '',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forums_chapter on public.forums(chapter_id);

-- Member Scorecards (engagement tracking per member per period)
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
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_member_scorecards_chapter on public.member_scorecards(chapter_id);

-- ============================================================
-- 2. Enable RLS
-- ============================================================

alter table public.chair_reports enable row level security;
alter table public.chapter_communications enable row level security;
alter table public.forums enable row level security;
alter table public.member_scorecards enable row level security;

-- ============================================================
-- 3. Helper function
-- ============================================================

create or replace function public.is_board_member(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in ('board_liaison', 'learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director')
  );
$$ language sql security definer stable;

-- ============================================================
-- 4. RLS Policies - Chair Reports
-- ============================================================

create policy "Anon can view chair_reports" on public.chair_reports
  for select using (true);

create policy "Chapter scoped select chair_reports" on public.chair_reports
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Board can insert chair_reports" on public.chair_reports
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can update chair_reports" on public.chair_reports
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can delete chair_reports" on public.chair_reports
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

-- ============================================================
-- 5. RLS Policies - Chapter Communications
-- ============================================================

create policy "Anon can view chapter_communications" on public.chapter_communications
  for select using (true);

create policy "Chapter scoped select chapter_communications" on public.chapter_communications
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can insert chapter_communications" on public.chapter_communications
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can update chapter_communications" on public.chapter_communications
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can delete chapter_communications" on public.chapter_communications
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

-- ============================================================
-- 6. RLS Policies - Forums
-- ============================================================

create policy "Anon can view forums" on public.forums
  for select using (true);

create policy "Chapter scoped select forums" on public.forums
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Board can insert forums" on public.forums
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can update forums" on public.forums
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can delete forums" on public.forums
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

-- ============================================================
-- 7. RLS Policies - Member Scorecards
-- ============================================================

create policy "Anon can view member_scorecards" on public.member_scorecards
  for select using (true);

create policy "Chapter scoped select member_scorecards" on public.member_scorecards
  for select using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can insert member_scorecards" on public.member_scorecards
  for insert with check (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can update member_scorecards" on public.member_scorecards
  for update using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

create policy "Board can delete member_scorecards" on public.member_scorecards
  for delete using (
    public.is_super_admin()
    or public.is_board_member(chapter_id)
  );

-- ============================================================
-- 8. Reload PostgREST schema cache
-- ============================================================

notify pgrst, 'reload schema';
