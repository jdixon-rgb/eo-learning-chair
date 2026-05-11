-- ============================================================
-- 089 SLP forums (Phase 1): schema additions
-- ============================================================
-- Significant Life Partners are a separate population from chapter
-- members. They get the same forum experience members do, but their
-- data lives in a parallel slice so the two populations never mix.
--
-- Design (memory: project_slp_forums):
--   1. Shared forum tables. `forums`, `forum_constitutions`,
--      `forum_health_assessments`, etc. stay one set of tables.
--   2. A new `forums.population` column scopes each forum row to one
--      population. Existing forums backfill to 'member'.
--   3. SLPs are already in `slps` (one row per chapter_members.id).
--      That table now grows a forum text label (mirrors
--      chapter_members.forum), plus the contact + auth-link fields
--      needed to invite SLPs into their own forum experience.
--
-- This migration is schema-only. RLS extensions live in 090.
-- Idempotent: safe to re-run.

-- ── 1. forums.population ────────────────────────────────────
alter table public.forums
  add column if not exists population text not null default 'member';

-- Drop and recreate the check so the constraint name is predictable
-- and the migration is safe to re-run with a changed allow-list.
alter table public.forums drop constraint if exists forums_population_check;
alter table public.forums
  add constraint forums_population_check
  check (population in ('member', 'slp'));

create index if not exists idx_forums_chapter_population
  on public.forums(chapter_id, population);

-- ── 2. slps.forum / email / phone / profile_id ──────────────
-- forum: text label mirroring chapter_members.forum. Empty string
-- means "not assigned to a forum yet." Matched against forums.name
-- (case-insensitive in app code) the same way the member side works.
alter table public.slps
  add column if not exists forum text not null default '';

-- email + phone: contact info for the SLP. Used by the invite flow
-- (093) to create an auth identity. Nullable because not every SLP
-- record will have these — members can keep an SLP-on-file purely
-- for chapter staff planning purposes (Key Relationships night,
-- dietary, etc.) without ever inviting the SLP into the app.
alter table public.slps
  add column if not exists email text;
alter table public.slps
  add column if not exists phone text;

-- profile_id: links an SLP record to its auth identity once the
-- invite is accepted. Nullable until accepted. profiles.id mirrors
-- auth.users.id in this app, so helpers can compare to auth.uid().
-- ON DELETE SET NULL: if the auth identity is later wiped, we keep
-- the SLP record (it still serves chapter staff for planning) but
-- the SLP loses login until re-invited.
alter table public.slps
  add column if not exists profile_id uuid
  references public.profiles(id) on delete set null;

-- invited_at / invite_status: lightweight tracking so the member's
-- profile SLP card can show "Invited Mar 12" or "Active" / "Pending".
alter table public.slps
  add column if not exists invited_at timestamptz;

alter table public.slps drop constraint if exists slps_invite_status_check;
alter table public.slps
  add column if not exists invite_status text not null default 'not_invited';
alter table public.slps
  add constraint slps_invite_status_check
  check (invite_status in ('not_invited', 'pending', 'active', 'revoked'));

create index if not exists idx_slps_forum
  on public.slps(forum);
create index if not exists idx_slps_profile
  on public.slps(profile_id);
create unique index if not exists ux_slps_email_lower
  on public.slps(lower(email)) where email is not null and email <> '';

-- ── 3. Reload PostgREST schema cache ────────────────────────
notify pgrst, 'reload schema';
