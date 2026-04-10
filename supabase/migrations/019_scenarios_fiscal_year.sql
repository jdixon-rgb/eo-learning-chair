-- Add fiscal_year to scenarios (year-scoped like events)
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS fiscal_year text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_scenarios_fiscal_year ON public.scenarios(fiscal_year);

-- Backfill existing scenarios as 2026-2027 (current planning year)
UPDATE public.scenarios SET fiscal_year = '2026-2027' WHERE fiscal_year = '';
