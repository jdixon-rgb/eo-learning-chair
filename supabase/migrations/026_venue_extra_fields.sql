-- 026_venue_extra_fields.sql
-- Add missing venue columns that the UI form already sends,
-- and add 'theater' to the venue_type constraint.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS fb_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fb_estimated_cost numeric,
  ADD COLUMN IF NOT EXISTS fb_vendor text DEFAULT '',
  ADD COLUMN IF NOT EXISTS parking_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS setup_notes text DEFAULT '';

-- Update venue_type constraint to include 'theater'
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_venue_type_check;
ALTER TABLE public.venues ADD CONSTRAINT venues_venue_type_check
  CHECK (venue_type IN ('hotel', 'museum', 'outdoor', 'restaurant', 'private', 'theater', 'other'));

-- Allow staff_rating of 0 (no rating) — original constraint was between 1 and 5
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_staff_rating_check;
ALTER TABLE public.venues ADD CONSTRAINT venues_staff_rating_check
  CHECK (staff_rating IS NULL OR staff_rating BETWEEN 0 AND 5);

notify pgrst, 'reload schema';
