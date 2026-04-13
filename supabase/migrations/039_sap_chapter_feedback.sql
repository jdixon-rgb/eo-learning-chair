-- 039_sap_chapter_feedback.sql
-- SAP contacts can rate the chapter and provide recommendations.
-- Anonymous feedback has null sap_contact_id — only sap_id identifies the company.

create table if not exists public.sap_chapter_feedback (
  id uuid primary key default gen_random_uuid(),
  sap_contact_id uuid references public.sap_contacts(id) on delete set null,
  sap_id uuid not null references public.saps(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback_text text default '',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_sap_chapter_feedback_sap on public.sap_chapter_feedback(sap_id);

-- RLS
alter table public.sap_chapter_feedback enable row level security;

-- SAP contacts can insert feedback
create policy "SAP contacts can submit feedback" on public.sap_chapter_feedback
  for insert with check (public.is_sap_contact());

-- SAP contacts can view their own feedback
create policy "SAP contacts can view own feedback" on public.sap_chapter_feedback
  for select using (
    sap_contact_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.sap_contact_id = sap_contact_id
    )
  );

-- Leadership can view all feedback
create policy "Leadership can view all SAP feedback" on public.sap_chapter_feedback
  for select using (public.is_admin() or public.is_super_admin());
