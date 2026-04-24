-- ============================================================
-- 067 Surface last_sign_in_at on profiles + sync trigger
-- ============================================================
-- Regional oversight roles (and platform admins on the super-admin
-- dashboard) want to see "is this chair actually using the app?"
-- auth.users.last_sign_in_at has the data; denormalize it to
-- public.profiles so the frontend can query it alongside role and
-- full_name in a single SELECT without punching through to auth.
--
-- Three parts:
--   1. Add profiles.last_sign_in_at (nullable timestamptz).
--   2. Sync trigger on auth.users that copies last_sign_in_at into
--      public.profiles whenever it changes (i.e. on every sign-in).
--   3. One-time backfill from auth.users so historical data is
--      present immediately, not just from the next sign-in forward.
--
-- Idempotent. The trigger uses CREATE OR REPLACE FUNCTION + a
-- DROP TRIGGER / CREATE TRIGGER pair so re-runs are safe.

alter table public.profiles
  add column if not exists last_sign_in_at timestamptz;

create or replace function public.sync_profile_last_sign_in()
returns trigger as $$
begin
  -- Only fire when the value actually changes. Avoids redundant
  -- writes on UPDATE statements that touch other auth.users columns.
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles
    set last_sign_in_at = new.last_sign_in_at
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists sync_profile_last_sign_in_trigger on auth.users;
create trigger sync_profile_last_sign_in_trigger
  after update on auth.users
  for each row execute function public.sync_profile_last_sign_in();

-- Backfill: copy current auth.users.last_sign_in_at into profiles
-- for any profile where the column is still null.
update public.profiles p
set last_sign_in_at = u.last_sign_in_at
from auth.users u
where u.id = p.id
  and p.last_sign_in_at is null
  and u.last_sign_in_at is not null;

notify pgrst, 'reload schema';
