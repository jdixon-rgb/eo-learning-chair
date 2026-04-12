-- 034_sap_contacts_table.sql
-- The sap_contacts table was referenced by sapStore but never created.
-- This caused the entire sapStore hydrate to fail (Promise.all rejected),
-- leaving partners stuck on mock data.

create table if not exists public.sap_contacts (
  id uuid primary key default gen_random_uuid(),
  sap_id uuid not null references public.saps(id) on delete cascade,
  name text not null,
  role text default '',
  email text default '',
  phone text default '',
  is_primary boolean default false,
  forum_trained boolean default false,
  forum_trained_date date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sap_contacts_sap on public.sap_contacts(sap_id);

alter table public.sap_contacts enable row level security;

create policy "Chapter scoped select sap_contacts" on public.sap_contacts
  for select using (
    public.is_super_admin()
    or exists (select 1 from public.saps s where s.id = sap_contacts.sap_id and s.chapter_id = public.user_chapter_id())
  );
create policy "Admin can insert sap_contacts" on public.sap_contacts
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admin can update sap_contacts" on public.sap_contacts
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admin can delete sap_contacts" on public.sap_contacts
  for delete using (public.is_super_admin() or public.is_admin());

notify pgrst, 'reload schema';
