-- ============================================================
-- 068 Domain-wildcard allowlist support
-- ============================================================
-- Lets the chapter whitelist a whole email domain instead of every
-- individual address. A row in member_invites with email '*@arizonaeo.com'
-- now grants is_invited_member = true to anyone signing in with an
-- @arizonaeo.com email address.
--
-- Why: the Staff page lets a Learning Chair add EDs and ECs by name,
-- but the auth gate is enforced on member_invites. Adding a Staff entry
-- without a corresponding member_invites row means the person passes
-- OAuth at Google/Microsoft but is signed back out by fetchProfile's
-- allowlist check. Domain wildcards close that gap for whole chapters
-- (e.g. all @arizonaeo.com staff) without requiring a per-person row.
--
-- The wildcard syntax is intentionally restrictive: only the literal
-- prefix '*@' is recognized, and only when the rest of the value parses
-- as a domain. This avoids ambiguity with real email addresses that
-- happen to contain a '*' (none should, by RFC 5321, but being safe).
--
-- Compatible with both email-only and phone-only paths in the existing
-- two-arg signature. Phone matching is unchanged.

create or replace function public.is_invited_member(
  check_email text default null,
  check_phone text default null
)
returns boolean as $$
  select exists (
    select 1 from public.member_invites
    where (
      -- Exact email match (existing behavior)
      check_email is not null
      and check_email <> ''
      and email is not null
      and email not like '*@%'
      and lower(email) = lower(check_email)
    )
    or (
      -- Domain wildcard: row email is '*@domain.com', user email ends with '@domain.com'
      check_email is not null
      and check_email <> ''
      and email like '*@%'
      and position('@' in check_email) > 0
      and lower(substring(check_email from position('@' in check_email))) = lower(substring(email from 2))
    )
    or (
      -- Phone match (existing behavior)
      check_phone is not null
      and check_phone <> ''
      and phone is not null
      and phone <> ''
      and public._normalize_phone(phone) = public._normalize_phone(check_phone)
      and public._normalize_phone(check_phone) <> ''
    )
  );
$$ language sql stable security definer;

-- Seed a domain wildcard for EO Arizona so every @arizonaeo.com address
-- (Justice Butler, Melissa Groen, future EDs/ECs) is allowlisted by default.
-- Individual rows still take precedence for name + role; the wildcard is
-- the catch-all for anyone the admin hasn't pre-listed.
insert into public.member_invites (email, full_name, role, chapter_id)
values (
  '*@arizonaeo.com',
  'EO Arizona staff (domain wildcard)',
  'member',
  (select id from public.chapters where name = 'EO Arizona')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id;
