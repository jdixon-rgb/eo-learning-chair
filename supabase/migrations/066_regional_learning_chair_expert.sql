-- ============================================================
-- 066 Regional Learning Chair Expert role + region field
-- ============================================================
-- Introduces the first regional-scoped role: a regional Learning Chair
-- Expert oversees all chapter-level Learning Chairs in a given region
-- (e.g. "U.S. West"). She has no chapter_id — she spans multiple — and
-- her dashboard aggregates across every chapter tagged with her region.
--
-- Changes:
--   1. chapters.region (text, nullable) — tag each chapter with a region.
--   2. profiles.region (text, nullable) — for regional-role users.
--   3. member_invites.region (text, nullable) — so an invite can carry
--      region metadata into the profile when the user signs up.
--   4. Add 'regional_learning_chair_expert' to the role check constraints
--      on profiles and member_invites.
--   5. Update handle_new_user to copy invite.region into the new profile.
--   6. Helper function is_regional_learning_chair_expert_for(chapter_id)
--      returns true when the caller has that role AND their region matches
--      the chapter's region. Intended for future cross-chapter read policies
--      (not added in this migration; existing SELECT policies on events /
--      speakers / chapters are already permissive enough for V1 demo).
--
-- Idempotent: all ADD COLUMN / CREATE OR REPLACE / constraint swaps are
-- re-runnable.

-- ── 1. chapters.region ─────────────────────────────────────────────
alter table public.chapters
  add column if not exists region text;

-- ── 2. profiles.region ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists region text;

-- ── 3. member_invites.region ───────────────────────────────────────
alter table public.member_invites
  add column if not exists region text;

-- ── 4a. profiles.role constraint includes regional_learning_chair_expert
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user'
  ));

-- ── 4b. member_invites.role constraint matches
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user'
  ));

-- ── 5. handle_new_user copies region from invite ──────────────────
-- Same shape as 065 but now also copies region from matched invite.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''));

  if coalesce(new.email, '') <> '' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  if not invite_found and normalized_phone <> '' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id, region)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, ''),
      invite.chapter_id,
      invite.region
    );
    update public.member_invites set claimed_at = now() where id = invite.id;
  else
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''), ''),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      'member',
      coalesce(nullif(new.phone, ''), '')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ── 6. Helper for future cross-chapter read policies ──────────────
-- Not yet used by any RLS policy — existing SELECT policies on events /
-- speakers / chapters are already permissive for authenticated users, so
-- V1 frontend can query directly. This helper is the building block for
-- tightening those policies later without losing regional access.
create or replace function public.is_regional_learning_chair_expert_for(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join public.chapters c on c.id = check_chapter_id
    where p.id = auth.uid()
      and p.role = 'regional_learning_chair_expert'
      and p.region is not null
      and p.region = c.region
  );
$$ language sql security definer stable;

notify pgrst, 'reload schema';
