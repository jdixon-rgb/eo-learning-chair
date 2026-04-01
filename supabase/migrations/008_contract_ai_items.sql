-- ============================================================
-- EO Learning Chair -- AI Contract Action Items
-- Run AFTER 007_board_positions.sql
-- Adds JSONB column for AI-extracted coordinator requirements
-- ============================================================

-- Add ai_action_items column to event_documents
-- Format: [{"text": "Provide electricity at lectern", "category": "Setup", "done": false}, ...]
alter table public.event_documents
  add column if not exists ai_action_items jsonb default null;

-- Add ai_parsed_at timestamp to track when parsing was last run
alter table public.event_documents
  add column if not exists ai_parsed_at timestamptz default null;

-- Reload schema cache
notify pgrst, 'reload schema';
