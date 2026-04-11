-- 030_profile_checkins.sql
-- Profile freshness ping: periodically ask members "has anything changed?"
-- so member data doesn't rot silently. A single table captures both the
-- "nothing changed" confirmations AND the "here's what changed" requests
-- the admin team needs to action.
--
-- From JS live demo: "I'm going to build in a deal that occasionally pings
-- us that says, hey, has anything changed in your world that needs to be
-- reflected in your profile?"

create table if not exists public.profile_checkins (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  -- 'no_change' = member confirmed nothing changed (no admin action needed)
  -- 'change_requested' = member flagged a change; admin needs to update profile + resolve
  kind text not null check (kind in ('no_change', 'change_requested')),
  note text default '',
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.chapter_members(id) on delete set null
);

create index if not exists idx_profile_checkins_member on public.profile_checkins(member_id);
create index if not exists idx_profile_checkins_chapter on public.profile_checkins(chapter_id);
create index if not exists idx_profile_checkins_kind_status on public.profile_checkins(kind, status);
create index if not exists idx_profile_checkins_created on public.profile_checkins(created_at);

-- RLS
alter table public.profile_checkins enable row level security;

-- Select: admins see all; members see only their own
create policy "Admins or self can view profile_checkins" on public.profile_checkins
  for select using (
    public.is_super_admin()
    or public.is_admin()
    or member_id = public.current_chapter_member_id()
  );

-- Insert: members can insert their own check-in; admins can insert on behalf
create policy "Self or admin can insert profile_checkins" on public.profile_checkins
  for insert with check (
    public.is_super_admin()
    or public.is_admin()
    or member_id = public.current_chapter_member_id()
  );

-- Update: admin only (to resolve change_requested rows)
create policy "Admins can update profile_checkins" on public.profile_checkins
  for update using (public.is_super_admin() or public.is_admin());

-- Delete: admin only
create policy "Admins can delete profile_checkins" on public.profile_checkins
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
