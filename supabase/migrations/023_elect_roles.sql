-- Add President Elect-Elect and Learning Chair Elect to chapter_roles
-- These roles get started earlier than other board positions

INSERT INTO public.chapter_roles (chapter_id, role_key, label, is_staff, sort_order)
SELECT c.id, 'president_elect_elect', 'President Elect-Elect', false, 2
FROM public.chapters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapter_roles cr
  WHERE cr.chapter_id = c.id AND cr.role_key = 'president_elect_elect'
);

INSERT INTO public.chapter_roles (chapter_id, role_key, label, is_staff, sort_order)
SELECT c.id, 'learning_chair_elect', 'Learning Chair Elect', false, 9
FROM public.chapters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapter_roles cr
  WHERE cr.chapter_id = c.id AND cr.role_key = 'learning_chair_elect'
);
