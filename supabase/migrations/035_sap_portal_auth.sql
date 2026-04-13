-- 035_sap_portal_auth.sql
-- Add sap_contact as a first-class app role so SAP partner contacts
-- can authenticate via magic link and access their own portal.

-- ── 1. Add sap_contact to profiles role CHECK ──────────────────

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact'
  ));

-- ── 2. Add sap_contact to member_invites role CHECK ────────────

alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact'
  ));

-- ── 3. Add sap_contact_id FK on profiles ──────────────────────

alter table public.profiles
  add column if not exists sap_contact_id uuid references public.sap_contacts(id) on delete set null;

-- ── 4. Add profile_id back-reference on sap_contacts ──────────

alter table public.sap_contacts
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- ── 5. Update handle_new_user() trigger ────────────────────────
-- When the claimed invite is for sap_contact, resolve the link.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  resolved_sap_contact_id uuid;
begin
  select * into invite from public.member_invites
    where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, chapter_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
    coalesce(invite.role, 'member'),
    invite.chapter_id
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  -- Link SAP contact profile ↔ sap_contacts record
  if invite.role = 'sap_contact' then
    select id into resolved_sap_contact_id
      from public.sap_contacts
      where lower(email) = lower(new.email)
      limit 1;

    if resolved_sap_contact_id is not null then
      update public.profiles
        set sap_contact_id = resolved_sap_contact_id
        where id = new.id;

      update public.sap_contacts
        set profile_id = new.id
        where id = resolved_sap_contact_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ── 6. RLS helper: is_sap_contact() ───────────────────────────

create or replace function public.is_sap_contact()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'sap_contact'
  );
$$ language sql security definer stable;

-- ── 7. RLS: SAP contacts can read their own sap_contacts row ──

create policy "SAP contact can view own contact record" on public.sap_contacts
  for select using (
    profile_id = auth.uid()
  );

create policy "SAP contact can update own contact record" on public.sap_contacts
  for update using (
    profile_id = auth.uid()
  );

-- ── 8. RLS: SAP contacts can read their own saps (partner) row ─

create policy "SAP contact can view own partner" on public.saps
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      where sc.sap_id = id
        and sc.profile_id = auth.uid()
    )
  );

-- ── 9. RLS: SAP contacts can read events they're invited to ───

create policy "SAP contact can view invited events" on public.events
  for select using (
    exists (
      select 1 from public.sap_contacts sc
      join public.profiles p on p.sap_contact_id = sc.id
      where p.id = auth.uid()
        and sc.sap_id = any(sap_ids)
    )
  );
