-- ============================================================
-- 096 At-risk members: broaden INSERT to all board roles
-- ============================================================
-- Originally (migration 086) the INSERT policy on
-- forum_at_risk_entries mirrored SELECT — only chapter admins
-- (super_admin, is_chapter_admin) + forum_health_chair +
-- forum_placement_chair could flag a member.
--
-- The new rule: any board-level chapter role can FLAG someone as
-- at-risk, but VIEW/UPDATE/DELETE stay narrow. So an Engagement
-- Chair or a President who notices a struggling member can drop
-- them into the ledger; the Forum Health Chair / Forum Placement
-- Chair / chapter admins are still the only ones who see, manage,
-- and resolve entries.
--
-- Roles eligible to flag (in the same chapter):
--   - super_admin (cross-chapter, always)
--   - president, president_elect, president_elect_elect
--   - finance_chair
--   - learning_chair, learning_chair_elect
--   - engagement_chair
--   - sap_chair
--   - forum_health_chair
--   - forum_placement_chair
--   - chapter_executive_director, chapter_experience_coordinator
--   - board_liaison
--   - committee_member
--
-- Deliberately excluded:
--   - slp_chair (scope is SLP-only, not member at-risk)
--   - regional_learning_chair_expert (cross-chapter, no chapter-level
--     member relationships)
--   - member, slp, sap_contact, demo_user (non-board)
--
-- Idempotent: safe to re-run.

-- ── 1. Helper: can_flag_at_risk(chapter_id) ─────────────────
-- Encapsulates the eligibility list so future RLS / app code can
-- reuse it without duplicating the role list.
create or replace function public.can_flag_at_risk(check_chapter_id uuid)
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
          'finance_chair',
          'learning_chair',
          'learning_chair_elect',
          'engagement_chair',
          'sap_chair',
          'forum_health_chair',
          'forum_placement_chair',
          'chapter_executive_director',
          'chapter_experience_coordinator',
          'board_liaison',
          'committee_member'
        )
      )
    )
  );
$$ language sql security definer stable;

-- ── 2. Replace INSERT policy ────────────────────────────────
-- SELECT / UPDATE / DELETE policies stay untouched (migration 086).
drop policy if exists "far_insert" on public.forum_at_risk_entries;
create policy "far_insert"
on public.forum_at_risk_entries for insert to authenticated
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_at_risk_entries.chapter_id
      and p.role in ('forum_health_chair', 'forum_placement_chair')
  )
  or public.can_flag_at_risk(chapter_id)
);

notify pgrst, 'reload schema';
