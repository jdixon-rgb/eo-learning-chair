-- ============================================================
-- 098 get_peer_chairs RPC — cross-chapter peer network for chairs
--
-- Lets a chapter chair see their counterparts across other chapters.
-- A Learning Chair, for example, can pull the Learning Chairs of
-- every other chapter in their region (or globally), plus the
-- Regional Learning Chair Expert for that region.
--
-- Default-on for chairs (no opt-in required) — matches the "chairs
-- already represent their chapter externally" posture. SLP / member
-- privacy boundaries are preserved: this function only returns chair
-- and regional-staff identities, never regular members or SLPs.
--
-- SECURITY DEFINER because the caller's RLS would otherwise block
-- cross-chapter reads of role_assignments / chapter_members.
-- ============================================================

-- ── 1. Role-group mapping ─────────────────────────────────────
-- Each chair / regional role maps to a track. `my_role` filter
-- returns peers in the caller's track. `all_chairs` ignores this
-- and returns every chair + regional role.
create or replace function public._peer_role_group(p_role text)
returns text[]
language sql immutable
as $$
  select case p_role
    -- President track (includes regional_manager — they oversee the chapter execs)
    when 'president' then array['president','president_elect','president_elect_elect','regional_manager']
    when 'president_elect' then array['president','president_elect','president_elect_elect','regional_manager']
    when 'president_elect_elect' then array['president','president_elect','president_elect_elect','regional_manager']
    when 'regional_manager' then array['president','president_elect','president_elect_elect','regional_manager']
    -- Learning track (includes the regional learning chair expert)
    when 'learning_chair' then array['learning_chair','learning_chair_elect','regional_learning_chair_expert']
    when 'learning_chair_elect' then array['learning_chair','learning_chair_elect','regional_learning_chair_expert']
    when 'regional_learning_chair_expert' then array['learning_chair','learning_chair_elect','regional_learning_chair_expert']
    -- Single-role tracks
    when 'finance_chair' then array['finance_chair']
    when 'engagement_chair' then array['engagement_chair']
    when 'sap_chair' then array['sap_chair']
    when 'slp_chair' then array['slp_chair']
    when 'forum_health_chair' then array['forum_health_chair']
    when 'forum_placement_chair' then array['forum_placement_chair']
    -- Staff peers each other across chapters
    when 'chapter_executive_director' then array['chapter_executive_director','chapter_experience_coordinator']
    when 'chapter_experience_coordinator' then array['chapter_executive_director','chapter_experience_coordinator']
    else array[]::text[]
  end;
$$;

-- Friendly label for regional roles in the result set. Chair labels
-- come from chapter_roles.label; regional roles aren't in that table.
create or replace function public._regional_role_label(p_role text)
returns text
language sql immutable
as $$
  select case p_role
    when 'regional_learning_chair_expert' then 'Regional Learning Chair Expert'
    when 'regional_manager' then 'Regional Manager'
    else p_role
  end;
$$;

