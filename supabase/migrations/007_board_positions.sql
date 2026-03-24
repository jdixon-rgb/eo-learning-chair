-- ============================================================
-- 006 Board Positions, Role Assignments, and Chapter Members
-- Creates tables for dynamic board management that were
-- previously set up manually without a migration file.
-- Also fixes the role_assignments.status CHECK constraint
-- to use 'elect' instead of 'incoming'/'outgoing'.
-- ============================================================

-- ── 1. chapter_roles ──────────────────────────────────────────
create table if not exists public.chapter_roles (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  role_key text not null,
  label text not null,
  is_staff boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chapter_id, role_key)
);

create index if not exists idx_chapter_roles_chapter on public.chapter_roles(chapter_id);

-- ── 2. chapter_members ────────────────────────────────────────
-- Note: columns first_name, last_name, phone, forum, industry,
-- eo_join_date, notes are added by migration 005 if not present.
create table if not exists public.chapter_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  first_name text default '',
  last_name text default '',
  email text default '',
  phone text default '',
  company text default '',
  forum text default '',
  industry text default '',
  eo_join_date date,
  notes text default '',
  status text not null default 'active' check (status in ('active', 'inactive', 'alumni')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chapter_members_chapter on public.chapter_members(chapter_id);
create index if not exists idx_chapter_members_forum on public.chapter_members(forum);

-- ── 3. role_assignments ───────────────────────────────────────
create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  chapter_role_id uuid not null references public.chapter_roles(id) on delete cascade,
  member_id uuid references public.chapter_members(id) on delete set null,
  member_name text not null default '',
  member_email text not null default '',
  fiscal_year text not null default '',
  status text not null default 'active' check (status in ('active', 'elect', 'past')),
  budget integer not null default 0,
  theme text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_role_assignments_chapter on public.role_assignments(chapter_id);
create index if not exists idx_role_assignments_role on public.role_assignments(chapter_role_id);

-- ── 4. Fix existing status constraint if tables already exist ──
-- If role_assignments was created manually with the old status values
-- (active/incoming/outgoing/past), drop and recreate the constraint
-- to use the current EO terminology (active/elect/past).
do $$
declare
  v_constraint text;
begin
  -- Migrate old status values before updating the constraint
  update public.role_assignments set status = 'elect' where status = 'incoming';
  update public.role_assignments set status = 'past'  where status = 'outgoing';

  -- Drop old CHECK constraint on status if it exists (may have any name)
  select tc.constraint_name into v_constraint
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name = 'role_assignments'
    and tc.constraint_type = 'CHECK'
    and tc.constraint_name ilike '%status%';

  if v_constraint is not null then
    execute format('alter table public.role_assignments drop constraint %I', v_constraint);
  end if;

  -- Add the correct constraint
  begin
    alter table public.role_assignments
      add constraint role_assignments_status_check
        check (status in ('active', 'elect', 'past'));
  exception when duplicate_object then
    null; -- already exists with correct name
  end;
exception when others then
  null; -- table may not exist yet (CREATE above handles that)
end;
$$;

-- ── 5. RLS ────────────────────────────────────────────────────

alter table public.chapter_roles enable row level security;
alter table public.chapter_members enable row level security;
alter table public.role_assignments enable row level security;

-- chapter_roles
create policy "Anon can view chapter_roles" on public.chapter_roles
  for select using (true);
create policy "Admins can insert chapter_roles" on public.chapter_roles
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update chapter_roles" on public.chapter_roles
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete chapter_roles" on public.chapter_roles
  for delete using (public.is_super_admin() or public.is_admin());

-- chapter_members
create policy "Anon can view chapter_members" on public.chapter_members
  for select using (true);
create policy "Admins can insert chapter_members" on public.chapter_members
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update chapter_members" on public.chapter_members
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete chapter_members" on public.chapter_members
  for delete using (public.is_super_admin() or public.is_admin());

-- role_assignments
create policy "Anon can view role_assignments" on public.role_assignments
  for select using (true);
create policy "Admins can insert role_assignments" on public.role_assignments
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update role_assignments" on public.role_assignments
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete role_assignments" on public.role_assignments
  for delete using (public.is_super_admin() or public.is_admin());

-- ── 6. Reload PostgREST schema cache ─────────────────────────

notify pgrst, 'reload schema';
