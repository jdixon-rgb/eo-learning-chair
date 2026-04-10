-- Seed the April 8, 2026 forum meeting agenda for 212°
-- Run AFTER migration 025_forum_agendas.sql
-- Looks up the forum by name; edit if your forum name differs.

with target_forum as (
  select f.id as forum_id, f.chapter_id
  from public.forums f
  where f.name = '212°' and f.is_active = true
  limit 1
),
inserted_agenda as (
  insert into public.forum_agendas (
    chapter_id, forum_id, title, meeting_date, start_time, end_time,
    location, host, mission, forum_values, target_minutes, status
  )
  select
    chapter_id, forum_id,
    '212° Forum Meeting — April 2026',
    '2026-04-08',
    '12:00 PM',
    '4:30 PM',
    'The Craftsman Collective, 9170 E Bahia Dr STE 106, Scottsdale, AZ 85260',
    'The Craftsman Collective',
    'To act as a personal board of directors through a collective commitment to one another. To share, learn, challenge, hold each other accountable, and grow personally and professionally as individuals and as a forum.',
    'Respectful, Present, Accountable, and Challengeable',
    270,
    'published'
  from target_forum
  returning id
)
insert into public.forum_agenda_items (agenda_id, title, description, minutes, start_time, end_time, sort_order)
select id, t.title, t.description, t.minutes, t.start_time, t.end_time, t.sort_order
from inserted_agenda,
(values
  ('Aptive Index - Joe Wargo', '', 45, '12:00 PM', '12:45 PM', 1),
  ('Break', '', 15, '12:45 PM', '1:00 PM', 2),
  ('Check-In Rituals', '• 5 Deep Breaths
• One-word open
• Fully Present: electronics off or airplane mode
• Confidentiality reminder: any near misses?
• Cheer & Clear', 10, '1:00 PM', '1:10 PM', 3),
  ('Significant & Important 5% Reflections', '5 min. each with a 1 min. Resonance Round, 30 sec Silence, or 3 Deep Breaths', 60, '1:10 PM', '2:10 PM', 4),
  ('Break', '', 10, '2:10 PM', '2:20 PM', 5),
  ('LifeLines: John-Scott, Matt, Nate, Jardin, Emily', '', 100, '2:20 PM', '4:00 PM', 6),
  ('Break', '', 10, '4:00 PM', '4:10 PM', 7),
  ('"Your 1 Thing"', '• Report In From Last Meeting
• Assign Partners', 10, '4:00 PM', '4:10 PM', 8),
  ('Housekeeping', '• New Members: Any Questions
• Retreat Planning April 29th - May 4th
• SAP Presenters — Additional Time Options
• Gratitude opportunities
• Confirm next meeting(s) details and prep work
• Closing Ritual: One Word Close', 10, '4:10 PM', '4:30 PM', 9)
) as t(title, description, minutes, start_time, end_time, sort_order);
