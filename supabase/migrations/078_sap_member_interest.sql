-- 078_sap_member_interest.sql
-- Chapter-wide member-level SAP interest signal. Distinct from the
-- forum-scoped sap_forum_interest table — this one feeds three
-- separate audiences:
--   1. The SAP themselves: who in the chapter wants to meet me? Cuts
--      cold-outreach noise — they market only to declared interest.
--   2. The SAP Chair: which SAPs have broad chapter pull? Drives
--      programming decisions for chapter-wide events.
--   3. Forum moderators: of MY forum's members, who's interested in
--      whom? Combined with sap_forum_interest, this informs which
--      partners to invite to forum meetings.
-- Members declare interest once at the chapter level; the data is
-- read chapter-wide (members can see each other's declared interest)
-- plus accessible to the SAP partner whose row is the subject.

create table if not exists public.sap_member_interest (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sap_id uuid not null references public.saps(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sap_id, chapter_member_id)
);

create index if not exists sap_member_interest_chapter_idx on public.sap_member_interest (chapter_id);
create index if not exists sap_member_interest_sap_idx on public.sap_member_interest (sap_id);
create index if not exists sap_member_interest_member_idx on public.sap_member_interest (chapter_member_id);

alter table public.sap_member_interest enable row level security;

-- SELECT: any authenticated chapter member can read declared interest
-- (it's intentionally non-secret — visibility helps members find each
-- other around shared partner interest). SAP contacts also read rows
-- for their own SAP. Super-admin sees all.
drop policy if exists "sap_member_interest_select" on public.sap_member_interest;
create policy "sap_member_interest_select"
on public.sap_member_interest for select to authenticated
using (
  is_super_admin()
  or chapter_id = user_chapter_id()
  or exists (
    select 1 from public.profiles p
    join public.sap_contacts sc on sc.id = p.sap_contact_id
    where p.id = auth.uid() and sc.sap_id = sap_member_interest.sap_id
  )
);

-- INSERT: a member declares their own interest. Chapter admins can
-- also insert on behalf of a member.
drop policy if exists "sap_member_interest_insert" on public.sap_member_interest;
create policy "sap_member_interest_insert"
on public.sap_member_interest for insert to authenticated
with check (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or chapter_member_id = current_chapter_member_id()
);

-- DELETE: a member can clear their own interest; admins can clear any.
drop policy if exists "sap_member_interest_delete" on public.sap_member_interest;
create policy "sap_member_interest_delete"
on public.sap_member_interest for delete to authenticated
using (
  is_super_admin()
  or is_chapter_admin(chapter_id)
  or chapter_member_id = current_chapter_member_id()
);

grant select, insert, update, delete on public.sap_member_interest to authenticated;
