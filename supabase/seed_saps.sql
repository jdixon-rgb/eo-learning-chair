-- ============================================================
-- EO Learning Chair — SAP Seed Data
-- Apply AFTER seed.sql (depends on EO Arizona chapter UUID)
-- Mirrors mockSAPs + mockSAPContacts from src/lib/mockData.js
-- Real EO Arizona company / partner names; emails are placeholder (.example.com)
-- ============================================================

begin;

-- ── SAPs ─────────────────────────────────────────────────
insert into public.saps (id, chapter_id, name, industry, tier, status, contribution_type) values
  ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'Silverhawk Financial', 'Financial Planning', 'platinum', 'active', 'sponsorship'),
  ('30000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'Quarles & Brady', 'Attorney', 'platinum', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'Next Level Growth', 'Business Growth Specialist', 'platinum', 'active', 'workshop'),
  ('30000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000001', 'Heartland Payment Systems', 'Payroll', 'gold', 'active', 'sponsorship'),
  ('30000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'Corporate Alliance Production', 'Business Services', 'gold', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'SnapTech IT', 'IT Services', 'gold', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000001', 'Aptive Index', 'AI Assistant', 'gold', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000001', 'Bankers Trust', 'Banking', 'silver', 'active', 'sponsorship'),
  ('30000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000001', 'Levrose', 'Commercial Real Estate', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000010', '00000000-0000-4000-a000-000000000001', 'Infinity Insurance Partners', 'Property & Casualty Insurance', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001', 'Remote Raven', 'Virtual Assistants', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000001', 'Trainual', 'Online Training Platform', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000013', '00000000-0000-4000-a000-000000000001', 'Born Counseling and Consulting', 'Counseling', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000001', 'Congruity', 'PEO', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000015', '00000000-0000-4000-a000-000000000001', 'Tradition Capital Bank', 'Banking', 'silver', 'active', 'sponsorship'),
  ('30000000-0000-4000-a000-000000000016', '00000000-0000-4000-a000-000000000001', 'Xponential Digital', 'IT Services', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000017', '00000000-0000-4000-a000-000000000001', 'Strunk HR', 'Property & Casualty Insurance', 'silver', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000018', '00000000-0000-4000-a000-000000000001', 'Marx Productions', 'Audio & Visual', 'in_kind', 'active', 'service'),
  ('30000000-0000-4000-a000-000000000019', '00000000-0000-4000-a000-000000000001', 'Select', 'Private Membership', 'in_kind', 'active', 'other')
on conflict (id) do nothing;

-- ── SAP Contacts ─────────────────────────────────────────
insert into public.sap_contacts (sap_id, name, role, email, is_primary, forum_trained, forum_trained_date) values
  -- Silverhawk
  ('30000000-0000-4000-a000-000000000001', 'Joe Laux', 'Managing Partner', 'joe.laux@silverhawk.example.com', true, true, '2025-03-15'),
  ('30000000-0000-4000-a000-000000000001', 'Kelly Jackson', '', '', false, false, null),
  -- Quarles & Brady
  ('30000000-0000-4000-a000-000000000002', 'Jeff Gardner', 'Partner', 'jeff.gardner@quarles.example.com', true, true, '2024-11-08'),
  ('30000000-0000-4000-a000-000000000002', 'Jason Wood', '', '', false, false, null),
  ('30000000-0000-4000-a000-000000000002', 'Leonardo Loo', '', '', false, false, null),
  ('30000000-0000-4000-a000-000000000002', 'Heather Buchta', '', '', false, false, null),
  -- Next Level Growth
  ('30000000-0000-4000-a000-000000000003', 'Michael Erath', 'Founder', 'michael@nextlevelgrowth.example.com', true, false, null),
  ('30000000-0000-4000-a000-000000000003', 'Landon Kirk', '', '', false, false, null),
  ('30000000-0000-4000-a000-000000000003', 'Chris Prenovost', '', '', false, false, null),
  ('30000000-0000-4000-a000-000000000003', 'Jim Small', '', '', false, false, null),
  -- Heartland
  ('30000000-0000-4000-a000-000000000004', 'Scott Lester', '', '', true, false, null),
  ('30000000-0000-4000-a000-000000000004', 'Rowland Harris', '', '', false, false, null),
  -- Corporate Alliance
  ('30000000-0000-4000-a000-000000000005', 'Kim Watson', '', '', true, false, null),
  ('30000000-0000-4000-a000-000000000005', 'Mike Strati', '', '', false, false, null),
  -- SnapTech
  ('30000000-0000-4000-a000-000000000006', 'Ted Hulsy', '', '', true, false, null),
  ('30000000-0000-4000-a000-000000000006', 'Garrett Chavez', '', '', false, false, null),
  -- Aptive
  ('30000000-0000-4000-a000-000000000007', 'Joe Wargo', '', '', true, false, null),
  -- Bankers Trust
  ('30000000-0000-4000-a000-000000000008', 'Kevin Cooney', '', '', true, false, null),
  ('30000000-0000-4000-a000-000000000008', 'Karl Klingenberg', '', '', false, false, null),
  -- Levrose
  ('30000000-0000-4000-a000-000000000009', 'Mike Baumgardner', '', '', true, false, null),
  -- Infinity Insurance
  ('30000000-0000-4000-a000-000000000010', 'Bridgett Delgado', 'Senior Account Manager', '', true, false, null),
  -- Remote Raven
  ('30000000-0000-4000-a000-000000000011', 'Nancy Baio', '', '', true, false, null),
  -- Trainual
  ('30000000-0000-4000-a000-000000000012', 'Scott Krinsky', '', '', true, false, null),
  ('30000000-0000-4000-a000-000000000012', 'Sara Beech', '', '', false, false, null),
  ('30000000-0000-4000-a000-000000000012', 'Jade Bunda', '', '', false, false, null),
  -- Born
  ('30000000-0000-4000-a000-000000000013', 'Jamie Born', '', '', true, false, null),
  -- Congruity
  ('30000000-0000-4000-a000-000000000014', 'Brian Dimond', '', '', true, false, null),
  -- Tradition
  ('30000000-0000-4000-a000-000000000015', 'Susana Crane', '', '', true, false, null),
  -- Xponential
  ('30000000-0000-4000-a000-000000000016', 'Aakash Mehta', '', '', true, false, null),
  -- Strunk HR
  ('30000000-0000-4000-a000-000000000017', 'Holly Norton', '', '', true, false, null),
  -- Marx
  ('30000000-0000-4000-a000-000000000018', 'Melody Marx', '', '', true, false, null),
  -- Select
  ('30000000-0000-4000-a000-000000000019', 'Matthew Burkhardt', '', '', true, false, null);

commit;
