-- Whitelist Melissa Groen (EO Arizona) in the auth allowlist.
-- Default role is 'member'; upgrade via admin UI if she needs more.
insert into public.member_invites (email, full_name, role, chapter_id)
values (
  'melissa.groen@arizonaeo.com',
  'Melissa Groen',
  'member',
  (select id from public.chapters where name = 'EO Arizona')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id;
