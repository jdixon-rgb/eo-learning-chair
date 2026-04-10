-- 016_parking_lot_admin_bypass.sql
-- Allow admins + super admins to update/delete any parking lot entry.
-- Previously only the original author (via current_chapter_member_id()) could write.
-- This is needed for:
--   1. Author reassignment (engagement chair entering items on behalf of forum mates)
--   2. General admin housekeeping

-- Drop and recreate update policy with admin bypass
drop policy if exists "Author can update own parking lot entry" on public.parking_lot_entries;
create policy "Author or admin can update parking lot entry" on public.parking_lot_entries
  for update using (
    author_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );

-- Drop and recreate delete policy with admin bypass
drop policy if exists "Author can delete own parking lot entry" on public.parking_lot_entries;
create policy "Author or admin can delete parking lot entry" on public.parking_lot_entries
  for delete using (
    author_member_id = public.current_chapter_member_id()
    or public.is_super_admin()
    or public.is_admin()
  );

-- Also add admin bypass to insert policy (so admin can create entries on behalf of others)
drop policy if exists "Author can insert parking lot entry" on public.parking_lot_entries;
create policy "Author or admin can insert parking lot entry" on public.parking_lot_entries
  for insert with check (
    (
      author_member_id = public.current_chapter_member_id()
      and forum = public.current_member_forum()
    )
    or public.is_super_admin()
    or public.is_admin()
  );

notify pgrst, 'reload schema';
