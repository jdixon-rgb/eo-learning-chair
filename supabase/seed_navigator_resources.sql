-- seed_navigator_resources.sql
-- Seeds 10 starter Conversation Library resources for the Engagement Chair.
-- Safe to re-run: uses ON CONFLICT on (chapter_id, title).
--
-- IMPORTANT: edit the chapter name on the next line to match your chapter
-- (looks up by chapters.name).

with target_chapter as (
  select id from public.chapters where name = 'EO Arizona' limit 1
)
insert into public.navigator_resources
  (chapter_id, title, summary, body, link_url, category, contributor_name, contributor_role, status)
select id, t.title, t.summary, t.body, t.link_url, t.category, t.contributor_name, t.contributor_role, 'published'
from target_chapter,
(values
  -- ── FAQs (the honest, lived-in answers) ──
  (
    'What does EO actually require of me?',
    'The honest version: this is not something you get infected by. You have to carry your bag.',
    'Most new members are told EO is about peer learning, growth, and connection — and it is. What''s often left out is that none of it gets handed to you. The members who get the most value are the ones who treat EO like a customer they''re trying to win: they market themselves to it. They show up to learning events even when it''s inconvenient. They build relationships before they need them. They sacrifice a Tuesday night with their family because they know what they''re investing in. If you wait for value to come to you, it won''t. If you go get it, there''s nothing else like it.',
    '',
    'faq',
    'A tenured EO member',
    'tenured_member'
  ),
  (
    'I''m not getting value from EO. What''s wrong?',
    'Usually, nothing — except attendance. The members who say this almost never go to events.',
    'When a member says they''re not getting value, the first question is: what have you actually shown up to? Learning events? Socials? Forum? The pattern is almost always the same — the people who feel disconnected are the people who haven''t been in the room. EO isn''t a subscription; it''s a community, and communities only work if you''re in them. If you''re reading this and you haven''t been to a learning event in three months, that''s your answer. Start there.',
    '',
    'faq',
    'A tenured EO member',
    'tenured_member'
  ),
  -- ── Forum journey ──
  (
    'What is forum, really?',
    'A small group of ~10 members who meet monthly for 4–5 hours and know each other deeply.',
    'A forum is one of the most distinctive things about EO. About ten members meet once a month for four and a half to five hours. They go on retreats and longer trips together throughout the year. Confidentiality is taken extremely seriously — people share real business problems, real personal struggles, real fears. It''s not networking. It''s not a mastermind in the casual sense. It''s a small group of people who agree to know each other at a depth most adults never experience outside their families. You don''t join one immediately. There''s a journey to forum-readiness, and your Navigator will walk you through it.',
    '',
    'forum_journey',
    'A tenured EO member',
    'tenured_member'
  ),
  -- ── Ways to get value from EO ──
  (
    'EO University programs',
    'Multi-day learning experiences with world-class faculty, hosted around the world.',
    'EO Universities are immersive learning programs — typically 3 to 5 days — held in cities all over the world, featuring instructors and speakers you usually can''t access at any price. They''re one of the highest-leverage things EO offers, and they''re open to any member. Ask your Navigator how to find the upcoming calendar.',
    '',
    'university',
    '',
    'chair'
  ),
  (
    'The path to chapter leadership and GLC',
    'How members move into board roles, and what GLC (Global Leadership Conference) is.',
    'Many of the members you''ll meet who seem to know everyone got there by serving on the chapter board. Board roles range from Learning Chair to Member Engagement to Communications and beyond. Each year, board members from chapters around the world gather at GLC — the Global Leadership Conference — to learn how to lead their chapters better. It''s one of the most concentrated leadership development experiences EO offers. If you''re curious about leadership, ask.',
    '',
    'leadership_path',
    '',
    'chair'
  ),
  (
    'Seed Moderator Training',
    'A first step toward learning how to facilitate forum-style conversations.',
    'Seed Moderator Training is the entry point for members who want to learn how to facilitate the deep, structured conversations that happen in forum. You don''t have to commit to becoming a forum moderator to take it — many members do it just to become better listeners and better questioners in their own businesses and relationships.',
    '',
    'seed_moderator_training',
    '',
    'chair'
  ),
  (
    'Moderator Training',
    'The full training to lead a forum — one of the most respected skills in EO.',
    'Full Moderator Training is the deeper version of Seed — preparing members to actually lead a forum. Moderators are the heart of the forum experience, and the training is widely regarded as one of the most valuable things EO teaches. Even members who never moderate say it changed how they show up in every conversation.',
    '',
    'moderator_training',
    '',
    'chair'
  ),
  (
    'EO Coaching skill-building',
    'Learn to coach — for your business, your forum, and yourself.',
    'EO offers structured coaching education for members who want to develop their coaching skills. Whether you''re trying to become a better leader inside your company, support your forum-mates better, or just have more useful conversations with the people you care about — coaching is one of the most transferable skills you can build here. Ask your Navigator about upcoming sessions.',
    '',
    'coaching',
    'Sue Hesse',
    'external_coach'
  ),
  (
    'Next Level (formerly Forum Mashup)',
    'A chance to experience forum-style conversation with members from outside your own forum.',
    'Next Level — which used to be called Forum Mashup — is a structured event where members from different forums come together for forum-style conversations. It''s a great way to experience the depth of forum before you join one, and it''s a great way for current forum members to broaden their relationships in the chapter.',
    '',
    'next_level',
    '',
    'chair'
  ),
  (
    'MyEO interest groups',
    'Find members around the world who share your hobbies, industries, and passions.',
    'MyEO is a global network of interest-based groups inside EO. There are groups for everything — wine, motorcycles, family business, women entrepreneurs, specific industries, specific sports. If you have an interest, there''s likely a MyEO group of people who share it, and many of them organize trips and events together. It''s one of the easiest ways to find your people inside the broader EO community.',
    '',
    'myeo_events',
    '',
    'chair'
  )
) as t(title, summary, body, link_url, category, contributor_name, contributor_role)
on conflict do nothing;

notify pgrst, 'reload schema';
