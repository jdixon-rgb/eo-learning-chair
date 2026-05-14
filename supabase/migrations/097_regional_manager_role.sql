-- ============================================================
-- 097 Regional Manager role
-- ============================================================
-- Adds a new 'regional_manager' role for EO Global staff who
-- support chapters in their region. Read-only across chapters,
-- analogous to regional_learning_chair_expert but management-
-- oriented rather than learning-chair-specific. No chapter_id
-- on their profile (region-scoped, same pattern).
--
-- This migration:
--   1. Adds 'regional_manager' to the profiles.role and
--      member_invites.role check constraints. Idempotent (drops
--      the old constraint and re-adds with the broader list).
--
-- Permissions, nav, and UI surfacing live in app code:
--   - src/lib/permissions.js  (REGIONAL_ROLES + view perms)
--   - src/lib/chairRoles.js   (nav config)
--   - src/lib/chapter.jsx     (region-scoped chapter switcher)
--   - src/lib/auth.jsx        (effectiveRegion + role switching)
--   - src/lib/constants.js    (USER_ROLES list)

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'regional_manager',
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
    'regional_manager',
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

notify pgrst, 'reload schema';
