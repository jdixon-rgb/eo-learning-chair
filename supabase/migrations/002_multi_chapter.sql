-- ============================================================
-- 002 Multi-Chapter Support
-- Adds super_admin role, chapter-scoped RLS, helper functions
-- ============================================================

-- ============================================================
-- 1. Add 'super_admin' to role check constraints
-- ============================================================

-- profiles: drop and recreate
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'learning_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- member_invites: drop and recreate
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'learning_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- ============================================================
-- 2. Add chapter_id to member_invites (nullable for backward compat)
-- ============================================================

alter table public.member_invites
  add column if not exists chapter_id uuid references public.chapters(id);

-- ============================================================
-- 3. Update handle_new_user() to pull chapter_id from invite
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
begin
  select * into invite from public.member_invites
    where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, chapter_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
    coalesce(invite.role, 'member'),
    invite.chapter_id
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 4. Helper functions
-- ============================================================

-- is_super_admin(): checks if current user has role 'super_admin'
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'super_admin'
  );
$$ language sql security definer stable;

-- user_chapter_id(): returns current user's chapter_id
create or replace function public.user_chapter_id()
returns uuid as $$
  select chapter_id from public.profiles
  where id = auth.uid();
$$ language sql security definer stable;

-- is_chapter_admin(check_chapter_id): checks if current user is admin for the given chapter
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in ('learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director')
  );
$$ language sql security definer stable;

-- ============================================================
-- 5. Drop ALL existing RLS policies on app tables
-- ============================================================

-- chapters
drop policy if exists "Authenticated users can view chapters" on public.chapters;
drop policy if exists "Admins can insert chapters" on public.chapters;
drop policy if exists "Admins can update chapters" on public.chapters;
drop policy if exists "Admins can delete chapters" on public.chapters;

-- venues
drop policy if exists "Authenticated users can view venues" on public.venues;
drop policy if exists "Admins can insert venues" on public.venues;
drop policy if exists "Admins can update venues" on public.venues;
drop policy if exists "Admins can delete venues" on public.venues;

-- speakers
drop policy if exists "Authenticated users can view speakers" on public.speakers;
drop policy if exists "Admins can insert speakers" on public.speakers;
drop policy if exists "Admins can update speakers" on public.speakers;
drop policy if exists "Admins can delete speakers" on public.speakers;

-- saps
drop policy if exists "Authenticated users can view saps" on public.saps;
drop policy if exists "Admins can insert saps" on public.saps;
drop policy if exists "Admins can update saps" on public.saps;
drop policy if exists "Admins can delete saps" on public.saps;

-- events
drop policy if exists "Authenticated users can view events" on public.events;
drop policy if exists "Admins can insert events" on public.events;
drop policy if exists "Admins can update events" on public.events;
drop policy if exists "Admins can delete events" on public.events;

-- budget_items
drop policy if exists "Authenticated users can view budget_items" on public.budget_items;
drop policy if exists "Admins can insert budget_items" on public.budget_items;
drop policy if exists "Admins can update budget_items" on public.budget_items;
drop policy if exists "Admins can delete budget_items" on public.budget_items;

-- contract_checklists
drop policy if exists "Authenticated users can view contract_checklists" on public.contract_checklists;
drop policy if exists "Admins can insert contract_checklists" on public.contract_checklists;
drop policy if exists "Admins can update contract_checklists" on public.contract_checklists;
drop policy if exists "Admins can delete contract_checklists" on public.contract_checklists;

-- scenarios
drop policy if exists "Authenticated users can view scenarios" on public.scenarios;
drop policy if exists "Admins can insert scenarios" on public.scenarios;
drop policy if exists "Admins can update scenarios" on public.scenarios;
drop policy if exists "Admins can delete scenarios" on public.scenarios;

-- ============================================================
-- 6. Create new chapter-scoped RLS policies
-- ============================================================

-- -------------------------------------------------------
-- Chapters
-- -------------------------------------------------------

