-- ============================================================
-- 092 SLP forums: parallel personal data (reflections + parking)
--                 and parallel constitution ratifications
-- ============================================================
-- Mirrors the per-person tables members use (reflections,
-- parking_lot_entries, forum_constitution_ratifications) so SLPs
-- get the same surfaces with a strictly separate data slice.
--
-- All three tables key off slps.id; RLS is owner-only via
-- current_slp_id() with the "active linked member" check baked in.
-- Reflection templates + feelings library stay shared (those are
-- catalog data, not per-person), so no separate copies needed.
--
-- Idempotent: safe to re-run.

-- ── 1. slp_reflections ──────────────────────────────────────
-- Per-SLP, per-forum journal entries. Strictly private to author.
create table if not exists public.slp_reflections (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid not null references public.chapters(id) on delete cascade,
  forum         text not null,
  slp_id        uuid not null references public.slps(id) on delete cascade,
  template_slug text not null references public.reflection_templates(slug),
  category      text check (category in ('business', 'personal', 'community')),
  content       jsonb not null default '{}'::jsonb,
  feelings      text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_slp_reflections_slp
  on public.slp_reflections(slp_id);
create index if not exists idx_slp_reflections_forum
  on public.slp_reflections(chapter_id, forum);

-- ── 2. slp_parking_lot_entries ──────────────────────────────
-- Per-SLP-forum shared parking lot. Author-authored name + scores.
create table if not exists public.slp_parking_lot_entries (
  id              uuid primary key default gen_random_uuid(),
  chapter_id      uuid not null references public.chapters(id) on delete cascade,
  forum           text not null,
  author_slp_id   uuid not null references public.slps(id) on delete cascade,
  name            text not null,
  importance      int not null check (importance between 1 and 10),
  urgency         int not null check (urgency between 1 and 10),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_slp_parking_lot_forum
  on public.slp_parking_lot_entries(chapter_id, forum);
create index if not exists idx_slp_parking_lot_author
  on public.slp_parking_lot_entries(author_slp_id);

-- ── 3. slp_constitution_ratifications ───────────────────────
-- One row per SLP signature on a specific constitution version.
-- Mirrors forum_constitution_ratifications. The constitution
-- itself (forum_constitutions / forum_constitution_versions) is
-- shared infrastructure — what we're forking here is just the
-- per-person signature ledger.
create table if not exists public.slp_constitution_ratifications (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.forum_constitution_versions(id) on delete cascade,
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  slp_id      uuid not null references public.slps(id) on delete cascade,
  signed_at   timestamptz not null default now(),
  unique (version_id, slp_id)
);

create index if not exists idx_slp_constitution_ratifications_version
  on public.slp_constitution_ratifications(version_id);
create index if not exists idx_slp_constitution_ratifications_chapter
  on public.slp_constitution_ratifications(chapter_id);

-- ── 4. RLS ──────────────────────────────────────────────────
alter table public.slp_reflections                enable row level security;
alter table public.slp_parking_lot_entries        enable row level security;
alter table public.slp_constitution_ratifications enable row level security;

-- slp_reflections: strictly author-only (matches reflections RLS)
drop policy if exists "Author can view own SLP reflections" on public.slp_reflections;
create policy "Author can view own SLP reflections" on public.slp_reflections
  for select using (slp_id = public.current_slp_id());

drop policy if exists "Author can insert own SLP reflections" on public.slp_reflections;
create policy "Author can insert own SLP reflections" on public.slp_reflections
  for insert with check (slp_id = public.current_slp_id());

drop policy if exists "Author can update own SLP reflections" on public.slp_reflections;
create policy "Author can update own SLP reflections" on public.slp_reflections
  for update using (slp_id = public.current_slp_id());

drop policy if exists "Author can delete own SLP reflections" on public.slp_reflections;
create policy "Author can delete own SLP reflections" on public.slp_reflections
  for delete using (slp_id = public.current_slp_id());

-- slp_parking_lot_entries: forum-mates can read; author-only write
drop policy if exists "Forum SLPs can view parking lot" on public.slp_parking_lot_entries;
create policy "Forum SLPs can view parking lot" on public.slp_parking_lot_entries
  for select using (
    chapter_id = public.user_chapter_id()
    and forum = public.current_slp_forum()
  );

drop policy if exists "Author can insert SLP parking lot entry" on public.slp_parking_lot_entries;
create policy "Author can insert SLP parking lot entry" on public.slp_parking_lot_entries
  for insert with check (
    author_slp_id = public.current_slp_id()
    and forum = public.current_slp_forum()
  );

drop policy if exists "Author can update own SLP parking lot entry" on public.slp_parking_lot_entries;
create policy "Author can update own SLP parking lot entry" on public.slp_parking_lot_entries
  for update using (author_slp_id = public.current_slp_id());

drop policy if exists "Author can delete own SLP parking lot entry" on public.slp_parking_lot_entries;
create policy "Author can delete own SLP parking lot entry" on public.slp_parking_lot_entries
  for delete using (author_slp_id = public.current_slp_id());

-- slp_constitution_ratifications: mirrors forum_constitution_ratifications
-- (permissive SELECT, anon-insertable, admin-delete). The app gates who
-- signs; the table just records the signatures.
drop policy if exists "Anon can view slp constitution ratifications" on public.slp_constitution_ratifications;
create policy "Anon can view slp constitution ratifications" on public.slp_constitution_ratifications
  for select using (true);

drop policy if exists "Anon can insert slp constitution ratifications" on public.slp_constitution_ratifications;
create policy "Anon can insert slp constitution ratifications" on public.slp_constitution_ratifications
  for insert with check (true);

drop policy if exists "Admins can delete slp constitution ratifications" on public.slp_constitution_ratifications;
create policy "Admins can delete slp constitution ratifications" on public.slp_constitution_ratifications
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
