-- Fix: public.is_admin() was missing 'super_admin' in its allowed-roles list.
-- Every RLS policy using is_admin() (member_invites insert/delete/select,
-- and others) was silently rejecting super-admin actions — the bug only
-- surfaced when a super-admin tried to create a chapter and directly invite
-- a Learning Chair via ChapterConfigPage. Previous workflows used the
-- upsertStaffInvite RPC (security definer) which bypassed RLS, so nobody
-- noticed until now.
--
-- Also fixes is_chapter_admin() to give super_admin a global bypass:
-- super-admins oversee every chapter, so the chapter_id comparison should
-- not gate them.
--
-- Idempotent: re-runnable.

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
