-- Survey responses cross-tenant scoping fix.
--
-- BUG: survey_responses had no chapter_id column. The only read gate
-- was the broad "Admins can read all surveys" RLS policy, which used
-- public.is_admin() with no chapter scope. Result: any chapter admin
-- could see survey responses from members of OTHER chapters when they
-- opened Survey Results, and a super_admin viewing as a chair in
-- chapter X saw their own response (made in chapter Y) as if it were
-- a chapter-X member's response.
--
-- This violates the multi-tenant isolation guarantee that v1.48.0 /
-- migration 032 established for the rest of the schema.
--
-- Fix:
--   1. Add chapter_id column (denormalized for query speed).
--   2. Backfill from profiles.chapter_id where the user has one.
--   3. Replace the broad admin read policy with a chapter-scoped one.
--      Super_admin still sees all (cross-chapter support); regular
--      chapter admins see only their own chapter's responses.
--   4. Client (SurveyPage submit) writes chapter_id from the active
--      chapter context. Client (SurveyResultsPage) filters reads by
--      active chapter.
--
-- Idempotent: safe to re-run.

alter table public.survey_responses
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;

create index if not exists idx_survey_responses_chapter on public.survey_responses(chapter_id);

-- Backfill from profiles
update public.survey_responses sr
set chapter_id = p.chapter_id
from public.profiles p
where sr.user_id = p.id
  and sr.chapter_id is null
  and p.chapter_id is not null;

-- Replace the broad admin-read policy with chapter-scoped read.
drop policy if exists "Admins can read all surveys" on public.survey_responses;
drop policy if exists "Admins read own chapter surveys" on public.survey_responses;
create policy "Admins read own chapter surveys" on public.survey_responses
  for select using (
    public.is_super_admin()
    or (public.is_admin() and chapter_id = public.user_chapter_id())
  );

notify pgrst, 'reload schema';
