-- ============================================================
-- 058 SMS-OTP sign-in (phone-based auth as parallel to email magic link)
-- ============================================================
-- Adds phone-based authentication so members can sign in via SMS one-time
-- passcode when email magic links are unreliable (corporate gateway
-- filtering, members on the road without inbox access, etc.).
--
-- Mirrors the email allowlist pattern: phone numbers populated on
-- public.member_invites act as the auth gate for the SMS-OTP path,
-- exactly as email does for the magic-link path.
--
-- Phone storage convention: digits only, no '+' prefix
-- (matches existing public.chapter_members.phone format, e.g. '14802422455').
-- Matching strips non-digits on both sides, so input format on the client
-- is forgiving.

-- ── 1. Add phone column to member_invites ───────────────────────────
alter table public.member_invites
  add column if not exists phone text;

create index if not exists idx_member_invites_phone
  on public.member_invites (phone)
  where phone is not null and phone <> '';

-- ── 2. Backfill from chapter_members ────────────────────────────────
-- Idempotent: only fills empty phone values, never overwrites.
update public.member_invites mi
set phone = regexp_replace(cm.phone, '[^0-9]', '', 'g')
from public.chapter_members cm
where lower(mi.email) = lower(cm.email)
  and cm.phone is not null
  and cm.phone <> ''
  and (mi.phone is null or mi.phone = '');

-- ── 3. is_invited_member: accept email OR phone ─────────────────────
-- Existing callers passing only check_email continue to work (named args).
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
      and regexp_replace(phone, '[^0-9]', '', 'g')
        = regexp_replace(check_phone, '[^0-9]', '', 'g')
    )
  );
$$ language sql security definer;

-- ── 4. handle_new_user: support phone-only signups ──────────────────
-- Supabase phone auth creates auth.users with phone in E.164 ('+14802422455')
-- and email NULL. We try email lookup first (preserves prior behavior for
-- magic-link signups), then fall back to a digits-only phone match.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  normalized_phone text;
begin
  normalized_phone := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');

  if new.email is not null and new.email <> '' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
  end if;

  if invite.id is null and normalized_phone <> '' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''
        and regexp_replace(phone, '[^0-9]', '', 'g') = normalized_phone
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
