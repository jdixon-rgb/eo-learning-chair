-- 024_mentors.sql
-- Mentors: like Navigators but for any member at any tenure.
-- Managed by the Engagement Chair.

-- ── 1. mentors ───────────────────────────────────────────────
create table if not exists public.mentors (
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

create index if not exists idx_mentors_chapter on public.mentors(chapter_id);
create index if not exists idx_mentors_status on public.mentors(status);

-- ── 2. mentor_pairings ───────────────────────────────────────
create table if not exists public.mentor_pairings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cadence text not null default 'biweekly' check (cadence in ('weekly', 'biweekly', 'monthly', 'custom')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'reassigned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mentor_pairings_chapter on public.mentor_pairings(chapter_id);
create index if not exists idx_mentor_pairings_mentor on public.mentor_pairings(mentor_id);
create index if not exists idx_mentor_pairings_member on public.mentor_pairings(member_id);
create index if not exists idx_mentor_pairings_status on public.mentor_pairings(status);

-- ── 3. RLS ───────────────────────────────────────────────────
alter table public.mentors enable row level security;
alter table public.mentor_pairings enable row level security;

-- mentors
create policy "Anon can view mentors" on public.mentors
  for select using (true);
create policy "Admins can insert mentors" on public.mentors
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update mentors" on public.mentors
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete mentors" on public.mentors
  for delete using (public.is_super_admin() or public.is_admin());

-- mentor_pairings
create policy "Anon can view mentor_pairings" on public.mentor_pairings
  for select using (true);
create policy "Admins can insert mentor_pairings" on public.mentor_pairings
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update mentor_pairings" on public.mentor_pairings
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete mentor_pairings" on public.mentor_pairings
  for delete using (public.is_super_admin() or public.is_admin());

-- ── 4. Reload PostgREST schema cache ─────────────────────────
notify pgrst, 'reload schema';
