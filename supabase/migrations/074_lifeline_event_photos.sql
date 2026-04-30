-- 074_lifeline_event_photos.sql
-- Add per-event photo upload to the Lifeline module.
--
-- Privacy: lifeline events are owner-only (RLS in 031). Photos must follow
-- the same rule, so we create a dedicated private storage bucket and scope
-- access by the first folder segment of the object name (= member_id).
-- Path convention: {member_id}/{event_id}/{filename}

-- ── 1. Columns on life_events ─────────────────────────────────
alter table public.life_events
  add column if not exists photo_storage_path text,
  add column if not exists photo_file_name    text;

-- ── 2. Private storage bucket ─────────────────────────────────
-- 5 MB cap is generous for a single life-event photo and matches what
-- members typically attach in similar Forum-style storytelling tools.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lifeline-photos', 'lifeline-photos', false, 5242880)
on conflict (id) do nothing;

-- ── 3. Storage RLS — owner-only by member_id folder ───────────
-- The first folder of every key is the uploader's chapter_members.id, so
-- owner-scoping reduces to: foldername[1] = current_chapter_member_id().

drop policy if exists "Owner can view own lifeline photos"   on storage.objects;
drop policy if exists "Owner can upload own lifeline photos" on storage.objects;
drop policy if exists "Owner can update own lifeline photos" on storage.objects;
drop policy if exists "Owner can delete own lifeline photos" on storage.objects;

create policy "Owner can view own lifeline photos"
  on storage.objects for select
  using (
    bucket_id = 'lifeline-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_chapter_member_id()::text
  );

create policy "Owner can upload own lifeline photos"
  on storage.objects for insert
  with check (
    bucket_id = 'lifeline-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_chapter_member_id()::text
  );

create policy "Owner can update own lifeline photos"
  on storage.objects for update
  using (
    bucket_id = 'lifeline-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_chapter_member_id()::text
  );

create policy "Owner can delete own lifeline photos"
  on storage.objects for delete
  using (
    bucket_id = 'lifeline-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_chapter_member_id()::text
  );

-- ── 4. Reload PostgREST schema cache ──────────────────────────
notify pgrst, 'reload schema';
