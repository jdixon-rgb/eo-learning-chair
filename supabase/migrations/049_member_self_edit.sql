-- Allow chapter members to update their own profile row.
--
-- Previously chapter_members.update was admin-only. To support a
-- self-service member profile page, members can now update the row
-- whose email matches their auth email. Status, role, forum, and
-- chapter_id remain admin-controlled (see the column-level guards in
-- the app — and a forthcoming column-grant tightening).
--
-- Idempotent: safe to re-run.

create policy "Members can update own row" on public.chapter_members
  for update
  using (
    public.current_chapter_member_id() = id
  )
  with check (
    public.current_chapter_member_id() = id
  );

notify pgrst, 'reload schema';
