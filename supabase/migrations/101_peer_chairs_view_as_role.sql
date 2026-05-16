-- ============================================================
-- 101 get_peer_chairs honors effective viewAs role
--
-- The previous version read profiles.role for auth.uid() and used it
-- to drive the my_role / all_chairs filter. That broke the
-- common-case demo flow: a super_admin previewing the page as a
-- Learning Chair would hit the short-circuit and see EVERY chair +
-- regional role across the region, not the Learning track they
-- expected.
--
-- Fix: accept an optional `p_view_as_role` and let super_admin /
-- president callers swap in a different effective role for the
-- query. Other roles can't spoof — the parameter is ignored if the
-- actual caller isn't one of the impersonating roles.
--
-- Signature changes (added p_view_as_role), so the old (text,text,text)
-- function must be dropped first — Postgres treats overloads as
-- distinct functions and PostgREST collides on overload ambiguity.
-- ============================================================

drop function if exists public.get_peer_chairs(text, text, text);

create or replace function public.get_peer_chairs(
  p_fiscal_year text,
  p_scope text default 'region',
  p_role_filter text default 'my_role',
  p_view_as_role text default null
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
  v_actual_role text;
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

  select prof.role, prof.region into v_actual_role, v_caller_region
    from public.profiles prof where prof.id = auth.uid();

  if v_actual_role is null then return; end if;

  -- viewAs swap: super_admin / president can preview the page as
  -- another role. Anyone else with `p_view_as_role` set is ignored
  -- (defense against frontend tampering — RLS still applies on the
  -- underlying tables, but this RPC is SECURITY DEFINER so we have
  -- to gate the swap explicitly).
  if p_view_as_role is not null
     and p_view_as_role <> ''
     and v_actual_role in ('super_admin', 'president')
  then
    v_caller_role := p_view_as_role;
  else
    v_caller_role := v_actual_role;
  end if;

  -- Super-admin path now keys off the EFFECTIVE role. A super_admin
  -- with no viewAs lands here and sees every chair + regional role.
  -- A super_admin viewing as Learning Chair gets the Learning track
  -- like a normal LC would.
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
    return;
  end if;

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

  if v_regional_roles is not null and array_length(v_regional_roles, 1) > 0 then
    return query
      select
        ('rp:' || p.id::text) as id,
        coalesce(nullif(p.full_name, ''), nullif(cm.name, ''), p.email) as name,
        p.email as email,
        coalesce(nullif(p.phone, ''), nullif(cm.phone, ''), '') as phone,
        coalesce(nullif(cm.company, ''), '') as company,
        c.id as chapter_id,
        coalesce(c.name, '') as chapter_name,
        coalesce(p.region, c.region, '') as region,
        p.role as role_key,
        public._regional_role_label(p.role) as role_label,
        'active' as status,
        p_fiscal_year as fiscal_year,
        true as is_regional
      from public.profiles p
      left join public.chapters c on c.id = p.chapter_id
      left join public.chapter_members cm
        on cm.chapter_id = p.chapter_id
        and lower(cm.email) = lower(p.email)
      where p.role = any(v_regional_roles)
        and p.email is not null
        and p.email <> ''
        and (p_scope = 'global' or coalesce(p.region, c.region, '') = coalesce(v_caller_region, ''));
  end if;
end;
$$;

grant execute on function public.get_peer_chairs(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
