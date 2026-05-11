-- ============================================================
-- 094 SLP Chair role
-- ============================================================
-- The SLP Chair runs the SLP forum program for a chapter. Unlike
-- every other chair, the SLP Chair is *not* an EO member — they
-- are an SLP (one row in public.slps) and their auth identity is
-- a profile with role='slp_chair'. There is no chapter_members
-- row for them, by design.
--
-- This migration:
--   1. Adds 'slp_chair' to profiles.role and member_invites.role
--      check constraints.
--   2. Extends is_slp_admin() to grant slp_chair admin access to
--      the slps table and other SLP-scoped surfaces — BUT only
--      when the chair's own slps record has an active linked
--      chapter_member. If the chair's partner leaves EO, the
--      chair role lapses (same rule we apply to ordinary SLPs).
--   3. Adds is_slp_chair() as a lightweight helper for app code.
--
-- Idempotent: safe to re-run.

-- ── 1. profiles.role + member_invites.role allow 'slp_chair' ──
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user',
    'slp',
    'slp_chair'
  ));

alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user',
    'slp',
    'slp_chair'
  ));

-- ── 2. is_slp_admin: include slp_chair with active-partner gate ──
-- The base list (super_admin, president track, CED, CEC, learning
-- chair / elect) is unchanged. We add an additional branch for
-- 'slp_chair' that requires the caller's slps row to have an
-- active linked member. Same chapter scope rule.
create or replace function public.is_slp_admin(check_chapter_id uuid)
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
          'president_elect',
          'president_elect_elect',
          'learning_chair',
          'learning_chair_elect',
          'chapter_executive_director',
          'chapter_experience_coordinator'
        )
      )
      or (
        role = 'slp_chair'
        and chapter_id = check_chapter_id
        and exists (
          select 1
          from public.slps s
          join public.chapter_members cm on cm.id = s.member_id
          where s.profile_id = auth.uid()
            and cm.status = 'active'
        )
      )
    )
  );
$$ language sql security definer stable;

-- ── 3. is_slp_chair() helper ─────────────────────────────────
-- Lightweight check for app/UI gating. Mirrors the slp_chair branch
-- of is_slp_admin: role match + active linked partner. Returns
-- false (not NULL) when there's no auth user.
create or replace function public.is_slp_chair()
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join public.slps s on s.profile_id = p.id
    join public.chapter_members cm on cm.id = s.member_id
    where p.id = auth.uid()
      and p.role = 'slp_chair'
      and cm.status = 'active'
  );
$$ language sql security definer stable;

notify pgrst, 'reload schema';
