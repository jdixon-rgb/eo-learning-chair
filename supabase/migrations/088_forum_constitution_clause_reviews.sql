-- 088_forum_constitution_clause_reviews.sql
-- Per-clause review layer that sits ABOVE ratification.
--
-- Members read each section of a constitution version and either:
--   - check it off ("I reviewed this, I'm fine with it"), or
--   - leave an annotation ("we should discuss this before ratifying").
--
-- The moderator uses the aggregate to drive a focused group discussion
-- before opening the version for unanimous ratification. The Forum
-- Health Chair gets a read-only signal that the review activity
-- happened on each forum.
--
-- Section ids come from the existing `sections` jsonb array on
-- forum_constitution_versions: each section row has `id` (uuid).
-- We store section_id as text so we don't have to enforce a join
-- against jsonb membership.
--
-- Uniqueness: one review row per (version × member × section). A
-- member can edit their own review (toggle checkbox, change note)
-- across sessions.

create table if not exists public.forum_constitution_clause_reviews (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  version_id uuid not null references public.forum_constitution_versions(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  section_id text not null,
  reviewed boolean not null default false,
  annotation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, member_id, section_id)
);

create index if not exists idx_forum_constitution_clause_reviews_version
  on public.forum_constitution_clause_reviews (version_id);
create index if not exists idx_forum_constitution_clause_reviews_chapter
  on public.forum_constitution_clause_reviews (chapter_id);
create index if not exists idx_forum_constitution_clause_reviews_member
  on public.forum_constitution_clause_reviews (member_id);

alter table public.forum_constitution_clause_reviews enable row level security;

-- Match the permissive pattern of forum_constitution_ratifications:
-- the client controls who. Members can see all reviews on their forum's
-- versions (so the moderator-aggregation roster works for everyone).
create policy "Anon can view forum_constitution_clause_reviews"
  on public.forum_constitution_clause_reviews for select using (true);
create policy "Anon can insert forum_constitution_clause_reviews"
  on public.forum_constitution_clause_reviews for insert with check (true);
create policy "Anon can update forum_constitution_clause_reviews"
  on public.forum_constitution_clause_reviews for update using (true) with check (true);
create policy "Admins can delete forum_constitution_clause_reviews"
  on public.forum_constitution_clause_reviews for delete
  using (public.is_super_admin() or public.is_admin());

create or replace function public.forum_constitution_clause_reviews_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists forum_constitution_clause_reviews_touch_updated_at
  on public.forum_constitution_clause_reviews;
create trigger forum_constitution_clause_reviews_touch_updated_at
before update on public.forum_constitution_clause_reviews
for each row execute function public.forum_constitution_clause_reviews_touch_updated_at();

notify pgrst, 'reload schema';
