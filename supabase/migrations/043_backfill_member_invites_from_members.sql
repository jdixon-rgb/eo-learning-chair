-- Backfill public.member_invites from public.chapter_members.
--
-- Guarantees that every active member in the directory is on the auth
-- allowlist so they can sign in via magic link. The existing UI only calls
-- syncMemberInvites on bulk-import and single-add paths, so any member
-- seeded directly (or imported before that sync was wired up) may be
-- missing from the allowlist.
--
-- Idempotent: on conflict do nothing — never overwrites a claimed invite
-- or a manually-set role.

insert into public.member_invites (email, full_name, role, chapter_id)
select
  lower(trim(cm.email)),
  coalesce(nullif(cm.name, ''), trim(cm.first_name || ' ' || cm.last_name)),
  'member',
  cm.chapter_id
from public.chapter_members cm
where cm.email is not null
  and cm.email <> ''
  and cm.status = 'active'
on conflict (email) do nothing;
