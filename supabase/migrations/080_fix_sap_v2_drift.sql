-- 080_fix_sap_v2_drift.sql
-- Corrective migration: prod's schema_migrations table marks 035 and
-- 037-040 as applied, but the schema objects those migrations were
-- supposed to create are missing in prod (verified by diffing
-- baseline.sql 2026-04-26 against the migration source).
--
-- This blocked migration 078 (a v1.91.0 RLS policy referenced
-- profiles.sap_contact_id from 035, which doesn't exist on prod).
--
-- Per docs/MIGRATION_PLAYBOOK.md: fix forward, never replay. This
-- migration adds every missing object idempotently. It is safe to
-- run on any environment regardless of which subset of 035/037-040
-- objects already exist:
--   - ADD COLUMN IF NOT EXISTS for columns
--   - CREATE TABLE IF NOT EXISTS for tables
--   - CREATE INDEX IF NOT EXISTS for indexes
--   - CREATE OR REPLACE FUNCTION for functions
--   - DROP POLICY IF EXISTS + CREATE POLICY for policies
--
-- Things NOT touched here:
--   - handle_new_user(): prod has the 070 version which intentionally
--     supersedes 035's. Leave alone.
--   - profiles_role_check / member_invites_role_check: prod's baseline
--     already includes 'sap_contact' (likely added by a different
--     migration). No change needed.
--   - 036 (vendor_sap_tier): already applied on prod per baseline.

-- ────────────────────────────────────────────────────────────────
-- From 035: missing columns
-- ────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists sap_contact_id uuid
  references public.sap_contacts(id) on delete set null;

alter table public.sap_contacts
  add column if not exists profile_id uuid
  references public.profiles(id) on delete set null;

-- ────────────────────────────────────────────────────────────────
-- From 035: missing helper function
-- ────────────────────────────────────────────────────────────────

create or replace function public.is_sap_contact()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'sap_contact'
  );
$$ language sql security definer stable;

-- ────────────────────────────────────────────────────────────────
-- From 035: missing policies on existing tables
-- ────────────────────────────────────────────────────────────────

drop policy if exists "SAP contact can view own contact record" on public.sap_contacts;
create policy "SAP contact can view own contact record" on public.sap_contacts
  for select using (profile_id = auth.uid());

drop policy if exists "SAP contact can update own contact record" on public.sap_contacts;
create policy "SAP contact can update own contact record" on public.sap_contacts
  for update using (profile_id = auth.uid());

drop policy if exists "SAP contact can view own partner" on public.saps;
create policy "SAP contact can view own partner" on public.saps
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      where sc.sap_id = id
        and sc.profile_id = auth.uid()
    )
  );

drop policy if exists "SAP contact can view invited events" on public.events;
create policy "SAP contact can view invited events" on public.events
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = any(sap_ids)
    )
  );

-- ────────────────────────────────────────────────────────────────
-- From 037: sap_connect_requests
-- ────────────────────────────────────────────────────────────────

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

alter table public.sap_connect_requests enable row level security;

drop policy if exists "Members can insert connect requests" on public.sap_connect_requests;
create policy "Members can insert connect requests" on public.sap_connect_requests
  for insert with check (auth.uid() = member_id);

drop policy if exists "Members can view own connect requests" on public.sap_connect_requests;
create policy "Members can view own connect requests" on public.sap_connect_requests
  for select using (auth.uid() = member_id);

drop policy if exists "SAP contacts can view partner connect requests" on public.sap_connect_requests;
create policy "SAP contacts can view partner connect requests" on public.sap_connect_requests
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  );

drop policy if exists "SAP contacts can update partner connect requests" on public.sap_connect_requests;
create policy "SAP contacts can update partner connect requests" on public.sap_connect_requests
  for update using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = sap_connect_requests.sap_id
    )
  );

drop policy if exists "Admins can manage connect requests" on public.sap_connect_requests;
create policy "Admins can manage connect requests" on public.sap_connect_requests
  for all using (public.is_admin() or public.is_super_admin());

-- ────────────────────────────────────────────────────────────────
-- From 038: sap_forum_appearances
-- ────────────────────────────────────────────────────────────────

create table if not exists public.sap_forum_appearances (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid not null references public.sap_contacts(id) on delete cascade,
  forum_name text not null default '',
  appearance_date date,
  topic text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_sap_forum_appearances_contact on public.sap_forum_appearances(sap_contact_id);

alter table public.sap_forum_appearances enable row level security;

drop policy if exists "SAP contacts can manage own appearances" on public.sap_forum_appearances;
create policy "SAP contacts can manage own appearances" on public.sap_forum_appearances
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

drop policy if exists "Admins can view all forum appearances" on public.sap_forum_appearances;
create policy "Admins can view all forum appearances" on public.sap_forum_appearances
  for select using (public.is_admin() or public.is_super_admin());

-- ────────────────────────────────────────────────────────────────
-- From 039: sap_chapter_feedback
-- ────────────────────────────────────────────────────────────────

create table if not exists public.sap_chapter_feedback (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  sap_id uuid not null references public.saps(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback_text text default '',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_sap_chapter_feedback_sap on public.sap_chapter_feedback(sap_id);

alter table public.sap_chapter_feedback enable row level security;

drop policy if exists "SAP contacts can submit feedback" on public.sap_chapter_feedback;
create policy "SAP contacts can submit feedback" on public.sap_chapter_feedback
  for insert with check (public.is_sap_contact());

drop policy if exists "SAP contacts can view own feedback" on public.sap_chapter_feedback;
create policy "SAP contacts can view own feedback" on public.sap_chapter_feedback
  for select using (
    sap_contact_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.sap_contact_id = sap_contact_id
    )
  );

drop policy if exists "Leadership can view all SAP feedback" on public.sap_chapter_feedback;
create policy "Leadership can view all SAP feedback" on public.sap_chapter_feedback
  for select using (public.is_admin() or public.is_super_admin());

-- ────────────────────────────────────────────────────────────────
-- From 040: sap_event_engagements
-- ────────────────────────────────────────────────────────────────

create table if not exists public.sap_event_engagements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  role text not null default 'attending'
    check (role in ('attending', 'presenting')),
  topic text default '',
  topic_description text default '',
  time_slot text default '',
  run_of_show_notes text default '',
  av_needs text default '',
  materials_notes text default '',
  materials_url text default '',
  status text not null default 'invited'
    check (status in ('invited', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sap_engagements_event on public.sap_event_engagements(event_id);
create index if not exists idx_sap_engagements_sap on public.sap_event_engagements(sap_id);
create index if not exists idx_sap_engagements_contact on public.sap_event_engagements(sap_contact_id);

alter table public.sap_event_engagements enable row level security;

drop policy if exists "SAP contacts can view own engagements" on public.sap_event_engagements;
create policy "SAP contacts can view own engagements" on public.sap_event_engagements
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

drop policy if exists "SAP contacts can update own engagements" on public.sap_event_engagements;
create policy "SAP contacts can update own engagements" on public.sap_event_engagements
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

drop policy if exists "Admins can manage engagements" on public.sap_event_engagements;
create policy "Admins can manage engagements" on public.sap_event_engagements
  for all using (public.is_admin() or public.is_super_admin());

drop policy if exists "Authenticated can view open event engagements" on public.sap_event_engagements;
create policy "Authenticated can view open event engagements" on public.sap_event_engagements
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.open_to_saps = true
    )
  );

notify pgrst, 'reload schema';
