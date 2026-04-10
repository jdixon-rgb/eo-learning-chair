-- 017_parking_lot_forum_edit.sql
-- All forum mates can edit/delete any parking lot entry in their forum.
-- "None of us are admins over anybody else" — everyone is equal in forum.

-- Update: any forum mate can update
drop policy if exists "Author or admin can update parking lot entry" on public.parking_lot_entries;
drop policy if exists "Author can update own parking lot entry" on public.parking_lot_entries;
create policy "Forum mates can update parking lot entries" on public.parking_lot_entries
  for update using (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  );

-- Delete: any forum mate can delete
drop policy if exists "Author or admin can delete parking lot entry" on public.parking_lot_entries;
drop policy if exists "Author can delete own parking lot entry" on public.parking_lot_entries;
create policy "Forum mates can delete parking lot entries" on public.parking_lot_entries
  for delete using (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  );

-- Insert: any forum mate can add (not just for their own author_member_id)
drop policy if exists "Author or admin can insert parking lot entry" on public.parking_lot_entries;
drop policy if exists "Author can insert parking lot entry" on public.parking_lot_entries;
create policy "Forum mates can insert parking lot entries" on public.parking_lot_entries
  for insert with check (
    (
      chapter_id = public.user_chapter_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  );

notify pgrst, 'reload schema';
