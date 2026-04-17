-- Add 'demo_user' to allowed app roles.
--
-- A demo_user is an account provisioned by a super-admin (via Settings →
-- Demo Users) so external stakeholders — regional chairs, global chairs,
-- board members, prospective buyers — can self-serve through the demo
-- without being on a screenshare. The client-side auth layer locks a
-- demo_user session permanently into Mock Mode, so they never read or write
-- real chapter data regardless of what URL they hit.
--
-- We add the role to both constraints:
--   1. profiles.role — controls what a claimed account can be
--   2. member_invites.role — controls what roles can be pre-seeded in the
--      allowlist before someone accepts a magic-link invite
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
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user'
  ));

notify pgrst, 'reload schema';
