-- Add fiscal_year column to year-scoped tables
-- Backfill existing rows with current FY "2025-2026"

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT '';

ALTER TABLE public.chair_reports
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT '';

ALTER TABLE public.member_scorecards
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT '';

ALTER TABLE public.navigator_pairings
  ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT '';

-- Indexes for fiscal year filtering
CREATE INDEX IF NOT EXISTS idx_events_fiscal_year ON public.events(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_chair_reports_fiscal_year ON public.chair_reports(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_member_scorecards_fiscal_year ON public.member_scorecards(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_navigator_pairings_fiscal_year ON public.navigator_pairings(fiscal_year);

-- Backfill existing data as current fiscal year
UPDATE public.events SET fiscal_year = '2025-2026' WHERE fiscal_year = '';
UPDATE public.chair_reports SET fiscal_year = '2025-2026' WHERE fiscal_year = '';
UPDATE public.member_scorecards SET fiscal_year = '2025-2026' WHERE fiscal_year = '';
UPDATE public.navigator_pairings SET fiscal_year = '2025-2026' WHERE fiscal_year = '';
