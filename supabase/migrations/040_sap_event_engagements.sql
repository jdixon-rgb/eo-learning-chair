-- 040_sap_event_engagements.sql
-- SAP partners can be invited to attend OR present at events.
-- Presenting involves logistics: topic, AV, run of show, materials.
-- One row per SAP contact per event.

create table if not exists public.sap_event_engagements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  role text not null default 'attending'
    check (role in ('attending', 'presenting')),
  -- Presenting logistics (filled by partner, reviewed by chapter)
  topic text default '',
  topic_description text default '',
  time_slot text default '',
  run_of_show_notes text default '',
  av_needs text default '',
  materials_notes text default '',
  materials_url text default '',
  -- Engagement status
  status text not null default 'invited'
    check (status in ('invited', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sap_engagements_event on public.sap_event_engagements(event_id);
create index if not exists idx_sap_engagements_sap on public.sap_event_engagements(sap_id);
create index if not exists idx_sap_engagements_contact on public.sap_event_engagements(sap_contact_id);

-- RLS
alter table public.sap_event_engagements enable row level security;

-- SAP contacts can view their own engagements
create policy "SAP contacts can view own engagements" on public.sap_event_engagements
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

-- SAP contacts can update their own engagements (logistics fields)
create policy "SAP contacts can update own engagements" on public.sap_event_engagements
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.sap_contact_id = sap_contact_id
    )
  );

-- Admins have full access
create policy "Admins can manage engagements" on public.sap_event_engagements
  for all using (public.is_admin() or public.is_super_admin());

-- Authenticated users can view engagements for open events
create policy "Authenticated can view open event engagements" on public.sap_event_engagements
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.open_to_saps = true
    )
  );
