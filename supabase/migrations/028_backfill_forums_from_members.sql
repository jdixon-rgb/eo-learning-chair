-- 028_backfill_forums_from_members.sql
-- Backfill public.forums with a row for every distinct (chapter_id, forum)
-- combination present in public.chapter_members that doesn't already have one.
--
-- Why: Forum-scoped tables (forum_agendas, forum_calendar_events, forum_documents,
-- forum_constitutions, etc.) reference forums.id as a FK. When a member's
-- chapter_members.forum text doesn't have a matching row in forums, the client
-- can't resolve a forum_id — and every forum_id-scoped query silently returns
-- empty for that member. This shipped as a "non-moderator Agenda tab is empty"
-- bug discovered during a live demo.
--
-- This migration is idempotent and safe to re-run.

insert into public.forums (chapter_id, name, is_active, created_at, updated_at)
select distinct
  cm.chapter_id,
  cm.forum as name,
  true as is_active,
  now() as created_at,
  now() as updated_at
from public.chapter_members cm
where
  cm.forum is not null
  and length(trim(cm.forum)) > 0
  and not exists (
    select 1
    from public.forums f
    where f.chapter_id = cm.chapter_id
      and f.name = cm.forum
  );

notify pgrst, 'reload schema';
