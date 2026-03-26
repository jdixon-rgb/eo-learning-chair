-- ============================================================
-- Migration 008: Security-definer RPC for staff invite upsert
-- ============================================================
-- Client-side upsert to member_invites is blocked by RLS.
-- This function runs as the definer (bypasses RLS) so that
-- authenticated admins can add staff emails to the whitelist
-- directly from the Settings page.
-- ============================================================

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
  -- Only allow recognized staff app roles
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

-- Grant execute to authenticated users (admin check happens in the app)
grant execute on function public.upsert_staff_invite(text, text, text, uuid)
  to authenticated;
