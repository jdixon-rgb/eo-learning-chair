-- 086_forum_at_risk_entries.sql
-- At-risk member ledger, co-owned by Forum Health Chair and Forum
-- Placement Chair. Captures the qualitative knowledge that today
-- lives only in the chair's head: who showed up wavering after a
-- seeding, who's disengaged, who might fit better elsewhere.
--
-- One *open* entry per (forum × member); resolved entries accumulate
-- as history. Status flips to 'resolved' when the member settles in,
-- gets re-placed, or leaves — captured via resolution_outcome.
--
-- Visibility: chapter admins (existing is_chapter_admin set) plus
-- profiles holding forum_health_chair OR forum_placement_chair for
-- the same chapter. Same explicit-check pattern as 085 — we don't
-- widen is_chapter_admin globally.

create table if not exists public.forum_at_risk_entries (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,

  risk_level text not null default 'medium',
  reasons text[] not null default '{}',
  notes text not null default '',
  better_fit_note text not null default '',
  recommended_action text,
  status text not null default 'open',
  resolution_outcome text not null default '',
  last_reviewed_at timestamptz,

  created_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint forum_at_risk_risk_level_check
    check (risk_level in ('low', 'medium', 'high')),
  constraint forum_at_risk_action_check
    check (recommended_action is null
           or recommended_action in ('watch', 'coach', 'reassess', 'reassign', 'exit')),
  constraint forum_at_risk_status_check
    check (status in ('open', 'resolved'))
);

-- One open entry per (forum, member); resolved history is unbounded.
create unique index if not exists forum_at_risk_one_open_per_member
  on public.forum_at_risk_entries (forum_id, chapter_member_id)
  where status = 'open';

create index if not exists forum_at_risk_chapter_idx
  on public.forum_at_risk_entries (chapter_id);
create index if not exists forum_at_risk_forum_idx
  on public.forum_at_risk_entries (forum_id);
create index if not exists forum_at_risk_member_idx
  on public.forum_at_risk_entries (chapter_member_id);
create index if not exists forum_at_risk_status_idx
  on public.forum_at_risk_entries (status);

alter table public.forum_at_risk_entries enable row level security;

-- Inline access predicate covering Health + Placement chairs.
drop policy if exists "far_select" on public.forum_at_risk_entries;
create policy "far_select"
on public.forum_at_risk_entries for select to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_at_risk_entries.chapter_id
      and p.role in ('forum_health_chair', 'forum_placement_chair')
  )
);

drop policy if exists "far_insert" on public.forum_at_risk_entries;
create policy "far_insert"
on public.forum_at_risk_entries for insert to authenticated
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_at_risk_entries.chapter_id
      and p.role in ('forum_health_chair', 'forum_placement_chair')
  )
);

drop policy if exists "far_update" on public.forum_at_risk_entries;
create policy "far_update"
on public.forum_at_risk_entries for update to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_at_risk_entries.chapter_id
      and p.role in ('forum_health_chair', 'forum_placement_chair')
  )
)
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_at_risk_entries.chapter_id
      and p.role in ('forum_health_chair', 'forum_placement_chair')
  )
);

drop policy if exists "far_delete" on public.forum_at_risk_entries;
create policy "far_delete"
on public.forum_at_risk_entries for delete to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
);

grant select, insert, update, delete on public.forum_at_risk_entries to authenticated;

create or replace function public.forum_at_risk_entries_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists forum_at_risk_entries_touch_updated_at on public.forum_at_risk_entries;
create trigger forum_at_risk_entries_touch_updated_at
before update on public.forum_at_risk_entries
for each row execute function public.forum_at_risk_entries_touch_updated_at();
