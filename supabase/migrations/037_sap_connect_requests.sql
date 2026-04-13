-- 037_sap_connect_requests.sql
-- Members can request to connect with an SAP partner.
-- SAP contacts see these as leads in their portal.

create table if not exists public.sap_connect_requests (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  member_name text not null default '',
  member_company text default '',
  message text default '',
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sap_connect_sap on public.sap_connect_requests(sap_id);
create index if not exists idx_sap_connect_status on public.sap_connect_requests(sap_id, status);

-- RLS
alter table public.sap_connect_requests enable row level security;

-- Members can create their own requests
create policy "Members can insert connect requests" on public.sap_connect_requests
  for insert with check (auth.uid() = member_id);

-- Members can view their own requests
create policy "Members can view own connect requests" on public.sap_connect_requests
  for select using (auth.uid() = member_id);

-- SAP contacts can view requests for their partner
create policy "SAP contacts can view partner connect requests" on public.sap_connect_requests
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  );

-- SAP contacts can update status on requests for their partner
create policy "SAP contacts can update partner connect requests" on public.sap_connect_requests
  for update using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  );

-- Admins have full access
create policy "Admins can manage connect requests" on public.sap_connect_requests
  for all using (public.is_admin() or public.is_super_admin());
