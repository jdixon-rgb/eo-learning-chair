-- 076_lifeline_photos_bucket_select.sql
-- Resolve "Bucket not found" errors when uploading lifeline photos.
--
-- Supabase Storage looks up the target bucket in `storage.buckets` using
-- the caller's JWT. RLS is enabled on storage.buckets in this project but
-- no SELECT policy was ever defined, so authenticated users couldn't see
-- the bucket they were trying to write to and the storage service replied
-- with a 404. Object-level access stays gated by the storage.objects
-- policies from migration 075 — this only grants visibility of the bucket
-- row itself.

drop policy if exists "Authenticated users can see lifeline-photos bucket"
  on storage.buckets;

create policy "Authenticated users can see lifeline-photos bucket"
  on storage.buckets for select
  to authenticated
  using (id = 'lifeline-photos');

notify pgrst, 'reload schema';
