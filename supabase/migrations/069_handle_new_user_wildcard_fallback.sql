-- ============================================================
-- 069 handle_new_user wildcard fallback + staff default for chapter wildcards
-- ============================================================
-- Migration 068 added domain-wildcard rows to member_invites and taught
-- is_invited_member to honor them — so a user with an unlisted
-- @arizonaeo.com address can now sign in. But handle_new_user (the
-- profile-creation trigger) was unchanged: it looks up invites by exact
-- email or phone only. So a wildcard-allowlisted user signs in fine,
-- gets a profile created, and the role defaults to 'member'.
--
-- That's wrong for chapter staff. Anyone showing up @arizonaeo.com is
-- almost certainly a staff hire who hasn't been added to the Staff page
-- yet, not a paying chapter member. Defaulting to 'member' silently
-- gives them member-portal access instead of the staff dashboard.
--
-- Fix:
--   1. Extend handle_new_user with a third lookup pass — when no exact
--      email or phone match is found, fall back to a wildcard match on
--      the email domain. Use the wildcard row's role + chapter_id.
--   2. Update the existing *@arizonaeo.com wildcard row's role from
--      'member' to 'chapter_experience_coordinator' — the lower-privilege
--      staff role (admin layout access without the maximum-privilege ED
--      powers like editing chapter config).
--
-- Not claimed: wildcard rows are shared across many users, so we skip the
-- claimed_at update for them. Exact-email rows still get claimed normally.
--
-- Idempotent: CREATE OR REPLACE on the trigger function, narrowly scoped
-- UPDATE on the existing wildcard row. Safe to re-run.

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

  -- Pass 3: domain-wildcard fallback. Picks up users on an allowlisted
  -- domain who don't have an explicit invite row. Uses the wildcard's
  -- role + chapter_id so they land in the right org with sensible perms.
  if not invite_found and coalesce(new.email, '') <> '' and position('@' in new.email) > 0 then
    email_domain := lower(substring(new.email from position('@' in new.email)));
    select * into invite from public.member_invites
      where email like '*@%'
        and lower(substring(email from 2)) = email_domain
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, ''),
      invite.chapter_id
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

-- Upgrade the existing EO Arizona wildcard from 'member' to staff default
update public.member_invites
set role = 'chapter_experience_coordinator',
    full_name = 'EO Arizona staff (domain wildcard)'
where email = '*@arizonaeo.com';

notify pgrst, 'reload schema';
