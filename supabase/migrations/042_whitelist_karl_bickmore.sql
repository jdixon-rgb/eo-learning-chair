-- Whitelist Karl Bickmore (President Elect, EO Arizona) in the auth allowlist.
insert into public.member_invites (email, full_name, role, chapter_id)
values (
  'kbickmore@snaptechit.com',
  'Karl Bickmore',
  'president_elect',
  (select id from public.chapters where name = 'EO Arizona')
)
on conflict (email) do update set
  full_name  = excluded.full_name,
  role       = excluded.role,
  chapter_id = excluded.chapter_id;
