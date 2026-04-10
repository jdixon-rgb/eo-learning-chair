-- 015_sap_partners.sql
-- Evolve SAPs from person-level to company-level records with tiered
-- partnership levels and a dedicated contacts table.
-- Adds forum-trained tracking per contact (affects what meetings they can attend).

-- ── 1. Evolve saps table → partner (company-level) record ──────

-- Add tier and industry columns
alter table public.saps
  add column if not exists tier text not null default 'gold'
    check (tier in ('platinum', 'gold', 'silver', 'in_kind')),
  add column if not exists industry text default '',
  add column if not exists website text default '',
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive'));

-- Migrate existing data: move "name" → primary contact (done in seed),
-- "company" → name. For any rows where company is populated, use it.
-- (Safe: only one mock SAP row exists in production data.)
update public.saps
  set name = company
  where company is not null and company != '' and company != name;

-- Drop person-level columns from the company record
-- (keep contact_email/phone temporarily for back-compat until contacts table is populated)
alter table public.saps
  drop column if exists role;

-- ── 2. sap_contacts ─────────────────────────────────────────────
-- Per-person contacts at each SAP partner company.
-- One partner has 1–N contacts; exactly one is primary.

create table if not exists public.sap_contacts (
  id uuid primary key default gen_random_uuid(),
  sap_id uuid not null references public.saps(id) on delete cascade,
  name text not null,
  role text default '',
  email text default '',
  phone text default '',
  is_primary boolean not null default false,
  forum_trained boolean not null default false,
  forum_trained_date date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sap_contacts_sap on public.sap_contacts(sap_id);
create index if not exists idx_sap_contacts_forum_trained on public.sap_contacts(forum_trained);

-- ── 3. RLS for sap_contacts ────────────────────────────────────

alter table public.sap_contacts enable row level security;

create policy "Anon can view sap_contacts" on public.sap_contacts
  for select using (true);

create policy "Chapter scoped insert sap_contacts" on public.sap_contacts
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and (public.is_chapter_admin(s.chapter_id) or public.user_chapter_id() = s.chapter_id)
    )
  );

create policy "Chapter scoped update sap_contacts" on public.sap_contacts
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and public.is_chapter_admin(s.chapter_id)
    )
  );

create policy "Chapter scoped delete sap_contacts" on public.sap_contacts
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.saps s
      where s.id = sap_id
        and public.is_chapter_admin(s.chapter_id)
    )
  );
