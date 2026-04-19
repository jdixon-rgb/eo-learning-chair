-- Cross-chapter speaker library sharing — V1.
--
-- Adds a per-speaker `share_scope` toggle. When set to 'global', the
-- speaker becomes visible to other chapters via the Shared Library tab,
-- where they can fork a copy into their own chapter via "Add to my
-- pipeline." The fork creates a fresh speakers row in the importing
-- chapter (bio/topic/contact/fee_range copied) plus a blank
-- speaker_pipeline entry for the importer's active fiscal year.
--
-- Design notes:
--   - Forked copy model: importer gets their own row. No live reference
--     back. Importer has full sovereignty (edit, re-share, delete).
--   - Provenance: imported_from_speaker_id points back at the source
--     row for attribution + (future) "check for updates" UI.
--   - Source chapter name denormalized at share time onto
--     shared_chapter_name so the Shared Library can display it without
--     opening up cross-chapter chapters.* reads.
--   - Fee privacy flags (fee_estimated_private, fee_actual_private)
--     live on speaker_pipeline (FY-scoped) and are NOT involved in V1.
--     V1 does not aggregate cross-chapter pipeline data; only the
--     library entry (bio/topic/range) is shared. Cross-chapter pipeline
--     aggregation with privacy enforcement is a follow-up.
--
-- Idempotent: safe to re-run.

alter table public.speakers
  add column if not exists share_scope text not null default 'chapter_only';

-- Add CHECK separately (alter constraint isn't if-not-exists; do it via DO block).
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'speakers_share_scope_check'
  ) then
    alter table public.speakers
      add constraint speakers_share_scope_check
      check (share_scope in ('chapter_only', 'global'));
  end if;
end $$;

alter table public.speakers
  add column if not exists shared_chapter_name text;

alter table public.speakers
  add column if not exists imported_from_speaker_id uuid references public.speakers(id) on delete set null;

create index if not exists idx_speakers_share_scope on public.speakers(share_scope) where share_scope = 'global';

-- Replace the chapter-scoped SELECT policy to also allow reading
-- globally-shared speakers from other chapters.
drop policy if exists "Chapter scoped select speakers" on public.speakers;
drop policy if exists "Speakers visible by chapter or global share" on public.speakers;
create policy "Speakers visible by chapter or global share" on public.speakers
  for select using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or share_scope = 'global'
  );

notify pgrst, 'reload schema';
