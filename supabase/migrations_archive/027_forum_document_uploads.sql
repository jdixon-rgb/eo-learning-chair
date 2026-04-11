-- 027_forum_document_uploads.sql
-- Add file upload support for forum documents (constitutions, etc.):
-- a storage bucket, storage_path/file_size columns, and storage RLS.

-- ── 1. Storage bucket ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('forum-documents', 'forum-documents', false, 10485760)
on conflict (id) do nothing;

-- ── 2. Columns on forum_documents ─────────────────────────────
alter table public.forum_documents
  add column if not exists storage_path text,
  add column if not exists file_size integer,
  add column if not exists mime_type text default '';

-- file_url was previously required; make it optional so uploads via
-- storage_path don't need an external URL.
alter table public.forum_documents
  alter column file_url drop not null;

-- ── 3. Storage RLS policies ───────────────────────────────────
create policy "Authenticated users can download forum docs"
  on storage.objects for select
  using (bucket_id = 'forum-documents' and auth.role() = 'authenticated');

create policy "Authenticated users can upload forum docs"
  on storage.objects for insert
  with check (bucket_id = 'forum-documents' and auth.role() = 'authenticated');

create policy "Authenticated users can delete forum docs"
  on storage.objects for delete
  using (bucket_id = 'forum-documents' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';
