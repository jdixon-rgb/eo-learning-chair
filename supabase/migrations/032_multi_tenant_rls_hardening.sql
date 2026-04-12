-- 032_multi_tenant_rls_hardening.sql
-- Multi-tenant RLS hardening: close cross-chapter data leaks.
--
-- PROBLEM: 30+ tables use "Anon can view X" / "Anyone can view X" with
-- `using (true)` for SELECT. Since both PERMISSIVE policies OR together,
-- the chapter-scoped policies that DO exist are meaningless — the anon
-- policy always passes first. Any authenticated user from any chapter can
-- read every other chapter's data via raw Supabase calls.
--
-- FIX: Drop every permissive `using (true)` SELECT policy on tenant-owned
-- tables. For tables that already have a chapter-scoped SELECT policy,
-- that becomes the sole gate. For tables that don't, create one.
--
-- GLOBAL REFERENCE tables (no chapter_id, intentionally shared) are NOT
-- touched: reflection_feelings, reflection_templates.
--
-- ALREADY PROPERLY SCOPED tables are NOT touched: parking_lot_entries,
-- reflections, life_events, member_private, notifications, profile_checkins,
-- profiles, sap_forum_ratings.

-- ════════════════════════════════════════════════════════════════
-- GROUP 1: Tables with BOTH an "Anon" policy AND a chapter-scoped
--          SELECT policy. Just drop the anon one — the scoped one
--          becomes the sole gate.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "Anon can view chair_reports" on public.chair_reports;
drop policy if exists "Anon can view chapter_communications" on public.chapter_communications;
drop policy if exists "Anon can view forums" on public.forums;
drop policy if exists "Anon can view member_scorecards" on public.member_scorecards;
drop policy if exists "Anon can view events" on public.events;
drop policy if exists "Anon can view venues" on public.venues;
drop policy if exists "Anon can view speakers" on public.speakers;
drop policy if exists "Anon can view saps" on public.saps;
drop policy if exists "Anon can view scenarios" on public.scenarios;
drop policy if exists "Anon can view budget_items" on public.budget_items;
drop policy if exists "Anon can view contract_checklists" on public.contract_checklists;

-- chapters: drop the anon policy, keep "Users can view own chapter"
drop policy if exists "Anon can view chapters" on public.chapters;

-- ════════════════════════════════════════════════════════════════
-- GROUP 2: Tables with ONLY an "Anon/Anyone" using(true) SELECT
--          policy and a direct chapter_id column.
--          Drop the old, create chapter-scoped replacement.
-- ════════════════════════════════════════════════════════════════

