-- Set chapter total budget to $600,000
update public.chapters
set total_budget = 600000,
    updated_at = now()
where name = 'EO Arizona';

-- Set learning chair budget to $450,000 for FY 2026-2027
update public.role_assignments ra
set budget = 450000,
    updated_at = now()
from public.chapter_roles cr
where ra.chapter_role_id = cr.id
  and cr.role_key = 'learning_chair'
  and ra.fiscal_year = '2026-2027'
  and ra.status = 'active';
