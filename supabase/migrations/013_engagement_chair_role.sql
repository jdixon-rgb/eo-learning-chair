-- 013_engagement_chair_role.sql
-- Adds the 'engagement_chair' role and grants it admin privileges
-- so it can manage navigators, pairings, resources, sessions, and compass_items.

-- ── 1. Add 'engagement_chair' to profiles role check ──────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- ── 2. Add 'engagement_chair' to member_invites role check ────
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- ── 3. Update is_admin() to include engagement_chair ──────────
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      'learning_chair',
      'engagement_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

-- ── 4. Update is_chapter_admin() to include engagement_chair ──
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (
      'learning_chair',
      'engagement_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

notify pgrst, 'reload schema';
