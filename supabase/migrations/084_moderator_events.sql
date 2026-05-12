-- 084_moderator_events.sql
-- Chapter-wide calendar for moderator-only programming. Distinct from
-- forum_calendar_events (which is per-forum, member-visible) and from
-- the chapter calendar (which is chapter-wide, member-visible).
--
-- Moderator events are the meetings every moderator in the chapter is
-- expected to attend:
--   - monthly_meeting: regular moderator gathering, hosted by the
--     Moderator (one of the rotating chairs) or the Forum Health Chair.
--   - summit: annual moderator summit per regional location. Region is
--     stored on the event so a moderator who travels can see summits
--     beyond their home chapter's region.
--   - other: catch-all for ad-hoc training, intros, etc.
--
-- Visibility: any active forum moderator in the chapter sees events
-- for their chapter. Forum Health Chair, President, and admins also
-- see them (they often run the meetings). Writes are limited to
-- moderators + admins.

-- Self-heal: migration 006 was supposed to add this column, but the
-- migration history shows 006 applied while the column is missing on
-- the remote DB. Re-add idempotently here so downstream RLS that
-- references it can compile. Same pattern as migration 080 for the
-- earlier SAP drift fix.
alter table public.chapter_members
  add column if not exists is_forum_moderator boolean not null default false;

create or replace function public.current_member_is_moderator()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.chapter_members cm
    join auth.users u on lower(u.email) = lower(cm.email)
    where u.id = auth.uid()
      and cm.status = 'active'
      and cm.is_forum_moderator = true
  )
  or exists (
    select 1
    from public.forum_role_assignments fra
    join public.chapter_members cm on cm.id = fra.chapter_member_id
    join auth.users u on lower(u.email) = lower(cm.email)
    where u.id = auth.uid()
      and fra.role = 'moderator'
  );
$$;

grant execute on function public.current_member_is_moderator() to authenticated;

create table if not exists public.moderator_events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  region text,
  event_type text not null default 'monthly_meeting',
  host_role text not null default 'moderator',
  title text not null,
  description text default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text default '',
  virtual_link text default '',
  fiscal_year text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderator_events_event_type_check
    check (event_type in ('monthly_meeting', 'summit', 'other')),
  constraint moderator_events_host_role_check
    check (host_role in ('moderator', 'forum_health_chair', 'president', 'other'))
);

create index if not exists moderator_events_chapter_idx on public.moderator_events (chapter_id);
create index if not exists moderator_events_starts_at_idx on public.moderator_events (starts_at);
create index if not exists moderator_events_region_idx on public.moderator_events (region);

alter table public.moderator_events enable row level security;

-- SELECT: super-admin sees all; moderators + chapter admins see their
-- chapter's events. Non-moderators don't read this table — these are
-- intentionally back-of-house meetings.
drop policy if exists "moderator_events_select" on public.moderator_events;
create policy "moderator_events_select"
on public.moderator_events for select to authenticated
using (
  is_super_admin()
  or (chapter_id = user_chapter_id() and (
       is_chapter_admin(chapter_id)
       or current_member_is_moderator()
     ))
);

-- INSERT: super-admin, chapter admins, or any current moderator in
-- the chapter. Forum Health Chair gets in via is_chapter_admin (they
-- have admin perms in the chair-role check).
drop policy if exists "moderator_events_insert" on public.moderator_events;
create policy "moderator_events_insert"
on public.moderator_events for insert to authenticated
with check (
  is_super_admin()
  or (chapter_id = user_chapter_id() and (
       is_chapter_admin(chapter_id)
       or current_member_is_moderator()
     ))
);

-- UPDATE: same write set as insert.
drop policy if exists "moderator_events_update" on public.moderator_events;
create policy "moderator_events_update"
on public.moderator_events for update to authenticated
using (
  is_super_admin()
  or (chapter_id = user_chapter_id() and (
       is_chapter_admin(chapter_id)
       or current_member_is_moderator()
     ))
)
with check (
  is_super_admin()
  or (chapter_id = user_chapter_id() and (
       is_chapter_admin(chapter_id)
       or current_member_is_moderator()
     ))
);

-- DELETE: same write set.
drop policy if exists "moderator_events_delete" on public.moderator_events;
create policy "moderator_events_delete"
on public.moderator_events for delete to authenticated
using (
  is_super_admin()
  or (chapter_id = user_chapter_id() and (
       is_chapter_admin(chapter_id)
       or current_member_is_moderator()
     ))
);

grant select, insert, update, delete on public.moderator_events to authenticated;

-- Touch updated_at on every UPDATE.
create or replace function public.moderator_events_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists moderator_events_touch_updated_at on public.moderator_events;
create trigger moderator_events_touch_updated_at
before update on public.moderator_events
for each row execute function public.moderator_events_touch_updated_at();
