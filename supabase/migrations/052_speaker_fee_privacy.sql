-- Fee privacy flags on speaker_pipeline.
--
-- Speakers may request that we keep negotiated fees confidential — e.g.
-- "I'll give your chapter a discounted rate, but please don't share
-- this number with other chapters." These flags let chapter staff mark
-- which fee values are confidential per pipeline entry.
--
-- Within-chapter behavior (today): fees stay visible to chapter admins
-- (they need to see what they're paying). The UI shows a Lock indicator
-- next to private values as a reminder not to share externally.
--
-- Cross-chapter behavior (future, see speaker library sharing #5):
-- private fees will be omitted from the cross-chapter shared view.
--
-- Idempotent: safe to re-run.

alter table public.speaker_pipeline
  add column if not exists fee_estimated_private boolean not null default false;

alter table public.speaker_pipeline
  add column if not exists fee_actual_private boolean not null default false;

notify pgrst, 'reload schema';
