-- ============================================================
-- 071 Restore upsert_staff_invite RPC
-- ============================================================
-- The Staff Management page calls supabase.rpc('upsert_staff_invite',
-- { p_email, p_full_name, p_role, p_chapter_id }) when an admin clicks
-- "Add" in the Add Staff form. The function definition was originally
-- written as 008_staff_invite_rpc.sql, but that file collided on
-- version prefix with another 008 migration and got moved into
-- supabase/migrations_archive/. The archived migration was never
-- replayed against either Supabase project, so the function does not
-- exist in the schema cache of staging or production.
--
-- Symptom: PostgREST returns PGRST202 ("Could not find the function
-- public.upsert_staff_invite ... in the schema cache") when the page
-- POSTs to /rest/v1/rpc/upsert_staff_invite. The page's RPC error
-- handler swallows the error to console.error only, so the UI shows
-- a green "Added <email>." confirmation while the row is silently
-- dropped. Justice Butler is in member_invites because someone added
-- her manually via Studio at some point; nothing has been added via
-- the Add Staff form since the function went missing.
--
-- Fix: re-create the function with the same shape and contract as the
-- archived migration. CREATE OR REPLACE so this is idempotent if the
-- function happens to exist somewhere with the same signature.
-- security definer + locked search_path so it can run from the
-- authenticated role without RLS blocking the insert.

create or replace function public.upsert_staff_invite(
  p_email      text,
  p_full_name  text,
  p_role       text,
  p_chapter_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow recognized staff app roles. The page's role dropdown
  -- already constrains this on the client; this is defense in depth
  -- so a hand-crafted RPC call can't smuggle in a privileged role.
  if p_role not in (
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison'
  ) then
    raise exception 'Invalid role: %', p_role;
  end if;

  insert into public.member_invites (email, full_name, role, chapter_id)
  values (lower(trim(p_email)), p_full_name, p_role, p_chapter_id)
  on conflict (email) do update
    set full_name  = excluded.full_name,
        role       = excluded.role,
        chapter_id = excluded.chapter_id;
end;
$$;

-- Authenticated role can call it; the app gates who reaches the Add
-- Staff form via canManageMembers permission.
grant execute on function public.upsert_staff_invite(text, text, text, uuid)
  to authenticated;

notify pgrst, 'reload schema';
