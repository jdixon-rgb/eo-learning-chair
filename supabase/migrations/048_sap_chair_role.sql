-- Add 'sap_chair' to allowed chapter-level roles.
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
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'president',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user'
  ));

-- ── 2. member_invites.role ────────────────────────────────────────
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'president',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user'
  ));

-- ── 3. is_admin() includes sap_chair ──────────────────────────────
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      'super_admin',
      'president',
      'finance_chair',
      'learning_chair',
      'engagement_chair',
      'sap_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

-- ── 4. is_chapter_admin() includes sap_chair ─────────────────────
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = 'super_admin'
      or (
        chapter_id = check_chapter_id
        and role in (
          'president',
          'finance_chair',
          'learning_chair',
          'engagement_chair',
          'sap_chair',
          'chapter_experience_coordinator',
          'chapter_executive_director'
        )
      )
    )
  );
$$ language sql security definer stable;

notify pgrst, 'reload schema';
