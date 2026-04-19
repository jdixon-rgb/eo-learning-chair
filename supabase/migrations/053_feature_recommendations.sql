-- Feature recommendations module — Learning Chair scope.
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
-- Surface field is hardcoded to 'learning_chair' for v1; future PRs
-- can extend to other chair surfaces (engagement, finance, etc.) by
-- adding submission rights for those roles.
--
-- Idempotent: safe to re-run.

create table if not exists public.feature_recommendations (
  id uuid primary key default gen_random_uuid(),
  surface text not null default 'learning_chair',          -- which chair area this targets
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  submitted_by_chapter_id uuid references public.chapters(id) on delete set null,
  submitter_name text default '',                          -- snapshot for display if user is later removed
  submitter_chapter_name text default '',                  -- snapshot
  title text not null,
  body text not null default '',
  effort text check (effort is null or effort in ('easy','medium','difficult')),
  status text not null default 'open'
    check (status in ('open','in_progress','shipped','closed','duplicate')),
  shipped_in_version text,
  shipped_at timestamptz,
  duplicate_of uuid references public.feature_recommendations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_recs_surface on public.feature_recommendations(surface);
create index if not exists idx_feature_recs_status on public.feature_recommendations(status);

create table if not exists public.feature_recommendation_votes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.feature_recommendations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recommendation_id, user_id)
);

create index if not exists idx_feature_rec_votes_rec on public.feature_recommendation_votes(recommendation_id);

-- RLS
alter table public.feature_recommendations enable row level security;
alter table public.feature_recommendation_votes enable row level security;

-- Anyone authenticated can read (cross-chapter visibility).
drop policy if exists "auth reads recommendations" on public.feature_recommendations;
create policy "auth reads recommendations" on public.feature_recommendations
  for select to authenticated
  using (true);

-- Helper: is this user allowed to submit/vote on Learning Chair recommendations?
create or replace function public.can_submit_lc_recommendations()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('learning_chair','learning_chair_elect','super_admin')
  );
$$;

grant execute on function public.can_submit_lc_recommendations() to authenticated;

-- Insert: only LCs (and super_admin) can submit, and only for their own user_id.
drop policy if exists "lc submits recommendations" on public.feature_recommendations;
create policy "lc submits recommendations" on public.feature_recommendations
  for insert to authenticated
  with check (
    public.can_submit_lc_recommendations()
    and submitted_by_user_id = auth.uid()
  );

-- Update: only super_admin (effort, status, shipped_in_version, etc.).
drop policy if exists "super admin updates recommendations" on public.feature_recommendations;
create policy "super admin updates recommendations" on public.feature_recommendations
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Delete: super_admin or own submission.
drop policy if exists "delete own or super admin" on public.feature_recommendations;
create policy "delete own or super admin" on public.feature_recommendations
  for delete to authenticated
  using (public.is_super_admin() or submitted_by_user_id = auth.uid());

-- Votes: anyone authenticated can read.
drop policy if exists "auth reads recommendation votes" on public.feature_recommendation_votes;
create policy "auth reads recommendation votes" on public.feature_recommendation_votes
  for select to authenticated
  using (true);

-- Insert: same gate as submission (LCs + super_admin), and user_id must be self.
drop policy if exists "lc votes recommendations" on public.feature_recommendation_votes;
create policy "lc votes recommendations" on public.feature_recommendation_votes
  for insert to authenticated
  with check (
    public.can_submit_lc_recommendations()
    and user_id = auth.uid()
  );

-- Delete own vote (toggle off).
drop policy if exists "delete own vote" on public.feature_recommendation_votes;
create policy "delete own vote" on public.feature_recommendation_votes
  for delete to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
