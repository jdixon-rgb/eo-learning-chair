-- Add theme_description to role_assignments for president to explain
-- what their theme means and how chairs should bring it to life.
ALTER TABLE public.role_assignments
  ADD COLUMN IF NOT EXISTS theme_description text DEFAULT '';
