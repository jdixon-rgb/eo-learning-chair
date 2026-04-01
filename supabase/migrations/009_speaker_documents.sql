-- ============================================================
-- EO Learning Chair -- Speaker Document Uploads (Contract + W-9)
-- Run AFTER 008_contract_ai_items.sql
-- Adds storage path columns for speaker-level documents
-- ============================================================

-- Speaker contract document
alter table public.speakers
  add column if not exists contract_storage_path text default null,
  add column if not exists contract_file_name text default null;

-- Speaker W-9 document
alter table public.speakers
  add column if not exists w9_storage_path text default null,
  add column if not exists w9_file_name text default null;

-- Reload schema cache
notify pgrst, 'reload schema';
