-- 085_forum_health_assessments.sql
-- Per-forum, FY-scoped health assessment authored by the Forum Health
-- Chair (or board admins). Captures both the structured checklist
-- ("did this forum do the basics this year") and the qualitative
-- handoff narrative the outgoing chair leaves for the incoming chair.
--
-- One row per (forum × fiscal_year). The shape of the structured
-- checklist intentionally stays narrow at v1 — we expand items as the
-- product evolves. Today it covers the items the strategy session
-- surfaced as table stakes: lifecycle stage (Tuckman), constitution
-- review, one-pager, role coverage, plus free-form chair_notes and
-- handoff_narrative.
--
-- Visibility: chapter admins (existing is_chapter_admin set) and any
-- profile holding the forum_health_chair role for the same chapter
-- can read/write. forum_health_chair isn't part of is_chapter_admin
-- today, so we check it explicitly here rather than expand
-- is_chapter_admin (which would unintentionally widen access on every
-- other policy that uses it).

create table if not exists public.forum_health_assessments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  fiscal_year text not null,

  lifecycle_stage text,
  lifecycle_note text not null default '',

  constitution_reviewed boolean,
  constitution_review_note text not null default '',
  one_pager_complete boolean,
  one_pager_note text not null default '',
  roles_assigned boolean,
  roles_note text not null default '',

  chair_notes text not null default '',
  handoff_narrative text not null default '',

  assessed_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint forum_health_assessments_lifecycle_stage_check
    check (
      lifecycle_stage is null
      or lifecycle_stage in ('forming', 'storming', 'norming', 'performing', 'adjourning')
    ),

  unique (forum_id, fiscal_year)
);

create index if not exists forum_health_assessments_chapter_idx
  on public.forum_health_assessments (chapter_id);
create index if not exists forum_health_assessments_forum_idx
  on public.forum_health_assessments (forum_id);
create index if not exists forum_health_assessments_fy_idx
  on public.forum_health_assessments (fiscal_year);

alter table public.forum_health_assessments enable row level security;

-- Inline access predicate so we don't widen is_chapter_admin globally.
-- Any profile in the same chapter with role=forum_health_chair (or
-- the elect-equivalent if added later) gets in.
drop policy if exists "fha_select" on public.forum_health_assessments;
create policy "fha_select"
on public.forum_health_assessments for select to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_health_assessments.chapter_id
      and p.role = 'forum_health_chair'
  )
);

drop policy if exists "fha_insert" on public.forum_health_assessments;
create policy "fha_insert"
on public.forum_health_assessments for insert to authenticated
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_health_assessments.chapter_id
      and p.role = 'forum_health_chair'
  )
);

drop policy if exists "fha_update" on public.forum_health_assessments;
create policy "fha_update"
on public.forum_health_assessments for update to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_health_assessments.chapter_id
      and p.role = 'forum_health_chair'
  )
)
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.chapter_id = forum_health_assessments.chapter_id
      and p.role = 'forum_health_chair'
  )
);

drop policy if exists "fha_delete" on public.forum_health_assessments;
create policy "fha_delete"
on public.forum_health_assessments for delete to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
);

grant select, insert, update, delete on public.forum_health_assessments to authenticated;

-- Touch updated_at on every UPDATE.
create or replace function public.forum_health_assessments_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists forum_health_assessments_touch_updated_at on public.forum_health_assessments;
create trigger forum_health_assessments_touch_updated_at
before update on public.forum_health_assessments
for each row execute function public.forum_health_assessments_touch_updated_at();
