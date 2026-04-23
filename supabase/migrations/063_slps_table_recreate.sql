-- ============================================================
-- 063 Re-apply 050 (Significant Life Partners) DDL
-- ============================================================
-- Migration 050 was marked applied in the Supabase migration
-- tracker but the `public.slps` table was never actually created in
-- production (part of the 035/037-040/050 schema drift). Member
-- profile saves now fail with:
--   Could not find the table 'public.slps' in the schema cache
--
-- 050's DDL is fully idempotent (`create table if not exists`,
-- `create or replace function`, `drop policy if exists` + create).
-- Re-running it is safe everywhere the table already exists and
-- creates it where it doesn't. Migration 063 is a verbatim re-run
-- of 050 so Supabase will actually execute the DDL this time.
-- ============================================================

create table if not exists public.slps (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null unique references public.chapter_members(id) on delete cascade,
  name text not null default '',
  relationship_type text not null default 'spouse',
  dob date,
  anniversary date,
  kids text default '',
  dietary_restrictions text default '',
  allergies text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_slps_chapter on public.slps(chapter_id);
create index if not exists idx_slps_member on public.slps(member_id);

alter table public.slps enable row level security;

create or replace function public.is_slp_admin(check_chapter_id uuid)
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
          'learning_chair',
          'learning_chair_elect',
          'chapter_executive_director',
          'chapter_experience_coordinator'
        )
      )
    )
  );
$$ language sql security definer stable;

drop policy if exists "Member or admin can read SLP" on public.slps;
create policy "Member or admin can read SLP" on public.slps
  for select using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  );

drop policy if exists "Member or admin can insert SLP" on public.slps;
create policy "Member or admin can insert SLP" on public.slps
  for insert with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  );

drop policy if exists "Member or admin can update SLP" on public.slps;
create policy "Member or admin can update SLP" on public.slps
  for update using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  ) with check (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  );

drop policy if exists "Member or admin can delete SLP" on public.slps;
create policy "Member or admin can delete SLP" on public.slps
  for delete using (
    member_id = public.current_chapter_member_id()
    or public.is_slp_admin(chapter_id)
  );

notify pgrst, 'reload schema';
