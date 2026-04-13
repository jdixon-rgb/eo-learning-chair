-- 038_sap_forum_appearances.sql
-- SAP contacts can log forums they've spoken at.

create table if not exists public.sap_forum_appearances (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid not null references public.sap_contacts(id) on delete cascade,
  forum_name text not null default '',
  appearance_date date,
  topic text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_sap_forum_appearances_contact on public.sap_forum_appearances(sap_contact_id);

-- RLS
alter table public.sap_forum_appearances enable row level security;

-- SAP contacts can manage their own appearances
create policy "SAP contacts can manage own appearances" on public.sap_forum_appearances
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

-- Admins can read all
create policy "Admins can view all forum appearances" on public.sap_forum_appearances
  for select using (public.is_admin() or public.is_super_admin());
