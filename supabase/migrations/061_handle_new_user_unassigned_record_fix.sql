-- ============================================================
-- 061 Fix handle_new_user record-not-assigned error on phone signup
-- ============================================================
-- Migration 060 left a PL/pgSQL bug: the email-match SELECT INTO is
-- inside an IF block that's skipped on phone-only signups (when
-- new.email is null). That left the `invite` record unassigned, and
-- the subsequent `IF invite.id IS NULL` raised
-- "record 'invite' is not assigned yet | The tuple structure of a
-- not-yet-assigned record is indeterminate" (SQLSTATE 55000).
--
-- GoTrue catches the trigger error and returns "Database error saving
-- new user" to the client. Both phone-OTP and any future email signup
-- path that fails to enter the email IF would hit this.
--
-- Fix: track success with a FOUND-style boolean instead of accessing
-- invite.id, and split the INSERT into matched/unmatched branches so
-- we never read invite fields when the record isn't assigned.

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
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, '')
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
