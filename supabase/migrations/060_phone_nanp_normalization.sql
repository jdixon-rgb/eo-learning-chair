-- ============================================================
-- 060 NANP-aware phone normalization in is_invited_member + trigger
-- ============================================================
-- chapter_members.phone (and the values backfilled into member_invites.phone
-- by 058) are inconsistent: some entries store 10 digits ('6027411075')
-- and others store 11 with a leading '1' ('16268402799'). Both refer to
-- the same NANP (US/Canada) number.
--
-- The Supabase phone-OTP path delivers E.164 ('+16027411075') which our
-- trigger digit-strips to 11 digits with a leading '1'. Comparing this
-- to a 10-digit stored value fails — Celia's number was backfilled but
-- couldn't be matched at sign-in.
--
-- Fix: a small helper that strips a leading '1' from any 11-digit string
-- so all NANP variants normalize to the same 10-digit form. Non-NANP
-- international numbers (length != 11) pass through unchanged.

create or replace function public._normalize_phone(p text)
returns text as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
  if length(d) = 11 and substring(d, 1, 1) = '1' then
    d := substring(d, 2);
  end if;
  return d;
end;
$$ language plpgsql immutable;

-- Replace the comparison logic in is_invited_member.
create or replace function public.is_invited_member(
  check_email text default null,
  check_phone text default null
)
returns boolean as $$
  select exists (
    select 1 from public.member_invites
    where (
      check_email is not null
      and check_email <> ''
      and lower(email) = lower(check_email)
    )
    or (
      check_phone is not null
      and check_phone <> ''
      and phone is not null
      and phone <> ''
      and public._normalize_phone(phone) = public._normalize_phone(check_phone)
      and public._normalize_phone(check_phone) <> ''
    )
  );
$$ language sql security definer;

-- Same normalization in the new-user trigger so phone-OTP signups link
-- to the right invite regardless of stored format.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''));

  if new.email is not null and new.email <> '' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
  end if;

  if invite.id is null and normalized_phone <> '' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    coalesce(nullif(new.email, ''), invite.email, ''),
    coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
    coalesce(invite.role, 'member'),
    coalesce(nullif(new.phone, ''), invite.phone, '')
  );

  if invite.id is not null then
    update public.member_invites set claimed_at = now() where id = invite.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;