-- ── 2. The RPC ────────────────────────────────────────────────
-- Inputs:
--   p_fiscal_year  Current FY string (caller passes activeFiscalYear).
--                  Passed in rather than computed so the frontend can
--                  switch context if needed.
--   p_scope        'region' (default) — only same-region chapters.
--                  'global' — every chapter.
--   p_role_filter  'my_role' (default) — caller's track only.
--                  'all_chairs' — every chair + regional role.
--
-- Output: one row per peer (chair or regional expert). Composite `id`
-- has a prefix so the frontend can key rows even when an underlying
-- uuid collides across populations.
create or replace function public.get_peer_chairs(
  p_fiscal_year text,
  p_scope text default 'region',
  p_role_filter text default 'my_role'
)
returns table (
  id text,
  name text,
  email text,
  phone text,
  company text,
  chapter_id uuid,
  chapter_name text,
  region text,
  role_key text,
  role_label text,
  status text,
  fiscal_year text,
  is_regional boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_region text;
  v_chair_roles text[];
  v_regional_roles text[];
  v_all_chair_roles constant text[] := array[
    'president','president_elect','president_elect_elect',
    'finance_chair','learning_chair','learning_chair_elect',
    'engagement_chair','sap_chair','slp_chair',
    'forum_health_chair','forum_placement_chair',
    'chapter_executive_director','chapter_experience_coordinator'
  ];
  v_all_regional_roles constant text[] := array[
    'regional_learning_chair_expert','regional_manager'
  ];
begin
  if auth.uid() is null then return; end if;

  select role, region into v_caller_role, v_caller_region
    from public.profiles where id = auth.uid();

  if v_caller_role is null then return; end if;

  -- Super admins see everything regardless of inputs (matches their
  -- platform-level access elsewhere). Normal callers must be in one
  -- of the chair / staff / regional roles.
  if v_caller_role = 'super_admin' then
    v_chair_roles := v_all_chair_roles;
    v_regional_roles := v_all_regional_roles;
  elsif v_caller_role = any(v_all_chair_roles) or v_caller_role = any(v_all_regional_roles) then
    if p_role_filter = 'all_chairs' then
      v_chair_roles := v_all_chair_roles;
      v_regional_roles := v_all_regional_roles;
    else
      select array_agg(r) into v_chair_roles
        from unnest(public._peer_role_group(v_caller_role)) r
        where r = any(v_all_chair_roles);
      select array_agg(r) into v_regional_roles
        from unnest(public._peer_role_group(v_caller_role)) r
        where r = any(v_all_regional_roles);
    end if;
  else
    -- Caller isn't a chair / staff / regional. No peer network for them.
    return;
  end if;

  -- Chair counterparts: role_assignments + chapter context
  return query
    select
      ('ra:' || ra.id::text) as id,
      coalesce(nullif(cm.name, ''), nullif(ra.member_name, ''), 'Unknown') as name,
      coalesce(nullif(cm.email, ''), nullif(ra.member_email, ''), '') as email,
      coalesce(cm.phone, '') as phone,
      coalesce(cm.company, '') as company,
      c.id as chapter_id,
      c.name as chapter_name,
      coalesce(c.region, '') as region,
      cr.role_key,
      cr.label as role_label,
      ra.status,
      ra.fiscal_year,
      false as is_regional
    from public.role_assignments ra
    join public.chapter_roles cr on cr.id = ra.chapter_role_id
    join public.chapters c on c.id = ra.chapter_id
    left join public.chapter_members cm on cm.id = ra.member_id
    where ra.status in ('active','elect')
      and (p_fiscal_year is null or ra.fiscal_year = p_fiscal_year)
      and v_chair_roles is not null
      and cr.role_key = any(v_chair_roles)
      and (p_scope = 'global' or coalesce(c.region, '') = coalesce(v_caller_region, ''))
      and coalesce(nullif(cm.email, ''), nullif(ra.member_email, ''), '') <> '';

  -- Regional experts: pulled from profiles (no chapter binding)
  if v_regional_roles is not null and array_length(v_regional_roles, 1) > 0 then
    return query
      select
        ('rp:' || p.id::text) as id,
        coalesce(nullif(p.full_name, ''), p.email) as name,
        p.email as email,
        coalesce(p.phone, '') as phone,
        ''::text as company,
        null::uuid as chapter_id,
        ''::text as chapter_name,
        coalesce(p.region, '') as region,
        p.role as role_key,
        public._regional_role_label(p.role) as role_label,
        'active' as status,
        p_fiscal_year as fiscal_year,
        true as is_regional
      from public.profiles p
      where p.role = any(v_regional_roles)
        and p.email is not null
        and p.email <> ''
        and (p_scope = 'global' or coalesce(p.region, '') = coalesce(v_caller_region, ''));
  end if;
end;
$$;

grant execute on function public.get_peer_chairs(text, text, text) to authenticated;

notify pgrst, 'reload schema';
