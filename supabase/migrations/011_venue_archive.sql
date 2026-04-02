-- 011_venue_archive.sql
-- Add archive tracking fields and update pipeline_stage constraint

-- Add new columns
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS program_year text DEFAULT '';

-- Drop old constraint and add new one that includes 'archived'
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_pipeline_stage_check;
ALTER TABLE public.venues ADD CONSTRAINT venues_pipeline_stage_check
  CHECK (pipeline_stage IN ('researching', 'quote_requested', 'site_visit', 'negotiating', 'contract', 'confirmed', 'archived'));

-- Migrate any existing 'passed' venues to 'archived'
UPDATE public.venues SET pipeline_stage = 'archived' WHERE pipeline_stage = 'passed';
