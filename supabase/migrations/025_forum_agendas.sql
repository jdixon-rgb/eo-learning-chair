-- 025_forum_agendas.sql
-- Forum meeting agendas with timed line items.

create table if not exists public.forum_agendas (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum_id uuid not null references public.forums(id) on delete cascade,
  title text not null default '',
  meeting_date date not null,
  start_time text not null default '12:00 PM',
  end_time text not null default '4:30 PM',
  location text default '',
  host text default '',
  mission text default '',
  forum_values text default '',
  target_minutes int default 270,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forum_agendas_forum on public.forum_agendas(forum_id);
create index if not exists idx_forum_agendas_date on public.forum_agendas(meeting_date);
create index if not exists idx_forum_agendas_status on public.forum_agendas(status);

create table if not exists public.forum_agenda_items (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.forum_agendas(id) on delete cascade,
  title text not null,
  description text default '',
  minutes int not null default 0,
  start_time text default '',
  end_time text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agenda_items_agenda on public.forum_agenda_items(agenda_id);

-- RLS
alter table public.forum_agendas enable row level security;
alter table public.forum_agenda_items enable row level security;

create policy "Anyone can view forum_agendas" on public.forum_agendas
  for select using (true);
create policy "Admins can insert forum_agendas" on public.forum_agendas
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_agendas" on public.forum_agendas
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_agendas" on public.forum_agendas
  for delete using (public.is_super_admin() or public.is_admin());

create policy "Anyone can view forum_agenda_items" on public.forum_agenda_items
  for select using (true);
create policy "Admins can insert forum_agenda_items" on public.forum_agenda_items
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update forum_agenda_items" on public.forum_agenda_items
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete forum_agenda_items" on public.forum_agenda_items
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
