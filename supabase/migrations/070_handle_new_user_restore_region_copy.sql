-- ============================================================
-- 070 handle_new_user — restore region copy from invite to profile
-- ============================================================
-- Migration 066 added the `region` column to profiles / member_invites
-- and updated handle_new_user to copy it from invite into profile when
-- a new user signs up. Migration 069 then rewrote handle_new_user to
-- add the wildcard-domain fallback path — but the rewrite dropped the
-- `region` column from the profile insert, regressing 066.
--
-- Symptom: a Regional Learning Chair Expert created via member_invites
-- (with role = 'regional_learning_chair_expert' and a region value)
-- ends up with profile.region = NULL on first sign-in, so her Regional
-- Dashboard renders the "no region selected" empty state forever.
--
-- Fix: rebuild handle_new_user combining both pieces — keep all three
-- lookup passes from 069 (exact email, phone, domain wildcard), and
-- restore the `region` copy from 066 in the matched-invite branch.
-- The wildcard branch also copies region (harmless — wildcard rows
-- typically have region = NULL anyway).
--
-- Idempotent: CREATE OR REPLACE on the trigger function. Safe to re-run.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
  email_domain text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''));

  -- Pass 1: exact email match (excluding wildcard rows themselves)
  if coalesce(new.email, '') <> '' then
    select * into invite from public.member_invites
      where email is not null
        and email not like '*@%'
        and lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  -- Pass 2: phone match (NANP-normalized)
  if not invite_found and normalized_phone <> '' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  -- Pass 3: domain-wildcard fallback
  if not invite_found and coalesce(new.email, '') <> '' and position('@' in new.email) > 0 then
    email_domain := lower(substring(new.email from position('@' in new.email)));
    select * into invite from public.member_invites
      where email like '*@%'
        and lower(substring(email from 2)) = email_domain
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
    -- Skip claimed_at for wildcard rows — they're shared across many users
    if invite.email is null or invite.email not like '*@%' then
      update public.member_invites set claimed_at = now() where id = invite.id;
    end if;
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

notify pgrst, 'reload schema';
