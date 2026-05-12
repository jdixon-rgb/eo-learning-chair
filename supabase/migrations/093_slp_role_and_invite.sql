-- ============================================================
-- 093 SLP forums (Phase 1): 'slp' role + invite_slp RPC
-- ============================================================
-- Adds the 'slp' app role to profiles + member_invites and the
-- invite_slp RPC the member's profile page calls when inviting
-- their SLP to claim a login. Extends handle_new_user so a new
-- auth user with an 'slp' invite gets linked back to their slps
-- row via slps.profile_id.
--
-- Idempotent: safe to re-run.

-- ── 1. profiles.role allow 'slp' ────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user',
    'slp'
  ));

-- ── 2. member_invites.role allow 'slp' ──────────────────────
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'regional_learning_chair_expert',
    'president',
    'president_elect',
    'president_elect_elect',
    'finance_chair',
    'learning_chair',
    'learning_chair_elect',
    'engagement_chair',
    'sap_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member',
    'sap_contact',
    'demo_user',
    'slp'
  ));

-- ── 3. handle_new_user: link SLP profile to slps row ────────
-- When the incoming auth user came in via an SLP invite, the
-- base handler already creates a profile with role='slp'. We
-- additionally need to point slps.profile_id at the new auth id
-- so current_slp_id() can resolve it, and flip invite_status to
-- 'active'. Match by email since slps.email is unique (089).
--
-- This is layered on top of the existing handler from 066/070
-- rather than redefining it from scratch — we keep the existing
-- invite-matching + region copy and just add the SLP link step
-- as a post-insert update.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''));

  if coalesce(new.email, '') <> '' then
    select * into invite from public.member_invites
      where lower(email) = lower(new.email)
      limit 1;
    invite_found := found;
  end if;

  if not invite_found and normalized_phone <> '' then
    select * into invite from public.member_invites
      where phone is not null
        and phone <> ''
        and public._normalize_phone(phone) = normalized_phone
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id, region)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, ''),
      invite.chapter_id,
      invite.region
    );
    update public.member_invites set claimed_at = now() where id = invite.id;

    -- SLP invite: link the new profile to its slps row.
    if invite.role = 'slp' then
      update public.slps
         set profile_id = new.id,
             invite_status = 'active'
       where lower(email) = lower(new.email)
         and chapter_id = invite.chapter_id;
    end if;
  else
    insert into public.profiles (id, email, full_name, role, phone)
    values (
      new.id,
      coalesce(nullif(new.email, ''), ''),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      'member',
      coalesce(nullif(new.phone, ''), '')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ── 4. invite_slp RPC ───────────────────────────────────────
-- Called from the member's profile SLP card. Stores contact info
-- on the SLP row, creates the invite, and flips status to pending.
-- Only the SLP's own member (i.e. current_chapter_member_id() =
-- slps.member_id) or a chapter admin can call this — defense in
-- depth on top of the page's permission gate.
create or replace function public.invite_slp(
  p_slp_id uuid,
  p_email  text,
  p_phone  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slp record;
  v_email_norm text;
begin
  v_email_norm := lower(trim(p_email));
  if v_email_norm = '' or v_email_norm is null then
    raise exception 'Email is required to invite an SLP';
  end if;

  select * into v_slp from public.slps where id = p_slp_id;
  if not found then
    raise exception 'SLP not found: %', p_slp_id;
  end if;

  -- Authorization: SLP's own member, or chapter admin.
  if not (
       v_slp.member_id = public.current_chapter_member_id()
    or public.is_slp_admin(v_slp.chapter_id)
  ) then
    raise exception 'Not authorized to invite this SLP';
  end if;

  -- Stash contact info + flip status.
  update public.slps
     set email = v_email_norm,
         phone = coalesce(p_phone, phone),
         invite_status = 'pending',
         invited_at = now(),
         updated_at = now()
   where id = p_slp_id;

  -- Drop the invite. ON CONFLICT keeps the same email-to-invite
  -- mapping (re-inviting an SLP refreshes the invite rather than
  -- creating a second row).
  insert into public.member_invites (email, full_name, role, phone, chapter_id)
  values (
    v_email_norm,
    coalesce(v_slp.name, ''),
    'slp',
    p_phone,
    v_slp.chapter_id
  )
  on conflict (email) do update
    set full_name  = excluded.full_name,
        role       = excluded.role,
        phone      = excluded.phone,
        chapter_id = excluded.chapter_id;
end;
$$;

grant execute on function public.invite_slp(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';