-- Anon/public read
create policy "Anon can view chapters" on public.chapters
  for select using (true);

-- Authenticated: super_admin sees all, others see own chapter
create policy "Users can view own chapter" on public.chapters
  for select using (
    public.is_super_admin()
    or id = public.user_chapter_id()
  );

-- Only super_admin can create/update/delete chapters
create policy "Super admin can insert chapters" on public.chapters
  for insert with check (public.is_super_admin());

create policy "Super admin can update chapters" on public.chapters
  for update using (public.is_super_admin());

create policy "Super admin can delete chapters" on public.chapters
  for delete using (public.is_super_admin());

-- -------------------------------------------------------
-- Speakers
-- -------------------------------------------------------

create policy "Anon can view speakers" on public.speakers
  for select using (true);

create policy "Chapter scoped select speakers" on public.speakers
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Chapter scoped insert speakers" on public.speakers
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped update speakers" on public.speakers
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped delete speakers" on public.speakers
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- -------------------------------------------------------
-- Venues
-- -------------------------------------------------------

create policy "Anon can view venues" on public.venues
  for select using (true);

create policy "Chapter scoped select venues" on public.venues
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Chapter scoped insert venues" on public.venues
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped update venues" on public.venues
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped delete venues" on public.venues
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- -------------------------------------------------------
-- Events
-- -------------------------------------------------------

create policy "Anon can view events" on public.events
  for select using (true);

create policy "Chapter scoped select events" on public.events
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Chapter scoped insert events" on public.events
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped update events" on public.events
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped delete events" on public.events
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- -------------------------------------------------------
-- SAPs
-- -------------------------------------------------------

create policy "Anon can view saps" on public.saps
  for select using (true);

create policy "Chapter scoped select saps" on public.saps
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Chapter scoped insert saps" on public.saps
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped update saps" on public.saps
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped delete saps" on public.saps
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- -------------------------------------------------------
-- Scenarios
-- -------------------------------------------------------

create policy "Anon can view scenarios" on public.scenarios
  for select using (true);

create policy "Chapter scoped select scenarios" on public.scenarios
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or public.user_chapter_id() = chapter_id
  );

create policy "Chapter scoped insert scenarios" on public.scenarios
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped update scenarios" on public.scenarios
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Chapter scoped delete scenarios" on public.scenarios
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- -------------------------------------------------------
-- Budget Items (scoped through event_id -> events.chapter_id)
-- -------------------------------------------------------

create policy "Anon can view budget_items" on public.budget_items
  for select using (true);

create policy "Chapter scoped select budget_items" on public.budget_items
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and (public.is_chapter_admin(events.chapter_id) or events.chapter_id = public.user_chapter_id())
    )
  );

create policy "Chapter scoped insert budget_items" on public.budget_items
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

create policy "Chapter scoped update budget_items" on public.budget_items
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

create policy "Chapter scoped delete budget_items" on public.budget_items
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = budget_items.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

-- -------------------------------------------------------
-- Contract Checklists (scoped through event_id -> events.chapter_id)
-- -------------------------------------------------------

create policy "Anon can view contract_checklists" on public.contract_checklists
  for select using (true);

create policy "Chapter scoped select contract_checklists" on public.contract_checklists
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and (public.is_chapter_admin(events.chapter_id) or events.chapter_id = public.user_chapter_id())
    )
  );

create policy "Chapter scoped insert contract_checklists" on public.contract_checklists
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

create policy "Chapter scoped update contract_checklists" on public.contract_checklists
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

create policy "Chapter scoped delete contract_checklists" on public.contract_checklists
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.events
      where events.id = contract_checklists.event_id
      and public.is_chapter_admin(events.chapter_id)
    )
  );

-- ============================================================
-- 7. Seed super_admin invite
-- ============================================================

insert into public.member_invites (email, full_name, role)
values ('john@example.com', 'John Dixon', 'super_admin')
on conflict (email) do update set role = 'super_admin';
