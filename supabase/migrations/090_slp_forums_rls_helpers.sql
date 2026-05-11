-- ============================================================
-- 090 SLP forums (Phase 1): RLS helpers
-- ============================================================
-- Companion to 089. Adds the auth-context helpers the SLP-personal
-- tables (091, 092) and SLP-aware app code rely on.
--
-- Design notes:
--   - SLPs identify by profile_id (set by the invite flow in 093),
--     NOT by email-join, so there is no ambiguity if an SLP and a
--     chapter_member happen to share an email.
--   - The "linked member must be active" rule is enforced in
--     current_slp_forum(): when a member's status flips away from
--     'active', the helper returns NULL and the SLP drops out of
--     every forum-scoped RLS check at once. No separate "soft
--     suspended" state is needed.
--   - We do not add an SLP path to current_member_forum() — keeping
--     the member-side helper untouched protects existing member RLS
--     from any regression.

-- ── 1. current_slp_id() ─────────────────────────────────────
-- Returns slps.id for the currently authenticated SLP, or NULL if
-- the auth user is not an SLP. Also returns NULL if the linked
-- chapter_member is no longer active — a stranded SLP gets no
-- forum access until the member re-joins and is re-invited.
create or replace function public.current_slp_id()
returns uuid as $$
  select s.id
  from public.slps s
  join public.chapter_members cm on cm.id = s.member_id
  where s.profile_id = auth.uid()
    and cm.status = 'active'
  limit 1;
$$ language sql security definer stable;

-- ── 2. current_slp_forum() ──────────────────────────────────
-- Returns the forum-name label for the currently authenticated SLP.
-- Mirrors current_member_forum() but sources from slps + enforces
-- the active-linked-member rule.
create or replace function public.current_slp_forum()
returns text as $$
  select s.forum
  from public.slps s
  join public.chapter_members cm on cm.id = s.member_id
  where s.profile_id = auth.uid()
    and cm.status = 'active'
  limit 1;
$$ language sql security definer stable;

-- ── 3. current_user_population() ────────────────────────────
-- Returns 'member' if the auth user has an active chapter_members
-- row, 'slp' if they have an active slps record, NULL otherwise.
-- Useful in app-layer routing and for any future polymorphic RLS;
-- not used by the SLP-personal tables (those check current_slp_id
-- directly for unambiguous, FK-backed access).
create or replace function public.current_user_population()
returns text as $$
  select case
    when public.current_slp_id() is not null then 'slp'
    when public.current_chapter_member_id() is not null then 'member'
    else null
  end;
$$ language sql security definer stable;

-- Forum-name uniqueness within a chapter is enforced at the app
-- layer on forum creation (ForumsPage Add Forum). We deliberately
-- do not add a DB-level unique index here because applying it to
-- staging/prod could fail on any pre-existing incidental dup, and
-- there is no real cross-population collision risk: collective
-- forum tables use forum_id FK; per-person legacy tables (parking
-- lot, reflections) are member-only and have parallel slp_* tables
-- for the SLP population, so the forum-text join is always single-
-- population in practice.

notify pgrst, 'reload schema';
