-- 027_forum_constitution.sql
-- Digital forum constitutions with versioning and member ratification.
-- Lean v1: plain-text sections, unanimous ratification required to adopt.

-- ── 1. forum_constitutions ───────────────────────────────────
-- One row per forum. Holds the pointer to the current adopted version.
create table if not exists public.forum_constitutions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (forum_id)
);

create index if not exists idx_forum_constitutions_chapter on public.forum_constitutions(chapter_id);

-- ── 2. forum_constitution_versions ───────────────────────────
-- Every version — draft, proposed, adopted, archived.
-- sections is a jsonb array: [{ id, heading, body }]
create table if not exists public.forum_constitution_versions (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.forum_constitutions(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  version_number int not null,
  status text not null default 'draft' check (status in ('draft', 'proposed', 'adopted', 'archived')),
  title text not null default 'Forum Constitution',
  preamble text default '',
  sections jsonb not null default '[]'::jsonb,
  authored_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  proposed_at timestamptz,
  adopted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (constitution_id, version_number)
);

create index if not exists idx_forum_constitution_versions_constitution on public.forum_constitution_versions(constitution_id);
create index if not exists idx_forum_constitution_versions_status on public.forum_constitution_versions(status);
create index if not exists idx_forum_constitution_versions_chapter on public.forum_constitution_versions(chapter_id);

-- ── 3. forum_constitution_ratifications ──────────────────────
-- One row per member signature on a specific version.
create table if not exists public.forum_constitution_ratifications (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.forum_constitution_versions(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  signed_at timestamptz not null default now(),
  unique (version_id, member_id)
);

create index if not exists idx_forum_constitution_ratifications_version on public.forum_constitution_ratifications(version_id);
create index if not exists idx_forum_constitution_ratifications_chapter on public.forum_constitution_ratifications(chapter_id);

-- ── 4. RLS ───────────────────────────────────────────────────
alter table public.forum_constitutions enable row level security;
alter table public.forum_constitution_versions enable row level security;
alter table public.forum_constitution_ratifications enable row level security;

-- forum_constitutions
create policy "Anon can view forum_constitutions" on public.forum_constitutions
  for select using (true);
create policy "Admins can insert forum_constitutions" on public.forum_constitutions
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_constitutions" on public.forum_constitutions
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_constitutions" on public.forum_constitutions
  for delete using (public.is_super_admin() or public.is_admin());

-- forum_constitution_versions
create policy "Anon can view forum_constitution_versions" on public.forum_constitution_versions
  for select using (true);
create policy "Admins can insert forum_constitution_versions" on public.forum_constitution_versions
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_constitution_versions" on public.forum_constitution_versions
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_constitution_versions" on public.forum_constitution_versions
  for delete using (public.is_super_admin() or public.is_admin());

-- forum_constitution_ratifications: any authenticated forum member can sign,
-- but the client controls who (matches existing permissive pattern).
create policy "Anon can view forum_constitution_ratifications" on public.forum_constitution_ratifications
  for select using (true);
create policy "Anon can insert forum_constitution_ratifications" on public.forum_constitution_ratifications
  for insert with check (true);
create policy "Admins can delete forum_constitution_ratifications" on public.forum_constitution_ratifications
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
