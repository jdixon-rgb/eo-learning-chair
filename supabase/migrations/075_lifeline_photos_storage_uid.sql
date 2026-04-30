-- 075_lifeline_photos_storage_uid.sql
-- Fix lifeline-photos uploads silently failing under the storage RLS from
-- migration 074. The original policies scoped by `current_chapter_member_id()`,
-- which doesn't behave reliably in the storage RLS evaluation context. Move
-- to the canonical Supabase pattern: scope by auth.uid() and use auth.uid()
-- as the first folder of every object key.
--
-- Path convention (new):
--   {auth.uid()}/{event_id}/{filename}
--
-- Privacy is unchanged: only the owning user can read or write under their
-- own auth-uid folder, and life_events row-level RLS (migration 031) still
-- enforces that the user can only attach a photo to their own event.

drop policy if exists "Owner can view own lifeline photos"   on storage.objects;
drop policy if exists "Owner can upload own lifeline photos" on storage.objects;
drop policy if exists "Owner can update own lifeline photos" on storage.objects;
drop policy if exists "Owner can delete own lifeline photos" on storage.objects;

create policy "Owner can view own lifeline photos"
  on storage.objects for select
  using (
    bucket_id = 'lifeline-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner can upload own lifeline photos"
  on storage.objects for insert
  with check (
    bucket_id = 'lifeline-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner can update own lifeline photos"
  on storage.objects for update
  using (
    bucket_id = 'lifeline-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner can delete own lifeline photos"
  on storage.objects for delete
  using (
    bucket_id = 'lifeline-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
