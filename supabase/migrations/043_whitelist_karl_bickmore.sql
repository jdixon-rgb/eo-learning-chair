-- Whitelist Karl Bickmore (President Elect, EO Arizona).
--
-- Also widens member_invites + profiles role CHECK constraints to allow the
-- 'president_elect' role, because migration 035_sap_portal_auth.sql (which
-- originally added it) is not applied on all environments. Idempotent — safe
-- to run regardless of whether 035 ran.

alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'president',
    'president_elect',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'president',
    'president_elect',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

insert into public.member_invites (email, full_name, role, chapter_id)
values (
  'kbickmore@snaptechit.com',
  'Karl Bickmore',
  'president_elect',
  (select id from public.chapters where name = 'EO Arizona')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id;
