-- ============================================================
-- EO Learning Chair — Seed Data
-- Run this AFTER 001_add_app_tables.sql
-- Uses deterministic UUIDs so FK references work
-- ============================================================

begin;

-- ── Chapter ──
insert into public.chapters (id, name, fiscal_year_start, total_budget, president_theme, president_name)
values (
  '00000000-0000-4000-a000-000000000001',
  'EO Arizona', 8, 450000, 'Every Day', ''
) on conflict (id) do nothing;

-- ── Venues ──
insert into public.venues (id, chapter_id, name, address, capacity, base_rental_cost, av_quality, av_cost_estimate, venue_type, pipeline_stage, staff_rating, description, notes) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'Any Ballroom (TBD)', 'Scottsdale/Phoenix, AZ', 200, 5000, 'good', 3500, 'hotel', 'researching', null, 'Generic ballroom placeholder for traditional learning events.', 'Generic ballroom placeholder. Good for traditional learning events with blindfold experience.'),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'Heard Museum', '2301 N Central Ave, Phoenix, AZ 85004', 150, 4000, 'good', 3000, 'museum', 'site_visit', 4, 'World-renowned museum of American Indian art and history. Cultural setting for empathy/kindness themes.', 'Cultural venue. Great setting for empathy/kindness themes.'),
  ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'Spring Training Field - Scottsdale', 'Scottsdale, AZ', 100, 3000, 'fair', 5000, 'outdoor', 'quote_requested', 3, 'Outdoor baseball venue. Experiential setting for Jim Abbott event.', 'Experiential venue for Jim Abbott. Outdoor - need strong AV.'),
  ('10000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000001', 'Ullman Terrace at Desert Botanical Garden', '1201 N Galvin Pkwy, Phoenix, AZ 85008', 120, 6000, 'good', 4000, 'outdoor', 'negotiating', 5, 'Stunning outdoor terrace surrounded by desert flora. Perfect for immersive gathering experiences.', 'Stunning outdoor terrace. Perfect for Priya Parker and the Art of Gathering theme.'),
  ('10000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'Next Level', 'Scottsdale, AZ', 64, 3000, 'good', 2000, 'restaurant', 'confirmed', 4, 'Upscale Scottsdale restaurant with private dining. Ideal for Jeffersonian-style dinners.', 'Jeffersonian Dinner venue. 8 tables of 8.'),
  ('10000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'The Dorrance DOME', 'Phoenix, AZ', 200, 5000, 'excellent', 3000, 'other', 'negotiating', 5, 'Iconic domed event space in Phoenix. Excellent AV and dramatic atmosphere.', 'January double-header venue. Dr. Paul Davies + Wesley Huff.'),
  ('10000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000001', 'The Wrigley Mansion', '2501 E Telewa Trail, Phoenix, AZ 85016', 100, 7000, 'good', 3500, 'private', 'site_visit', 5, 'Historic hilltop mansion with panoramic views. Iconic Arizona landmark for elegant events.', 'Iconic venue. Perfect for Dr. Gary Chapman / 5 Love Languages / Rose Ceremony.'),
  ('10000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000001', 'Scottsdale Civic Center Park', '3939 N Drinkwater Blvd, Scottsdale, AZ 85251', 200, 2000, 'fair', 6000, 'outdoor', 'researching', 3, 'Central outdoor park in downtown Scottsdale. Open-air venue needing full AV setup.', 'Outdoor park. Cesar Millan "bring your dog" event. Need strong outdoor AV.'),
  ('10000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000001', 'Musical Instrument Museum', '4725 E Mayo Blvd, Phoenix, AZ 85050', 150, 5000, 'excellent', 2000, 'museum', 'quote_requested', 4, 'World-class museum with built-in acoustics and performance spaces. Ideal for lecture-performance events.', 'Indre Viskontas lecture-performance venue. Built-in acoustics.')
on conflict (id) do nothing;

-- ── Speakers ──
insert into public.speakers (id, chapter_id, name, topic, bio, fee_range_low, fee_range_high, contact_email, contact_phone, agency_name, agency_contact, contact_method, pipeline_stage, fit_score, notes, routing_flexibility, multi_chapter_interest) values
  ('20000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'Salim Ismail', 'Exponential Organizations - AI, Disruption & the Future', 'Author of "Exponential Organizations." Former Executive Director of Singularity University. Leading voice on how AI and exponential technologies are transforming business and society.', 30000, 50000, '', '', '', '', 'direct', 'outreach', 10, 'KICKOFF SPEAKER. AI-themed kickoff for the "Every Day" theme - every day the world is changing exponentially. Salim shows us how to ride the wave instead of being swept away.', false, true),
  ('20000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'Erik Weihenmayer', 'Overcoming the Impossible - First Blind Everest Summiteer', 'First blind person to reach the summit of Mount Everest (May 25, 2001). Climbed all Seven Summits. Motivational speaker and author.', 30000, 50000, '', '', 'Chartwell Speakers', '', 'agency', 'passed', 9, 'Originally planned for August kickoff. Replaced with Salim Ismail (AI-themed kickoff). Blindfold experience concept shelved. Could be revisited for a future month.', false, false),
  ('20000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'Brad Montague', 'Joyful Rebellion - Kindness, Empathy & Playfulness', 'Creator known for emphasizing kindness, empathy, and maintaining a sense of playfulness. Advocates for "joyful rebellion" - challenging negativity with positivity.', 10000, 20000, '', '', '', '', 'direct', 'outreach', 8, 'Submitted booking request via montagueworkshop.com/contact. Great CHANGE theme fit. Embracing our inner child leads to a more compassionate world.', true, false),
  ('20000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000001', 'Jim Abbott', 'Discipline & Overcoming - Born Without a Right Hand, Pitched for the Yankees', 'Overcame being born without a right hand to pitch for the New York Yankees, including throwing a no-hitter.', 15000, 40000, '', '', 'AAE Speakers Bureau', '', 'agency', 'outreach', 9, 'Sent booking request to AAE. DISCIPLINE theme. Spring Training Field venue - experiential setting.', false, false),
  ('20000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'Priya Parker', 'The Art of Gathering - Connection, Purpose & Belonging', 'Author of The Art of Gathering. Teaches how to design gatherings that create connection, purpose, and belonging. Excellent for leaders who want practical tools to deepen relationships at scale.', 25000, 40000, '', '', 'Celebrity Talent', 'celebritytalent.net', 'agency', 'outreach', 10, 'Submitted request via Celebrity Talent. RELATIONSHIPS theme. We all know what makes EO relationships special - Priya gives us tools to bring that je ne sais quoi to ALL our relationships. Speaking sample: youtube.com/watch?v=ppfONdsOkWI', false, false),
  ('20000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'Dr. Paul Davies', 'The Universe, Physics & the Big Questions', 'Theoretical physicist, cosmologist, and astrobiologist. ASU professor. Deep thinker on the origin of life and the nature of the universe.', 10000, 20000, '', '', '', '', 'direct', 'outreach', 8, 'UNIVERSE theme. January double-header with Wesley Huff at The Dorrance DOME. Email and phone requests sent.', false, false),
  ('20000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000001', 'Wesley Huff', 'Faith, Reason & the Universe', 'Speaker on faith and reason. Paired with Dr. Paul Davies for a compelling dialogue on the universe.', 5000, 20000, '', '', '', '', 'direct', 'outreach', 7, 'UNIVERSE theme. January double-header with Dr. Paul Davies at The Dorrance DOME. Email and phone requests sent.', false, false),
  ('20000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000001', 'Dr. Gary Chapman', 'The 5 Love Languages - Relationships That Thrive Every Day', 'Author of "The 5 Love Languages: How to Express Heartfelt Commitment to Your Mate." One of the most influential relationship authors alive.', 10000, 20000, '', '', '', '5lovelanguages.com', 'direct', 'outreach', 9, 'Submitted booking request. RELATIONSHIPS theme. Unexpected: Jesse Palmer from The Bachelor. Marriage can be a challenge - if you treat EVERY DAY like a gift, you can make meaningful progress.', false, false),
  ('20000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000001', 'Cesar Millan', 'Discipline, Energy & the Dog Whisperer Approach to Leadership', 'World-famous dog behaviorist. Known as the Dog Whisperer. Teaches how discipline, calm energy, and intentional approach transforms relationships.', 50000, 100000, '', '1.800.698.2536', '', '', 'direct', 'passed', 10, 'Dropped from FY calendar. Fee range ($50-100K) was high. Could revisit for future year.', false, false),
  ('20000000-0000-4000-a000-000000000010', '00000000-0000-4000-a000-000000000001', 'Indre Viskontas', 'Music, Neuroscience & the Universe of Sound', 'Soprano with a PhD in neuroscience who gives lecture-performances on how music reshapes attention and emotion.', null, null, '', '', '', '', 'direct', 'outreach', 8, 'Left message via website. UNIVERSE theme. The universe of Music - how it can help you reset your mind, adjust your attitude, and frame your emotional state. Speaking sample: youtube.com/watch?v=AJYRJ92g4GI', false, false)
on conflict (id) do nothing;

-- ── SAPs ──
-- SAP partners are managed through the app UI; no seed data.

-- ── Events ──
insert into public.events (id, chapter_id, title, event_date, event_time, month_index, event_type, event_format, strategic_importance, status, speaker_id, candidate_speaker_ids, sap_ids, venue_id, day_chair_name, day_chair_phone, expected_attendance, notes, theme_connection) values
  ('40000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'CHANGE: The Exponential Future', '2026-08-13', '18:00', 0, 'traditional', 'keynote', 'kickoff', 'planning', '20000000-0000-4000-a000-000000000001', '{20000000-0000-4000-a000-000000000001}', '{}', '10000000-0000-4000-a000-000000000001', '', '', 150, 'KICKOFF EVENT. AI-themed kickoff with Salim Ismail. Set the tone for the "Every Day" year - the world changes every day, and exponential thinking is how we stay ahead.', 'CHANGE - Every day the world is changing exponentially. Salim Ismail shows us how to harness AI and exponential tech to transform our businesses and lives.'),
  ('40000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'CHANGE: Joyful Rebellion', '2026-09-24', '18:00', 1, 'traditional', 'keynote', 'momentum', 'planning', '20000000-0000-4000-a000-000000000003', '{20000000-0000-4000-a000-000000000003}', '{}', '10000000-0000-4000-a000-000000000002', '', '', 100, 'Brad Montague at the Heard Museum.', 'CHANGE - Every day is a chance to challenge negativity with positivity. Treat everyone with dignity and respect. Embrace your inner child.'),
  ('40000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'DISCIPLINE: No Excuses', '2026-10-28', '18:00', 2, 'experiential', 'keynote', 'momentum', 'planning', '20000000-0000-4000-a000-000000000004', '{20000000-0000-4000-a000-000000000004}', '{}', '10000000-0000-4000-a000-000000000003', '', '', 100, 'Jim Abbott at Spring Training Field. Experiential setting.', 'DISCIPLINE - Born without a right hand, Jim Abbott pitched a no-hitter for the Yankees. Every day he chose discipline over excuse.'),
  ('40000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000001', 'RELATIONSHIPS: The Art of Gathering', '2026-11-13', '18:00', 3, 'traditional', 'keynote', 'momentum', 'planning', '20000000-0000-4000-a000-000000000005', '{20000000-0000-4000-a000-000000000005}', '{}', '10000000-0000-4000-a000-000000000004', '', '', 120, 'Priya Parker at Ullman Terrace, Desert Botanical Garden.', 'RELATIONSHIPS - We all know what makes EO relationships special. Priya gives us tools to bring that je ne sais quoi to ALL our relationships.'),
  ('40000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'RELATIONSHIPS: Jeffersonian Dinner', '2027-01-07', '18:30', 5, 'key_relationships', 'dinner', 'renewal_critical', 'planning', null, '{}', '{}', '10000000-0000-4000-a000-000000000005', '', '', 64, 'Moved from December to January. Jeffersonian Dinner - groups sorted to produce Respect and Joy. Two January events back-to-back with Davies/Huff on Jan 19.', 'RELATIONSHIPS - 8 tables of 8, sorted first to produce Respect, and second, Joy. Deep connection over shared food.'),
  ('40000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'UNIVERSE: The Big Questions', '2027-01-19', '18:00', 5, 'traditional', 'keynote', 'renewal_critical', 'planning', '20000000-0000-4000-a000-000000000006', '{20000000-0000-4000-a000-000000000006,20000000-0000-4000-a000-000000000007}', '{}', '10000000-0000-4000-a000-000000000006', '', '', 150, 'RENEWAL MONTH - must be strong. Double-header: Dr. Paul Davies + Wesley Huff at The Dorrance DOME.', 'UNIVERSE - Every day, the universe invites us to ask bigger questions. Two brilliant minds, one dome, infinite wonder.'),
  ('40000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000001', 'RELATIONSHIPS: The 5 Love Languages', '2027-02-02', '18:00', 6, 'traditional', 'workshop_4hr', 'renewal_critical', 'planning', '20000000-0000-4000-a000-000000000008', '{20000000-0000-4000-a000-000000000008}', '{}', '10000000-0000-4000-a000-000000000007', '', '', 100, 'RENEWAL MONTH - critical for retention. Dr. Gary Chapman at The Wrigley Mansion. Unexpected: Jesse Palmer from The Bachelor.', 'RELATIONSHIPS - Marriage can be a challenge. But if you treat EVERY DAY like a gift, an opportunity to start fresh, you can make meaningful progress toward restoring and building one of the most important relationships in your life.'),
  ('40000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000001', 'UNIVERSE: Music & the Mind', '2027-04-27', '18:00', 8, 'experiential', 'keynote', 'sustain', 'planning', '20000000-0000-4000-a000-000000000010', '{20000000-0000-4000-a000-000000000010}', '{}', '10000000-0000-4000-a000-000000000009', '', '', 120, 'Indre Viskontas lecture-performance at Music Museum or Phoenix Symphony.', 'UNIVERSE - The universe of Music and how it can help you reset your mind, adjust your attitude, and frame your emotional state. You see God''s work within its ordered beauty.'),
  ('40000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000001', 'Gratitude Gala', '2027-05-14', '18:00', 9, 'social', 'dinner', 'strong_close', 'planning', null, '{}', '{}', null, '', '', 150, 'FINAL EVENT of the FY. Gratitude Gala - celebrate the year, recognize day chairs, thank the president. Venue TBD.', 'Every Day is a gift - and tonight we celebrate a year of growth, connection, and gratitude. Thank you for making Every Day count.')
on conflict (id) do nothing;

-- ── Budget Items ──
insert into public.budget_items (event_id, category, description, budget_amount, actual_amount) values
  -- August - Salim Ismail
  ('40000000-0000-4000-a000-000000000001', 'speaker_fee', 'Salim Ismail keynote', 40000, null),
  ('40000000-0000-4000-a000-000000000001', 'food_beverage', 'Kickoff dinner', 15000, null),
  ('40000000-0000-4000-a000-000000000001', 'venue_rental', 'Ballroom rental', 5000, null),
  ('40000000-0000-4000-a000-000000000001', 'av_production', 'AV + screens', 5000, null),
  -- September - Brad Montague
  ('40000000-0000-4000-a000-000000000002', 'speaker_fee', 'Brad Montague keynote', 15000, null),
  ('40000000-0000-4000-a000-000000000002', 'food_beverage', 'Dinner', 10000, null),
  ('40000000-0000-4000-a000-000000000002', 'venue_rental', 'Heard Museum', 4000, null),
  ('40000000-0000-4000-a000-000000000002', 'av_production', 'AV', 3000, null),
  -- October - Jim Abbott
  ('40000000-0000-4000-a000-000000000003', 'speaker_fee', 'Jim Abbott keynote', 25000, null),
  ('40000000-0000-4000-a000-000000000003', 'food_beverage', 'Catering at field', 12000, null),
  ('40000000-0000-4000-a000-000000000003', 'venue_rental', 'Spring Training Field', 3000, null),
  ('40000000-0000-4000-a000-000000000003', 'av_production', 'Outdoor AV setup', 5000, null),
  -- November - Priya Parker
  ('40000000-0000-4000-a000-000000000004', 'speaker_fee', 'Priya Parker keynote', 32000, null),
  ('40000000-0000-4000-a000-000000000004', 'food_beverage', 'Dinner at DBG', 12000, null),
  ('40000000-0000-4000-a000-000000000004', 'venue_rental', 'Ullman Terrace', 6000, null),
  ('40000000-0000-4000-a000-000000000004', 'av_production', 'AV', 4000, null),
  -- January 7 - Jeffersonian Dinner
  ('40000000-0000-4000-a000-000000000005', 'food_beverage', 'Jeffersonian dinner for 64', 8000, null),
  ('40000000-0000-4000-a000-000000000005', 'venue_rental', 'Next Level', 3000, null),
  -- January 19 - Davies + Huff
  ('40000000-0000-4000-a000-000000000006', 'speaker_fee', 'Dr. Paul Davies', 15000, null),
  ('40000000-0000-4000-a000-000000000006', 'speaker_fee', 'Wesley Huff', 10000, null),
  ('40000000-0000-4000-a000-000000000006', 'food_beverage', 'Dinner', 12000, null),
  ('40000000-0000-4000-a000-000000000006', 'venue_rental', 'The Dorrance DOME', 5000, null),
  ('40000000-0000-4000-a000-000000000006', 'av_production', 'AV', 3000, null),
  -- February - Dr. Gary Chapman
  ('40000000-0000-4000-a000-000000000007', 'speaker_fee', 'Dr. Gary Chapman keynote', 15000, null),
  ('40000000-0000-4000-a000-000000000007', 'food_beverage', 'Rose Ceremony dinner', 12000, null),
  ('40000000-0000-4000-a000-000000000007', 'venue_rental', 'The Wrigley Mansion', 7000, null),
  ('40000000-0000-4000-a000-000000000007', 'av_production', 'AV', 3500, null),
  -- April - Indre Viskontas
  ('40000000-0000-4000-a000-000000000008', 'speaker_fee', 'Indre Viskontas lecture-performance', 15000, null),
  ('40000000-0000-4000-a000-000000000008', 'food_beverage', 'Dinner', 10000, null),
  ('40000000-0000-4000-a000-000000000008', 'venue_rental', 'Music venue', 5000, null),
  ('40000000-0000-4000-a000-000000000008', 'av_production', 'AV (venue has built-in)', 2000, null),
  -- May - Gratitude Gala
  ('40000000-0000-4000-a000-000000000009', 'food_beverage', 'Gala dinner', 20000, null),
  ('40000000-0000-4000-a000-000000000009', 'venue_rental', 'Gala venue TBD', 8000, null),
  ('40000000-0000-4000-a000-000000000009', 'av_production', 'AV + lighting', 5000, null),
  ('40000000-0000-4000-a000-000000000009', 'other', 'Awards, recognition, decor', 5000, null);

-- ── Contract Checklists ──
insert into public.contract_checklists (event_id, contract_notes) values
  ('40000000-0000-4000-a000-000000000001', 'Salim Ismail - awaiting response for August kickoff.')
on conflict (event_id) do nothing;

commit;
