-- Speaker Pipeline: year-scoped booking pipeline separated from the persistent speaker library.
-- The `speakers` table remains the library (who the speaker is).
-- This table tracks where they are in the booking process for a given fiscal year.

create table if not exists public.speaker_pipeline (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  fiscal_year text not null default '',
  pipeline_stage text not null default 'researching'
    check (pipeline_stage in ('researching', 'outreach', 'negotiating', 'contracted', 'confirmed', 'passed')),
  fit_score integer check (fit_score is null or fit_score between 1 and 10),
  fee_estimated integer,
  fee_actual integer,
  contract_storage_path text,
  contract_file_name text,
  w9_storage_path text,
  w9_file_name text,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(speaker_id, fiscal_year, chapter_id)
);

create index if not exists idx_speaker_pipeline_chapter_fy
  on public.speaker_pipeline(chapter_id, fiscal_year);
create index if not exists idx_speaker_pipeline_speaker
  on public.speaker_pipeline(speaker_id);

-- RLS: same pattern as speakers table
alter table public.speaker_pipeline enable row level security;

create policy "Anon can read speaker_pipeline"
  on public.speaker_pipeline for select
  to anon, authenticated
  using (true);

create policy "Authenticated can insert speaker_pipeline"
  on public.speaker_pipeline for insert
  to authenticated
  with check (true);

create policy "Authenticated can update speaker_pipeline"
  on public.speaker_pipeline for update
  to authenticated
  using (true);

create policy "Authenticated can delete speaker_pipeline"
  on public.speaker_pipeline for delete
  to authenticated
  using (true);

-- Backfill: create pipeline entries from existing speaker rows
-- All existing data is for FY 2026-2027
insert into public.speaker_pipeline
  (chapter_id, speaker_id, fiscal_year, pipeline_stage, fit_score,
   fee_estimated, fee_actual,
   contract_storage_path, contract_file_name,
   w9_storage_path, w9_file_name, notes)
select
  chapter_id, id, '2026-2027',
  coalesce(pipeline_stage, 'researching'), fit_score,
  fee_estimated, fee_actual,
  contract_storage_path, contract_file_name,
  w9_storage_path, w9_file_name, coalesce(notes, '')
from public.speakers
on conflict (speaker_id, fiscal_year, chapter_id) do nothing;