-- chapter_members
drop policy if exists "Anon can view chapter_members" on public.chapter_members;
create policy "Chapter scoped select chapter_members" on public.chapter_members
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- chapter_roles
drop policy if exists "Anon can view chapter_roles" on public.chapter_roles;
create policy "Chapter scoped select chapter_roles" on public.chapter_roles
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- role_assignments
drop policy if exists "Anon can view role_assignments" on public.role_assignments;
create policy "Chapter scoped select role_assignments" on public.role_assignments
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- compass_items
drop policy if exists "Anon can view compass_items" on public.compass_items;
create policy "Chapter scoped select compass_items" on public.compass_items
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- navigators
drop policy if exists "Anon can view navigators" on public.navigators;
create policy "Chapter scoped select navigators" on public.navigators
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- navigator_pairings
drop policy if exists "Anon can view navigator_pairings" on public.navigator_pairings;
create policy "Chapter scoped select navigator_pairings" on public.navigator_pairings
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- navigator_resources
drop policy if exists "Anon can view navigator_resources" on public.navigator_resources;
create policy "Chapter scoped select navigator_resources" on public.navigator_resources
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- navigator_broadcasts
drop policy if exists "Anon can view navigator_broadcasts" on public.navigator_broadcasts;
create policy "Chapter scoped select navigator_broadcasts" on public.navigator_broadcasts
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- mentors
drop policy if exists "Anon can view mentors" on public.mentors;
create policy "Chapter scoped select mentors" on public.mentors
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- mentor_pairings
drop policy if exists "Anon can view mentor_pairings" on public.mentor_pairings;
create policy "Chapter scoped select mentor_pairings" on public.mentor_pairings
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_agendas
drop policy if exists "Anyone can view forum_agendas" on public.forum_agendas;
create policy "Chapter scoped select forum_agendas" on public.forum_agendas
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_calendar_events
drop policy if exists "Anyone can view forum_calendar_events" on public.forum_calendar_events;
create policy "Chapter scoped select forum_calendar_events" on public.forum_calendar_events
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_constitutions
drop policy if exists "Anon can view forum_constitutions" on public.forum_constitutions;
create policy "Chapter scoped select forum_constitutions" on public.forum_constitutions
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_constitution_versions
drop policy if exists "Anon can view forum_constitution_versions" on public.forum_constitution_versions;
create policy "Chapter scoped select forum_constitution_versions" on public.forum_constitution_versions
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_constitution_ratifications
drop policy if exists "Anon can view forum_constitution_ratifications" on public.forum_constitution_ratifications;
create policy "Chapter scoped select forum_constitution_ratifications" on public.forum_constitution_ratifications
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_documents
drop policy if exists "Anyone can view forum_documents" on public.forum_documents;
create policy "Chapter scoped select forum_documents" on public.forum_documents
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_history_members
drop policy if exists "Anyone can view forum_history_members" on public.forum_history_members;
create policy "Chapter scoped select forum_history_members" on public.forum_history_members
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- forum_role_assignments
drop policy if exists "Anyone can view forum_role_assignments" on public.forum_role_assignments;
create policy "Chapter scoped select forum_role_assignments" on public.forum_role_assignments
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- sap_forum_interest
drop policy if exists "Anyone can view sap_forum_interest" on public.sap_forum_interest;
create policy "Chapter scoped select sap_forum_interest" on public.sap_forum_interest
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- speaker_pipeline
drop policy if exists "Anon can read speaker_pipeline" on public.speaker_pipeline;
create policy "Chapter scoped select speaker_pipeline" on public.speaker_pipeline
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- event_documents
drop policy if exists "Anon can view event_documents" on public.event_documents;
create policy "Chapter scoped select event_documents" on public.event_documents
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- fiscal_year_budgets
drop policy if exists "Anon can read fiscal_year_budgets" on public.fiscal_year_budgets;
create policy "Chapter scoped select fiscal_year_budgets" on public.fiscal_year_budgets
  for select using (public.is_super_admin() or chapter_id = public.user_chapter_id());

-- ════════════════════════════════════════════════════════════════
-- GROUP 3: Child tables WITHOUT a direct chapter_id column.
--          Drop the old, create policy via EXISTS subquery on parent.
-- ════════════════════════════════════════════════════════════════

-- navigator_sessions (parent: navigator_pairings via pairing_id)
drop policy if exists "Anon can view navigator_sessions" on public.navigator_sessions;
create policy "Chapter scoped select navigator_sessions" on public.navigator_sessions
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.navigator_pairings np
      where np.id = navigator_sessions.pairing_id
        and np.chapter_id = public.user_chapter_id()
    )
  );

-- navigator_broadcast_responses (parent: navigator_broadcasts via broadcast_id)
drop policy if exists "Anon can view navigator_broadcast_responses" on public.navigator_broadcast_responses;
create policy "Chapter scoped select navigator_broadcast_responses" on public.navigator_broadcast_responses
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.navigator_broadcasts nb
      where nb.id = navigator_broadcast_responses.broadcast_id
        and nb.chapter_id = public.user_chapter_id()
    )
  );

-- forum_agenda_items (parent: forum_agendas via agenda_id)
drop policy if exists "Anyone can view forum_agenda_items" on public.forum_agenda_items;
create policy "Chapter scoped select forum_agenda_items" on public.forum_agenda_items
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.forum_agendas fa
      where fa.id = forum_agenda_items.agenda_id
        and fa.chapter_id = public.user_chapter_id()
    )
  );

-- fiscal_year_budget_lines (parent: fiscal_year_budgets via fiscal_year_budget_id)
drop policy if exists "Anon can read fiscal_year_budget_lines" on public.fiscal_year_budget_lines;
create policy "Chapter scoped select fiscal_year_budget_lines" on public.fiscal_year_budget_lines
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.fiscal_year_budgets fyb
      where fyb.id = fiscal_year_budget_lines.fiscal_year_budget_id
        and fyb.chapter_id = public.user_chapter_id()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache
-- ════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';
