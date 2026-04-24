-- Restore super_admin to public.is_admin() and public.is_chapter_admin().
--
-- Migration 045 was supposed to add 'super_admin' to is_admin()'s allowed-
-- role list, but it didn't stick in production (schema drift — same pattern
-- as 035/037-040). Symptom: a super-admin creates a chapter via
-- ChapterConfigPage, invites a member, and the invite silently vanishes from
-- the "Pending Invites" section. The row IS in member_invites, but the
-- SELECT policy ("for select using (public.is_admin())") rejects the read
-- because is_admin() doesn't recognize super_admin.
--
-- This migration re-runs 045 verbatim. Idempotent — CREATE OR REPLACE on
-- the same signature as the existing function, so no overload collision.

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
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

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
          'chapter_experience_coordinator',
          'chapter_executive_director'
        )
      )
    )
  );
$$ language sql security definer stable;

notify pgrst, 'reload schema';
