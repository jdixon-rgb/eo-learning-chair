-- ============================================================
-- EO Learning Chair — Event Document Uploads
-- Run AFTER 003_board_management.sql
-- Paste each block into Supabase SQL Editor one at a time
-- ============================================================

-- ─── Block 1: Create Storage Bucket ───────────────────────
-- NOTE: If this fails, create the bucket manually in
-- Supabase Dashboard > Storage > New Bucket > "event-documents"
-- Set it to Private and 10MB max file size.

insert into storage.buckets (id, name, public, file_size_limit)
values ('event-documents', 'event-documents', false, 10485760)
on conflict (id) do nothing;


-- ─── Block 2: Create event_documents Table ────────────────

create table if not exists public.event_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  document_type text not null default 'other' check (document_type in ('contract', 'loi', 'rider', 'insurance', 'invoice', 'other')),
  file_name text not null,
  file_size integer default 0,
  mime_type text default '',
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_documents_event on public.event_documents(event_id);
create index if not exists idx_event_documents_chapter on public.event_documents(chapter_id);


-- ─── Block 3: Enable RLS ─────────────────────────────────

alter table public.event_documents enable row level security;


-- ─── Block 4: Table RLS Policies ──────────────────────────

create policy "Anon can view event_documents" on public.event_documents
  for select using (true);

create policy "Admins can insert event_documents" on public.event_documents
  for insert with check (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Admins can update event_documents" on public.event_documents
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

create policy "Admins can delete event_documents" on public.event_documents
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );


-- ─── Block 5: Storage RLS Policies ───────────────────────

create policy "Authenticated users can download event docs"
  on storage.objects for select
  using (bucket_id = 'event-documents' and auth.role() = 'authenticated');

create policy "Admins can upload event docs"
  on storage.objects for insert
  with check (
    bucket_id = 'event-documents'
    and auth.role() = 'authenticated'
  );

create policy "Admins can delete event docs"
  on storage.objects for delete
  using (
    bucket_id = 'event-documents'
    and auth.role() = 'authenticated'
  );


-- ─── Block 6: Reload Schema Cache ────────────────────────

notify pgrst, 'reload schema';
