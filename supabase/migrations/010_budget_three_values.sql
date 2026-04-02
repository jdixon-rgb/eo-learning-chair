-- ============================================================
-- EO Learning Chair -- Budget Three-Value Model
-- Run AFTER 009_speaker_documents.sql
-- Renames estimated_amount → budget_amount, adds contracted_amount,
-- updates category enum (drop marketing, add dinner)
-- ============================================================

-- Migrate any existing 'marketing' items to 'other' BEFORE updating constraint
UPDATE public.budget_items SET category = 'other' WHERE category = 'marketing';

-- Rename estimated_amount → budget_amount
ALTER TABLE public.budget_items RENAME COLUMN estimated_amount TO budget_amount;

-- Add contracted_amount
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS contracted_amount integer DEFAULT 0;

-- Update category check constraint: drop marketing, add dinner
ALTER TABLE public.budget_items DROP CONSTRAINT IF EXISTS budget_items_category_check;
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_category_check
  CHECK (category IN ('speaker_fee', 'food_beverage', 'venue_rental', 'av_production', 'travel', 'dinner', 'other'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
