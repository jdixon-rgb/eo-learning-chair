-- ============================================================
-- 065 Restore chapter_id linkage in handle_new_user + backfill
-- ============================================================
-- Regression: migration 060 rewrote handle_new_user to support phone OTP
-- signups, but dropped `chapter_id` from the INSERT into profiles.
-- Migration 061 fixed the "record not assigned" PL/pgSQL bug but carried
-- forward the same omission. Result: when an invited user signs up, their
-- profile is created with chapter_id = NULL even when the matched invite
-- has a chapter_id. Symptom: super-admin invites a Learning Chair to a
-- new chapter, user signs in, profile is orphaned (no chapter binding),
-- user doesn't appear in the chapter's Members table.
--
-- Fix has two parts:
--   1. Re-define handle_new_user to copy invite.chapter_id into the new
--      profile row (restoring behavior from migration 002).
--   2. Backfill any existing orphaned profiles whose email matches a
--      claimed invite — set profile.chapter_id from invite.chapter_id.
--
-- Idempotent: CREATE OR REPLACE and an UPDATE that only touches rows
-- where chapter_id is currently NULL. Safe to re-run.

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
    insert into public.profiles (id, email, full_name, role, phone, chapter_id)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, ''),
      invite.chapter_id
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

-- ── Backfill: fix orphaned profiles whose invite had a chapter_id ──
-- Only touches profiles where chapter_id is currently NULL, so safe
-- for users who have been manually reassigned.
update public.profiles p
set chapter_id = i.chapter_id
from public.member_invites i
where p.chapter_id is null
  and i.chapter_id is not null
  and lower(i.email) = lower(p.email);

notify pgrst, 'reload schema';
