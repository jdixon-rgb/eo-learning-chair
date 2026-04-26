-- ============================================================
-- Our Chapter OS — Database Baseline (snapshot of prod schema)
-- Generated: 2026-04-26 from prod (pnrbvaehjbabjckixoxt) via pg_dump 18.3
--
-- Purpose: bootstrap any fresh Supabase project (staging, future envs)
-- in lockstep with current prod schema. After applying this baseline,
-- migrations 070+ apply normally via `supabase db push --linked --yes`.
--
-- Migrations 001-069 are NOT replayed by this baseline — apply them as
-- already-applied via baseline_migration_tracking.sql so future db push
-- doesn't try to re-run them.
--
-- See docs/ENVIRONMENTS.md for the full bootstrap procedure.
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: life_event_time_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.life_event_time_type AS ENUM (
    'year',
    'age'
);


--
-- Name: life_event_valence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.life_event_valence AS ENUM (
    'positive',
    'negative'
);


--
-- Name: _normalize_phone(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._normalize_phone(p text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
  if length(d) = 11 and substring(d, 1, 1) = '1' then
    d := substring(d, 2);
  end if;
  return d;
end;
$$;


--
-- Name: can_submit_lc_recommendations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_submit_lc_recommendations() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('learning_chair','learning_chair_elect','super_admin')
  );
$$;


--
-- Name: current_beta_terms_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_beta_terms_version() RETURNS TABLE(id uuid, version text, effective_date date, content_md text, summary text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select id, version, effective_date, content_md, summary
  from public.beta_terms_versions
  where effective_date <= current_date
  order by effective_date desc, version desc
  limit 1;
$$;


--
-- Name: current_chapter_member_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_chapter_member_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select cm.id
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$;


--
-- Name: current_member_forum(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_member_forum() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select cm.forum
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  invite record;
  invite_found boolean := false;
  normalized_phone text;
  email_domain text;
begin
  normalized_phone := public._normalize_phone(coalesce(new.phone, ''));

  if coalesce(new.email, '') <> '' then
    select * into invite from public.member_invites
      where email is not null
        and email not like '*@%'
        and lower(email) = lower(new.email)
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

  if not invite_found and coalesce(new.email, '') <> '' and position('@' in new.email) > 0 then
    email_domain := lower(substring(new.email from position('@' in new.email)));
    select * into invite from public.member_invites
      where email like '*@%'
        and lower(substring(email from 2)) = email_domain
      limit 1;
    invite_found := found;
  end if;

  if invite_found then
    insert into public.profiles (id, email, full_name, role, phone, chapter_id)
    values (
      new.id,
      coalesce(nullif(new.email, ''), invite.email, ''),
      coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
      coalesce(invite.role, 'member'),
      coalesce(nullif(new.phone, ''), invite.phone, ''),
      invite.chapter_id
    );
    if invite.email is null or invite.email not like '*@%' then
      update public.member_invites set claimed_at = now() where id = invite.id;
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
$$;


--
-- Name: has_acked_current_beta_terms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_acked_current_beta_terms() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.beta_terms_acknowledgments a
    join public.current_beta_terms_version() c on c.id = a.version_id
    where a.user_id = auth.uid()
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      'super_admin',
      'president',
      'finance_chair',
      'learning_chair',
      'engagement_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$;


--
-- Name: is_board_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_board_member(check_chapter_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in ('board_liaison', 'learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director')
  );
$$;


--
-- Name: is_chapter_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_chapter_admin(check_chapter_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = 'super_admin'
      or (
        chapter_id = check_chapter_id
        and role in (
          'president',
          'finance_chair',
          'learning_chair',
          'engagement_chair',
          'chapter_experience_coordinator',
          'chapter_executive_director'
        )
      )
    )
  );
$$;


--
-- Name: is_invited_member(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_invited_member(check_email text DEFAULT NULL::text, check_phone text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.member_invites
    where (
      check_email is not null
      and check_email <> ''
      and email is not null
      and email not like '*@%'
      and lower(email) = lower(check_email)
    )
    or (
      check_email is not null
      and check_email <> ''
      and email like '*@%'
      and position('@' in check_email) > 0
      and lower(substring(check_email from position('@' in check_email))) = lower(substring(email from 2))
    )
    or (
      check_phone is not null
      and check_phone <> ''
      and phone is not null
      and phone <> ''
      and public._normalize_phone(phone) = public._normalize_phone(check_phone)
      and public._normalize_phone(check_phone) <> ''
    )
  );
$$;


--
-- Name: is_regional_learning_chair_expert_for(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_regional_learning_chair_expert_for(check_chapter_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.profiles p
    join public.chapters c on c.id = check_chapter_id
    where p.id = auth.uid()
      and p.role = 'regional_learning_chair_expert'
      and p.region is not null
      and p.region = c.region
  );
$$;


--
-- Name: is_slp_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_slp_admin(check_chapter_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      role = 'super_admin'
      or (
        chapter_id = check_chapter_id
        and role in (
          'president',
          'president_elect',
          'president_elect_elect',
          'learning_chair',
          'learning_chair_elect',
          'chapter_executive_director',
          'chapter_experience_coordinator'
        )
      )
    )
  );
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'super_admin'
  );
$$;


--
-- Name: sync_profile_last_sign_in(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_last_sign_in() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- Only fire when the value actually changes. Avoids redundant
  -- writes on UPDATE statements that touch other auth.users columns.
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles
    set last_sign_in_at = new.last_sign_in_at
    where id = new.id;
  end if;
  return new;
end;
$$;


--
-- Name: user_chapter_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_chapter_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select chapter_id from public.profiles
  where id = auth.uid();
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: beta_terms_acknowledgments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beta_terms_acknowledgments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_id uuid NOT NULL,
    acknowledged_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text
);


--
-- Name: beta_terms_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beta_terms_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    effective_date date NOT NULL,
    content_md text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    category text NOT NULL,
    description text DEFAULT ''::text,
    budget_amount integer DEFAULT 0,
    actual_amount integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contracted_amount integer DEFAULT 0,
    CONSTRAINT budget_items_category_check CHECK ((category = ANY (ARRAY['speaker_fee'::text, 'food_beverage'::text, 'venue_rental'::text, 'av_production'::text, 'travel'::text, 'dinner'::text, 'other'::text])))
);


--
-- Name: chair_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chair_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    fiscal_month_index integer NOT NULL,
    chair_role text NOT NULL,
    chair_name text DEFAULT ''::text NOT NULL,
    submitted_by uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    highlights text DEFAULT ''::text,
    challenges text DEFAULT ''::text,
    metrics jsonb DEFAULT '{}'::jsonb,
    next_month_plan text DEFAULT ''::text,
    board_notes text DEFAULT ''::text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL,
    CONSTRAINT chair_reports_chair_role_check CHECK ((chair_role = ANY (ARRAY['president'::text, 'president_elect'::text, 'finance'::text, 'governance'::text, 'membership'::text, 'forum_health'::text, 'forum_placement'::text, 'learning'::text, 'member_engagement'::text, 'marketing_communications'::text, 'strategic_alliances'::text, 'mentorship'::text, 'social'::text, 'gsea'::text, 'myeo'::text, 'slp_champion'::text, 'accelerator'::text, 'executive_director'::text, 'experience_coordinator'::text, 'executive_assistant'::text]))),
    CONSTRAINT chair_reports_fiscal_month_index_check CHECK (((fiscal_month_index >= 0) AND (fiscal_month_index <= 9))),
    CONSTRAINT chair_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text])))
);


--
-- Name: chapter_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    sent_by uuid,
    subject text NOT NULL,
    body text NOT NULL,
    audience text DEFAULT 'all_members'::text NOT NULL,
    audience_roles text[] DEFAULT '{}'::text[],
    channel text DEFAULT 'in_app'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chapter_communications_audience_check CHECK ((audience = ANY (ARRAY['all_members'::text, 'board_only'::text, 'chairs_only'::text, 'custom'::text]))),
    CONSTRAINT chapter_communications_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'both'::text]))),
    CONSTRAINT chapter_communications_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sent'::text])))
);


--
-- Name: chapter_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_name text DEFAULT ''::text,
    last_name text DEFAULT ''::text,
    forum text DEFAULT ''::text,
    industry text DEFAULT ''::text,
    eo_join_date date,
    notes text DEFAULT ''::text,
    CONSTRAINT chapter_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'alumni'::text])))
);


--
-- Name: chapter_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    role_key text NOT NULL,
    label text NOT NULL,
    is_staff boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    fiscal_year_start integer NOT NULL,
    total_budget integer DEFAULT 0 NOT NULL,
    president_theme text DEFAULT ''::text,
    president_name text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    timezone text DEFAULT 'America/Phoenix'::text NOT NULL,
    region text,
    CONSTRAINT chapters_fiscal_year_start_check CHECK (((fiscal_year_start >= 1) AND (fiscal_year_start <= 12)))
);


--
-- Name: compass_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compass_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    member_id uuid NOT NULL,
    source_type text NOT NULL,
    source_ref uuid,
    title text NOT NULL,
    summary text DEFAULT ''::text,
    link_url text DEFAULT ''::text,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    personal_note text DEFAULT ''::text,
    member_status text DEFAULT 'new'::text NOT NULL,
    member_status_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT compass_items_member_status_check CHECK ((member_status = ANY (ARRAY['new'::text, 'interested'::text, 'done'::text, 'not_for_me'::text])))
);


--
-- Name: contract_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    jurisdiction_local boolean DEFAULT false,
    indemnification_clause boolean DEFAULT false,
    mfn_clause boolean DEFAULT false,
    run_of_show_included boolean DEFAULT false,
    av_requirements_specified boolean DEFAULT false,
    cancellation_terms boolean DEFAULT false,
    recording_rights boolean DEFAULT false,
    contract_signed boolean DEFAULT false,
    contract_notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    document_type text DEFAULT 'other'::text NOT NULL,
    file_name text NOT NULL,
    file_size integer DEFAULT 0,
    mime_type text DEFAULT ''::text,
    storage_path text NOT NULL,
    uploaded_by uuid,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_action_items jsonb,
    ai_parsed_at timestamp with time zone,
    CONSTRAINT event_documents_document_type_check CHECK ((document_type = ANY (ARRAY['contract'::text, 'loi'::text, 'rider'::text, 'insurance'::text, 'invoice'::text, 'other'::text])))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    title text NOT NULL,
    event_date date,
    event_time text,
    month_index integer,
    event_type text,
    event_format text,
    strategic_importance text,
    status text DEFAULT 'planning'::text NOT NULL,
    speaker_id uuid,
    candidate_speaker_ids uuid[] DEFAULT '{}'::uuid[],
    sap_ids uuid[] DEFAULT '{}'::uuid[],
    venue_id uuid,
    day_chair_name text DEFAULT ''::text,
    day_chair_phone text DEFAULT ''::text,
    expected_attendance integer,
    actual_attendance integer,
    nps_score numeric(3,1),
    nps_top_takeaway text,
    theme_connection text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    title_locked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL,
    sap_contact_ids jsonb DEFAULT '{}'::jsonb,
    open_to_saps boolean DEFAULT true NOT NULL,
    CONSTRAINT events_event_format_check CHECK ((event_format = ANY (ARRAY['keynote'::text, 'workshop_2hr'::text, 'workshop_4hr'::text, 'workshop_8hr'::text, 'tour'::text, 'dinner'::text]))),
    CONSTRAINT events_event_type_check CHECK ((event_type = ANY (ARRAY['traditional'::text, 'experiential'::text, 'social'::text, 'key_relationships'::text]))),
    CONSTRAINT events_month_index_check CHECK (((month_index >= 0) AND (month_index <= 9))),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['planning'::text, 'speaker_confirmed'::text, 'venue_confirmed'::text, 'fully_confirmed'::text, 'marketing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: feature_recommendation_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_recommendation_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recommendation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    surface text DEFAULT 'learning_chair'::text NOT NULL,
    submitted_by_user_id uuid,
    submitted_by_chapter_id uuid,
    submitter_name text DEFAULT ''::text,
    submitter_chapter_name text DEFAULT ''::text,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    effort text,
    status text DEFAULT 'open'::text NOT NULL,
    shipped_in_version text,
    shipped_at timestamp with time zone,
    duplicate_of uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_recommendations_effort_check CHECK (((effort IS NULL) OR (effort = ANY (ARRAY['easy'::text, 'medium'::text, 'difficult'::text])))),
    CONSTRAINT feature_recommendations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'shipped'::text, 'closed'::text, 'duplicate'::text])))
);


--
-- Name: fiscal_year_budget_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_year_budget_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fiscal_year_budget_id uuid NOT NULL,
    role_key text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fiscal_year_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_year_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    fiscal_year text NOT NULL,
    total_budget integer DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_agenda_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_agenda_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    minutes integer DEFAULT 0 NOT NULL,
    start_time text DEFAULT ''::text,
    end_time text DEFAULT ''::text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_agendas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_agendas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    meeting_date date NOT NULL,
    start_time text DEFAULT '12:00 PM'::text NOT NULL,
    end_time text DEFAULT '4:30 PM'::text NOT NULL,
    location text DEFAULT ''::text,
    host text DEFAULT ''::text,
    mission text DEFAULT ''::text,
    forum_values text DEFAULT ''::text,
    target_minutes integer DEFAULT 270,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_agendas_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: forum_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    title text NOT NULL,
    event_date date NOT NULL,
    event_type text DEFAULT 'meeting'::text NOT NULL,
    location text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    sap_id uuid,
    fiscal_year text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_calendar_events_event_type_check CHECK ((event_type = ANY (ARRAY['meeting'::text, 'retreat'::text, 'sap_visit'::text, 'social'::text, 'other'::text])))
);


--
-- Name: forum_constitution_ratifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_constitution_ratifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    member_id uuid NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_constitution_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_constitution_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    constitution_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    version_number integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    title text DEFAULT 'Forum Constitution'::text NOT NULL,
    preamble text DEFAULT ''::text,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    authored_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    proposed_at timestamp with time zone,
    adopted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_constitution_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'proposed'::text, 'adopted'::text, 'archived'::text])))
);


--
-- Name: forum_constitutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_constitutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    title text NOT NULL,
    doc_type text DEFAULT 'constitution'::text NOT NULL,
    file_url text NOT NULL,
    file_name text DEFAULT ''::text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['constitution'::text, 'other'::text])))
);


--
-- Name: forum_history_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_history_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    chapter_member_id uuid,
    member_name text NOT NULL,
    is_founding_member boolean DEFAULT false NOT NULL,
    joined_year text DEFAULT ''::text,
    left_year text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forum_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_role_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    role text NOT NULL,
    fiscal_year text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_role_assignments_role_check CHECK ((role = ANY (ARRAY['moderator'::text, 'moderator_elect'::text, 'moderator_elect_elect'::text, 'timer'::text, 'technology'::text, 'retreat_planner'::text, 'social'::text])))
);


--
-- Name: forums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    moderator_name text DEFAULT ''::text,
    moderator_email text DEFAULT ''::text,
    meeting_cadence text DEFAULT 'monthly'::text,
    member_count integer DEFAULT 0,
    health_score integer,
    health_notes text DEFAULT ''::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    founded_year text DEFAULT ''::text,
    CONSTRAINT forums_health_score_check CHECK (((health_score >= 1) AND (health_score <= 10))),
    CONSTRAINT forums_meeting_cadence_check CHECK ((meeting_cadence = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text])))
);


--
-- Name: life_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.life_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    title text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    valence public.life_event_valence NOT NULL,
    intensity integer NOT NULL,
    time_type public.life_event_time_type NOT NULL,
    time_value integer NOT NULL,
    computed_year integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    brief boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT life_events_intensity_check CHECK (((intensity >= 1) AND (intensity <= 5)))
);


--
-- Name: member_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    chapter_id uuid,
    phone text,
    region text,
    CONSTRAINT member_invites_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'regional_learning_chair_expert'::text, 'president'::text, 'president_elect'::text, 'president_elect_elect'::text, 'finance_chair'::text, 'learning_chair'::text, 'learning_chair_elect'::text, 'engagement_chair'::text, 'sap_chair'::text, 'chapter_experience_coordinator'::text, 'chapter_executive_director'::text, 'committee_member'::text, 'board_liaison'::text, 'member'::text, 'sap_contact'::text, 'demo_user'::text])))
);


--
-- Name: member_private; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_private (
    member_id uuid NOT NULL,
    birth_year integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_scorecards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_scorecards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    member_profile_id uuid,
    member_name text NOT NULL,
    fiscal_month_index integer NOT NULL,
    events_attended integer DEFAULT 0,
    forum_meetings_attended integer DEFAULT 0,
    forum_id uuid,
    engagement_score integer,
    at_risk boolean DEFAULT false,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL,
    CONSTRAINT member_scorecards_engagement_score_check CHECK (((engagement_score >= 0) AND (engagement_score <= 100))),
    CONSTRAINT member_scorecards_fiscal_month_index_check CHECK (((fiscal_month_index >= 0) AND (fiscal_month_index <= 9)))
);


--
-- Name: mentor_pairings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_pairings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    member_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    cadence text DEFAULT 'biweekly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mentor_pairings_cadence_check CHECK ((cadence = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT mentor_pairings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'reassigned'::text])))
);


--
-- Name: mentors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    appointed_by uuid,
    appointed_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    retired_at timestamp with time zone,
    bio text DEFAULT ''::text,
    max_concurrent_pairings integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mentors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'retired'::text])))
);


--
-- Name: navigator_broadcast_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigator_broadcast_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broadcast_id uuid NOT NULL,
    navigator_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    response_value text NOT NULL,
    note text DEFAULT ''::text,
    responded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: navigator_broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigator_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    fiscal_year text NOT NULL,
    sender_member_id uuid,
    prompt text NOT NULL,
    options jsonb DEFAULT '[{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT navigator_broadcasts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


--
-- Name: navigator_pairings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigator_pairings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    navigator_id uuid NOT NULL,
    member_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    cadence text DEFAULT 'biweekly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL,
    CONSTRAINT navigator_pairings_cadence_check CHECK ((cadence = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT navigator_pairings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'reassigned'::text])))
);


--
-- Name: navigator_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigator_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    title text NOT NULL,
    summary text DEFAULT ''::text,
    body text DEFAULT ''::text,
    link_url text DEFAULT ''::text,
    category text DEFAULT 'faq'::text NOT NULL,
    contributor_name text DEFAULT ''::text,
    contributor_role text DEFAULT ''::text,
    status text DEFAULT 'published'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT navigator_resources_category_check CHECK ((category = ANY (ARRAY['faq'::text, 'university'::text, 'leadership_path'::text, 'seed_moderator_training'::text, 'moderator_training'::text, 'coaching'::text, 'next_level'::text, 'myeo_events'::text, 'international'::text, 'learning_calendar'::text, 'forum_journey'::text, 'other'::text]))),
    CONSTRAINT navigator_resources_contributor_role_check CHECK ((contributor_role = ANY (ARRAY[''::text, 'chair'::text, 'tenured_member'::text, 'external_coach'::text]))),
    CONSTRAINT navigator_resources_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: navigator_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigator_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pairing_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: navigators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    appointed_by uuid,
    appointed_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    retired_at timestamp with time zone,
    bio text DEFAULT ''::text,
    max_concurrent_pairings integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT navigators_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'retired'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    event_id text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['announcement'::text, 'event_update'::text, 'general'::text])))
);


--
-- Name: parking_lot_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parking_lot_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum text NOT NULL,
    author_member_id uuid NOT NULL,
    name text NOT NULL,
    importance integer NOT NULL,
    urgency integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parking_lot_entries_importance_check CHECK (((importance >= 1) AND (importance <= 10))),
    CONSTRAINT parking_lot_entries_urgency_check CHECK (((urgency >= 1) AND (urgency <= 10)))
);


--
-- Name: platform_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    chapter_id uuid,
    feedback_type text DEFAULT 'suggestion'::text NOT NULL,
    message text NOT NULL,
    url text,
    user_agent text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT platform_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['suggestion'::text, 'bug'::text, 'praise'::text, 'question'::text]))),
    CONSTRAINT platform_feedback_status_check CHECK ((status = ANY (ARRAY['new'::text, 'triaged'::text, 'in_progress'::text, 'resolved'::text, 'wont_fix'::text])))
);


--
-- Name: profile_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    member_id uuid NOT NULL,
    kind text NOT NULL,
    note text DEFAULT ''::text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT profile_checkins_kind_check CHECK ((kind = ANY (ARRAY['no_change'::text, 'change_requested'::text]))),
    CONSTRAINT profile_checkins_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    chapter_id uuid,
    avatar_url text,
    phone text,
    company text,
    eo_member_since integer,
    is_active boolean DEFAULT true NOT NULL,
    survey_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    region text,
    last_sign_in_at timestamp with time zone,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'regional_learning_chair_expert'::text, 'president'::text, 'president_elect'::text, 'president_elect_elect'::text, 'finance_chair'::text, 'learning_chair'::text, 'learning_chair_elect'::text, 'engagement_chair'::text, 'sap_chair'::text, 'chapter_experience_coordinator'::text, 'chapter_executive_director'::text, 'committee_member'::text, 'board_liaison'::text, 'member'::text, 'sap_contact'::text, 'demo_user'::text])))
);


--
-- Name: reflection_feelings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reflection_feelings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    word text NOT NULL,
    source text DEFAULT 'user'::text NOT NULL,
    polarity text,
    parent_group text,
    intensity text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reflection_feelings_intensity_check CHECK ((intensity = ANY (ARRAY['strong'::text, 'moderate'::text, 'low'::text]))),
    CONSTRAINT reflection_feelings_polarity_check CHECK ((polarity = ANY (ARRAY['satisfied'::text, 'unsatisfied'::text]))),
    CONSTRAINT reflection_feelings_source_check CHECK ((source = ANY (ARRAY['nvc'::text, 'hesse'::text, 'user'::text])))
);


--
-- Name: reflection_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reflection_templates (
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    schema jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reflections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reflections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    forum text NOT NULL,
    member_id uuid NOT NULL,
    template_slug text NOT NULL,
    category text,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    feelings text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reflections_category_check CHECK ((category = ANY (ARRAY['business'::text, 'personal'::text, 'community'::text])))
);


--
-- Name: role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    chapter_role_id uuid NOT NULL,
    profile_id uuid,
    member_name text NOT NULL,
    member_email text DEFAULT ''::text,
    fiscal_year text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date date,
    end_date date,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    budget integer DEFAULT 0,
    theme text DEFAULT ''::text,
    member_id uuid,
    CONSTRAINT role_assignments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'elect'::text, 'past'::text])))
);


--
-- Name: sap_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sap_id uuid NOT NULL,
    name text NOT NULL,
    role text DEFAULT ''::text,
    email text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    is_primary boolean DEFAULT false,
    forum_trained boolean DEFAULT false,
    forum_trained_date date,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_forum_interest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_forum_interest (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    sap_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    interested boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_forum_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_forum_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    sap_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    forum_id uuid NOT NULL,
    rating integer NOT NULL,
    note text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sap_forum_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: saps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    company text DEFAULT ''::text,
    role text DEFAULT ''::text,
    description text DEFAULT ''::text,
    contribution_type text,
    contribution_description text DEFAULT ''::text,
    contact_email text DEFAULT ''::text,
    contact_phone text DEFAULT ''::text,
    annual_sponsorship integer,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tier text DEFAULT 'gold'::text,
    status text DEFAULT 'active'::text,
    industry text DEFAULT ''::text,
    website text DEFAULT ''::text,
    CONSTRAINT saps_contribution_type_check CHECK ((contribution_type = ANY (ARRAY['workshop'::text, 'sponsorship'::text, 'service'::text, 'other'::text])))
);


--
-- Name: scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    overrides jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL
);


--
-- Name: slps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    member_id uuid NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    relationship_type text DEFAULT 'spouse'::text NOT NULL,
    dob date,
    anniversary date,
    kids text DEFAULT ''::text,
    dietary_restrictions text DEFAULT ''::text,
    allergies text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: speaker_pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaker_pipeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    speaker_id uuid NOT NULL,
    fiscal_year text DEFAULT ''::text NOT NULL,
    pipeline_stage text DEFAULT 'researching'::text NOT NULL,
    fit_score integer,
    fee_estimated integer,
    fee_actual integer,
    contract_storage_path text,
    contract_file_name text,
    w9_storage_path text,
    w9_file_name text,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fee_estimated_private boolean DEFAULT false NOT NULL,
    fee_actual_private boolean DEFAULT false NOT NULL,
    CONSTRAINT speaker_pipeline_fit_score_check CHECK (((fit_score IS NULL) OR ((fit_score >= 1) AND (fit_score <= 10)))),
    CONSTRAINT speaker_pipeline_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['researching'::text, 'outreach'::text, 'negotiating'::text, 'contracted'::text, 'confirmed'::text, 'passed'::text])))
);


--
-- Name: speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speakers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    topic text DEFAULT ''::text,
    bio text DEFAULT ''::text,
    fee_range_low integer,
    fee_range_high integer,
    fee_estimated integer,
    fee_actual integer,
    contact_email text DEFAULT ''::text,
    contact_phone text DEFAULT ''::text,
    agency_name text DEFAULT ''::text,
    agency_contact text DEFAULT ''::text,
    contact_method text,
    pipeline_stage text NOT NULL,
    fit_score integer,
    notes text DEFAULT ''::text,
    sizzle_reel_url text DEFAULT ''::text,
    routing_flexibility boolean DEFAULT false,
    multi_chapter_interest boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contract_storage_path text,
    contract_file_name text,
    w9_storage_path text,
    w9_file_name text,
    share_scope text DEFAULT 'chapter_only'::text NOT NULL,
    shared_chapter_name text,
    imported_from_speaker_id uuid,
    CONSTRAINT speakers_contact_method_check CHECK ((contact_method = ANY (ARRAY['direct'::text, 'agency'::text, 'linkedin'::text, 'referral'::text]))),
    CONSTRAINT speakers_fit_score_check CHECK (((fit_score >= 1) AND (fit_score <= 10))),
    CONSTRAINT speakers_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['researching'::text, 'outreach'::text, 'negotiating'::text, 'contracted'::text, 'confirmed'::text, 'passed'::text]))),
    CONSTRAINT speakers_share_scope_check CHECK ((share_scope = ANY (ARRAY['chapter_only'::text, 'global'::text])))
);


--
-- Name: survey_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    energy_formats text[] DEFAULT '{}'::text[],
    energy_ranking jsonb DEFAULT '[]'::jsonb,
    energy_time text,
    growth_topics text[] DEFAULT '{}'::text[],
    growth_stage text,
    growth_challenge text,
    growth_stretch integer,
    joy_social text[] DEFAULT '{}'::text[],
    joy_venue text,
    joy_speakers text[] DEFAULT '{}'::text[],
    perspective_style text[] DEFAULT '{}'::text[],
    perspective_diversity text,
    open_dream_event text,
    open_speaker_wish text,
    open_feedback text,
    current_section integer DEFAULT 1 NOT NULL,
    is_complete boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    chapter_id uuid,
    CONSTRAINT survey_responses_growth_stretch_check CHECK (((growth_stretch >= 1) AND (growth_stretch <= 5)))
);


--
-- Name: vendor_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    chapter_member_id uuid NOT NULL,
    rating smallint NOT NULL,
    review_text text DEFAULT ''::text,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'Other'::text NOT NULL,
    address text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    website text DEFAULT ''::text,
    metro_area text DEFAULT 'Phoenix Metro'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tier text DEFAULT 'community'::text NOT NULL,
    sap_id uuid,
    CONSTRAINT vendors_tier_check CHECK ((tier = ANY (ARRAY['community'::text, 'sap_partner'::text])))
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    name text NOT NULL,
    address text DEFAULT ''::text,
    capacity integer,
    base_rental_cost integer,
    av_quality text,
    av_cost_estimate integer,
    venue_type text,
    pipeline_stage text NOT NULL,
    staff_rating integer,
    image_url text,
    description text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    contact_name text DEFAULT ''::text,
    contact_email text DEFAULT ''::text,
    contact_phone text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    archive_reason text DEFAULT ''::text,
    program_year text DEFAULT ''::text,
    fb_notes text DEFAULT ''::text,
    fb_estimated_cost numeric,
    fb_vendor text DEFAULT ''::text,
    parking_notes text DEFAULT ''::text,
    setup_notes text DEFAULT ''::text,
    CONSTRAINT venues_av_quality_check CHECK ((av_quality = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'byob'::text]))),
    CONSTRAINT venues_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['researching'::text, 'quote_requested'::text, 'site_visit'::text, 'negotiating'::text, 'contract'::text, 'confirmed'::text, 'archived'::text]))),
    CONSTRAINT venues_staff_rating_check CHECK (((staff_rating IS NULL) OR ((staff_rating >= 0) AND (staff_rating <= 5)))),
    CONSTRAINT venues_venue_type_check CHECK ((venue_type = ANY (ARRAY['hotel'::text, 'museum'::text, 'outdoor'::text, 'restaurant'::text, 'private'::text, 'theater'::text, 'other'::text])))
);


--
-- Name: beta_terms_acknowledgments beta_terms_acknowledgments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_acknowledgments
    ADD CONSTRAINT beta_terms_acknowledgments_pkey PRIMARY KEY (id);


--
-- Name: beta_terms_acknowledgments beta_terms_acknowledgments_user_id_version_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_acknowledgments
    ADD CONSTRAINT beta_terms_acknowledgments_user_id_version_id_key UNIQUE (user_id, version_id);


--
-- Name: beta_terms_versions beta_terms_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_versions
    ADD CONSTRAINT beta_terms_versions_pkey PRIMARY KEY (id);


--
-- Name: beta_terms_versions beta_terms_versions_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_versions
    ADD CONSTRAINT beta_terms_versions_version_key UNIQUE (version);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);


--
-- Name: chair_reports chair_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chair_reports
    ADD CONSTRAINT chair_reports_pkey PRIMARY KEY (id);


--
-- Name: chapter_communications chapter_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_communications
    ADD CONSTRAINT chapter_communications_pkey PRIMARY KEY (id);


--
-- Name: chapter_members chapter_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_members
    ADD CONSTRAINT chapter_members_pkey PRIMARY KEY (id);


--
-- Name: chapter_roles chapter_roles_chapter_id_role_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_roles
    ADD CONSTRAINT chapter_roles_chapter_id_role_key_key UNIQUE (chapter_id, role_key);


--
-- Name: chapter_roles chapter_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_roles
    ADD CONSTRAINT chapter_roles_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: compass_items compass_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compass_items
    ADD CONSTRAINT compass_items_pkey PRIMARY KEY (id);


--
-- Name: contract_checklists contract_checklists_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_checklists
    ADD CONSTRAINT contract_checklists_event_id_key UNIQUE (event_id);


--
-- Name: contract_checklists contract_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_checklists
    ADD CONSTRAINT contract_checklists_pkey PRIMARY KEY (id);


--
-- Name: event_documents event_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_documents
    ADD CONSTRAINT event_documents_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: feature_recommendation_votes feature_recommendation_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendation_votes
    ADD CONSTRAINT feature_recommendation_votes_pkey PRIMARY KEY (id);


--
-- Name: feature_recommendation_votes feature_recommendation_votes_recommendation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendation_votes
    ADD CONSTRAINT feature_recommendation_votes_recommendation_id_user_id_key UNIQUE (recommendation_id, user_id);


--
-- Name: feature_recommendations feature_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendations
    ADD CONSTRAINT feature_recommendations_pkey PRIMARY KEY (id);


--
-- Name: fiscal_year_budget_lines fiscal_year_budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_budget_lines
    ADD CONSTRAINT fiscal_year_budget_lines_pkey PRIMARY KEY (id);


--
-- Name: fiscal_year_budgets fiscal_year_budgets_chapter_id_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_budgets
    ADD CONSTRAINT fiscal_year_budgets_chapter_id_fiscal_year_key UNIQUE (chapter_id, fiscal_year);


--
-- Name: fiscal_year_budgets fiscal_year_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_budgets
    ADD CONSTRAINT fiscal_year_budgets_pkey PRIMARY KEY (id);


--
-- Name: forum_agenda_items forum_agenda_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agenda_items
    ADD CONSTRAINT forum_agenda_items_pkey PRIMARY KEY (id);


--
-- Name: forum_agendas forum_agendas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agendas
    ADD CONSTRAINT forum_agendas_pkey PRIMARY KEY (id);


--
-- Name: forum_calendar_events forum_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_calendar_events
    ADD CONSTRAINT forum_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: forum_constitution_ratifications forum_constitution_ratifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_ratifications
    ADD CONSTRAINT forum_constitution_ratifications_pkey PRIMARY KEY (id);


--
-- Name: forum_constitution_ratifications forum_constitution_ratifications_version_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_ratifications
    ADD CONSTRAINT forum_constitution_ratifications_version_id_member_id_key UNIQUE (version_id, member_id);


--
-- Name: forum_constitution_versions forum_constitution_versions_constitution_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_versions
    ADD CONSTRAINT forum_constitution_versions_constitution_id_version_number_key UNIQUE (constitution_id, version_number);


--
-- Name: forum_constitution_versions forum_constitution_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_versions
    ADD CONSTRAINT forum_constitution_versions_pkey PRIMARY KEY (id);


--
-- Name: forum_constitutions forum_constitutions_forum_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_forum_id_key UNIQUE (forum_id);


--
-- Name: forum_constitutions forum_constitutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_pkey PRIMARY KEY (id);


--
-- Name: forum_documents forum_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_documents
    ADD CONSTRAINT forum_documents_pkey PRIMARY KEY (id);


--
-- Name: forum_history_members forum_history_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_history_members
    ADD CONSTRAINT forum_history_members_pkey PRIMARY KEY (id);


--
-- Name: forum_role_assignments forum_role_assignments_forum_id_role_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_role_assignments
    ADD CONSTRAINT forum_role_assignments_forum_id_role_fiscal_year_key UNIQUE (forum_id, role, fiscal_year);


--
-- Name: forum_role_assignments forum_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_role_assignments
    ADD CONSTRAINT forum_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: forums forums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_pkey PRIMARY KEY (id);


--
-- Name: life_events life_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT life_events_pkey PRIMARY KEY (id);


--
-- Name: member_invites member_invites_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_invites
    ADD CONSTRAINT member_invites_email_key UNIQUE (email);


--
-- Name: member_invites member_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_invites
    ADD CONSTRAINT member_invites_pkey PRIMARY KEY (id);


--
-- Name: member_private member_private_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_private
    ADD CONSTRAINT member_private_pkey PRIMARY KEY (member_id);


--
-- Name: member_scorecards member_scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_scorecards
    ADD CONSTRAINT member_scorecards_pkey PRIMARY KEY (id);


--
-- Name: mentor_pairings mentor_pairings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_pairings
    ADD CONSTRAINT mentor_pairings_pkey PRIMARY KEY (id);


--
-- Name: mentors mentors_chapter_id_chapter_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_chapter_id_chapter_member_id_key UNIQUE (chapter_id, chapter_member_id);


--
-- Name: mentors mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_pkey PRIMARY KEY (id);


--
-- Name: navigator_broadcast_responses navigator_broadcast_responses_broadcast_id_navigator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcast_responses
    ADD CONSTRAINT navigator_broadcast_responses_broadcast_id_navigator_id_key UNIQUE (broadcast_id, navigator_id);


--
-- Name: navigator_broadcast_responses navigator_broadcast_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcast_responses
    ADD CONSTRAINT navigator_broadcast_responses_pkey PRIMARY KEY (id);


--
-- Name: navigator_broadcasts navigator_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcasts
    ADD CONSTRAINT navigator_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: navigator_pairings navigator_pairings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_pairings
    ADD CONSTRAINT navigator_pairings_pkey PRIMARY KEY (id);


--
-- Name: navigator_resources navigator_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_resources
    ADD CONSTRAINT navigator_resources_pkey PRIMARY KEY (id);


--
-- Name: navigator_sessions navigator_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_sessions
    ADD CONSTRAINT navigator_sessions_pkey PRIMARY KEY (id);


--
-- Name: navigators navigators_chapter_id_chapter_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigators
    ADD CONSTRAINT navigators_chapter_id_chapter_member_id_key UNIQUE (chapter_id, chapter_member_id);


--
-- Name: navigators navigators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigators
    ADD CONSTRAINT navigators_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parking_lot_entries parking_lot_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_lot_entries
    ADD CONSTRAINT parking_lot_entries_pkey PRIMARY KEY (id);


--
-- Name: platform_feedback platform_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_feedback
    ADD CONSTRAINT platform_feedback_pkey PRIMARY KEY (id);


--
-- Name: profile_checkins profile_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_checkins
    ADD CONSTRAINT profile_checkins_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reflection_feelings reflection_feelings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_feelings
    ADD CONSTRAINT reflection_feelings_pkey PRIMARY KEY (id);


--
-- Name: reflection_feelings reflection_feelings_word_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_feelings
    ADD CONSTRAINT reflection_feelings_word_key UNIQUE (word);


--
-- Name: reflection_templates reflection_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_templates
    ADD CONSTRAINT reflection_templates_pkey PRIMARY KEY (slug);


--
-- Name: reflections reflections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_pkey PRIMARY KEY (id);


--
-- Name: role_assignments role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_pkey PRIMARY KEY (id);


--
-- Name: sap_contacts sap_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_contacts
    ADD CONSTRAINT sap_contacts_pkey PRIMARY KEY (id);


--
-- Name: sap_forum_interest sap_forum_interest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_pkey PRIMARY KEY (id);


--
-- Name: sap_forum_interest sap_forum_interest_sap_id_chapter_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_sap_id_chapter_member_id_key UNIQUE (sap_id, chapter_member_id);


--
-- Name: sap_forum_ratings sap_forum_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_pkey PRIMARY KEY (id);


--
-- Name: sap_forum_ratings sap_forum_ratings_sap_id_chapter_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_sap_id_chapter_member_id_key UNIQUE (sap_id, chapter_member_id);


--
-- Name: saps saps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saps
    ADD CONSTRAINT saps_pkey PRIMARY KEY (id);


--
-- Name: scenarios scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_pkey PRIMARY KEY (id);


--
-- Name: slps slps_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slps
    ADD CONSTRAINT slps_member_id_key UNIQUE (member_id);


--
-- Name: slps slps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slps
    ADD CONSTRAINT slps_pkey PRIMARY KEY (id);


--
-- Name: speaker_pipeline speaker_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_pipeline
    ADD CONSTRAINT speaker_pipeline_pkey PRIMARY KEY (id);


--
-- Name: speaker_pipeline speaker_pipeline_speaker_id_fiscal_year_chapter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_pipeline
    ADD CONSTRAINT speaker_pipeline_speaker_id_fiscal_year_chapter_id_key UNIQUE (speaker_id, fiscal_year, chapter_id);


--
-- Name: speakers speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


--
-- Name: survey_responses survey_responses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_user_id_key UNIQUE (user_id);


--
-- Name: vendor_reviews vendor_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_reviews
    ADD CONSTRAINT vendor_reviews_pkey PRIMARY KEY (id);


--
-- Name: vendor_reviews vendor_reviews_unique_member_vendor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_reviews
    ADD CONSTRAINT vendor_reviews_unique_member_vendor UNIQUE (vendor_id, chapter_member_id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: idx_agenda_items_agenda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_agenda ON public.forum_agenda_items USING btree (agenda_id);


--
-- Name: idx_beta_terms_acks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beta_terms_acks_user ON public.beta_terms_acknowledgments USING btree (user_id);


--
-- Name: idx_beta_terms_versions_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beta_terms_versions_effective ON public.beta_terms_versions USING btree (effective_date DESC);


--
-- Name: idx_budget_items_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_items_event ON public.budget_items USING btree (event_id);


--
-- Name: idx_chair_reports_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chair_reports_chapter ON public.chair_reports USING btree (chapter_id);


--
-- Name: idx_chair_reports_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chair_reports_fiscal_year ON public.chair_reports USING btree (fiscal_year);


--
-- Name: idx_chapter_comms_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_comms_chapter ON public.chapter_communications USING btree (chapter_id);


--
-- Name: idx_chapter_members_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_members_chapter ON public.chapter_members USING btree (chapter_id);


--
-- Name: idx_chapter_members_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_members_forum ON public.chapter_members USING btree (forum);


--
-- Name: idx_chapter_roles_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_roles_chapter ON public.chapter_roles USING btree (chapter_id);


--
-- Name: idx_compass_items_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compass_items_chapter ON public.compass_items USING btree (chapter_id);


--
-- Name: idx_compass_items_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compass_items_member ON public.compass_items USING btree (member_id);


--
-- Name: idx_compass_items_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compass_items_source ON public.compass_items USING btree (source_type, source_ref);


--
-- Name: idx_compass_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compass_items_status ON public.compass_items USING btree (member_status);


--
-- Name: idx_event_documents_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_documents_chapter ON public.event_documents USING btree (chapter_id);


--
-- Name: idx_event_documents_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_documents_event ON public.event_documents USING btree (event_id);


--
-- Name: idx_events_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_fiscal_year ON public.events USING btree (fiscal_year);


--
-- Name: idx_feature_rec_votes_rec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_rec_votes_rec ON public.feature_recommendation_votes USING btree (recommendation_id);


--
-- Name: idx_feature_recs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_recs_status ON public.feature_recommendations USING btree (status);


--
-- Name: idx_feature_recs_surface; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_recs_surface ON public.feature_recommendations USING btree (surface);


--
-- Name: idx_fhm_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fhm_forum ON public.forum_history_members USING btree (forum_id);


--
-- Name: idx_forum_agendas_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_agendas_date ON public.forum_agendas USING btree (meeting_date);


--
-- Name: idx_forum_agendas_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_agendas_forum ON public.forum_agendas USING btree (forum_id);


--
-- Name: idx_forum_agendas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_agendas_status ON public.forum_agendas USING btree (status);


--
-- Name: idx_forum_cal_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_cal_date ON public.forum_calendar_events USING btree (event_date);


--
-- Name: idx_forum_cal_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_cal_forum ON public.forum_calendar_events USING btree (forum_id);


--
-- Name: idx_forum_cal_fy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_cal_fy ON public.forum_calendar_events USING btree (fiscal_year);


--
-- Name: idx_forum_constitution_ratifications_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitution_ratifications_chapter ON public.forum_constitution_ratifications USING btree (chapter_id);


--
-- Name: idx_forum_constitution_ratifications_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitution_ratifications_version ON public.forum_constitution_ratifications USING btree (version_id);


--
-- Name: idx_forum_constitution_versions_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitution_versions_chapter ON public.forum_constitution_versions USING btree (chapter_id);


--
-- Name: idx_forum_constitution_versions_constitution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitution_versions_constitution ON public.forum_constitution_versions USING btree (constitution_id);


--
-- Name: idx_forum_constitution_versions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitution_versions_status ON public.forum_constitution_versions USING btree (status);


--
-- Name: idx_forum_constitutions_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_constitutions_chapter ON public.forum_constitutions USING btree (chapter_id);


--
-- Name: idx_forum_docs_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_docs_forum ON public.forum_documents USING btree (forum_id);


--
-- Name: idx_forums_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forums_chapter ON public.forums USING btree (chapter_id);


--
-- Name: idx_fra_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fra_chapter ON public.forum_role_assignments USING btree (chapter_id);


--
-- Name: idx_fra_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fra_forum ON public.forum_role_assignments USING btree (forum_id);


--
-- Name: idx_fra_fy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fra_fy ON public.forum_role_assignments USING btree (fiscal_year);


--
-- Name: idx_fra_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fra_member ON public.forum_role_assignments USING btree (chapter_member_id);


--
-- Name: idx_fy_budget_lines_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fy_budget_lines_budget ON public.fiscal_year_budget_lines USING btree (fiscal_year_budget_id);


--
-- Name: idx_fy_budgets_chapter_fy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fy_budgets_chapter_fy ON public.fiscal_year_budgets USING btree (chapter_id, fiscal_year);


--
-- Name: idx_life_events_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_life_events_member ON public.life_events USING btree (member_id);


--
-- Name: idx_life_events_member_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_life_events_member_timeline ON public.life_events USING btree (member_id, computed_year, sort_order);


--
-- Name: idx_member_invites_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_invites_phone ON public.member_invites USING btree (phone) WHERE ((phone IS NOT NULL) AND (phone <> ''::text));


--
-- Name: idx_member_scorecards_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_scorecards_chapter ON public.member_scorecards USING btree (chapter_id);


--
-- Name: idx_member_scorecards_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_scorecards_fiscal_year ON public.member_scorecards USING btree (fiscal_year);


--
-- Name: idx_mentor_pairings_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_pairings_chapter ON public.mentor_pairings USING btree (chapter_id);


--
-- Name: idx_mentor_pairings_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_pairings_member ON public.mentor_pairings USING btree (member_id);


--
-- Name: idx_mentor_pairings_mentor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_pairings_mentor ON public.mentor_pairings USING btree (mentor_id);


--
-- Name: idx_mentor_pairings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_pairings_status ON public.mentor_pairings USING btree (status);


--
-- Name: idx_mentors_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentors_chapter ON public.mentors USING btree (chapter_id);


--
-- Name: idx_mentors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentors_status ON public.mentors USING btree (status);


--
-- Name: idx_navigator_broadcasts_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_broadcasts_chapter ON public.navigator_broadcasts USING btree (chapter_id);


--
-- Name: idx_navigator_broadcasts_fy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_broadcasts_fy ON public.navigator_broadcasts USING btree (fiscal_year);


--
-- Name: idx_navigator_broadcasts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_broadcasts_status ON public.navigator_broadcasts USING btree (status);


--
-- Name: idx_navigator_pairings_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_pairings_chapter ON public.navigator_pairings USING btree (chapter_id);


--
-- Name: idx_navigator_pairings_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_pairings_fiscal_year ON public.navigator_pairings USING btree (fiscal_year);


--
-- Name: idx_navigator_pairings_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_pairings_member ON public.navigator_pairings USING btree (member_id);


--
-- Name: idx_navigator_pairings_navigator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_pairings_navigator ON public.navigator_pairings USING btree (navigator_id);


--
-- Name: idx_navigator_pairings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_pairings_status ON public.navigator_pairings USING btree (status);


--
-- Name: idx_navigator_resources_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_resources_category ON public.navigator_resources USING btree (category);


--
-- Name: idx_navigator_resources_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_resources_chapter ON public.navigator_resources USING btree (chapter_id);


--
-- Name: idx_navigator_resources_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_resources_status ON public.navigator_resources USING btree (status);


--
-- Name: idx_navigator_sessions_pairing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigator_sessions_pairing ON public.navigator_sessions USING btree (pairing_id);


--
-- Name: idx_navigators_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigators_chapter ON public.navigators USING btree (chapter_id);


--
-- Name: idx_navigators_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navigators_status ON public.navigators USING btree (status);


--
-- Name: idx_nbr_broadcast; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nbr_broadcast ON public.navigator_broadcast_responses USING btree (broadcast_id);


--
-- Name: idx_nbr_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nbr_member ON public.navigator_broadcast_responses USING btree (chapter_member_id);


--
-- Name: idx_nbr_navigator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nbr_navigator ON public.navigator_broadcast_responses USING btree (navigator_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id, is_read, created_at DESC);


--
-- Name: idx_parking_lot_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parking_lot_forum ON public.parking_lot_entries USING btree (chapter_id, forum);


--
-- Name: idx_platform_feedback_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_feedback_chapter ON public.platform_feedback USING btree (chapter_id);


--
-- Name: idx_platform_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_feedback_status ON public.platform_feedback USING btree (status, created_at DESC);


--
-- Name: idx_profile_checkins_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_checkins_chapter ON public.profile_checkins USING btree (chapter_id);


--
-- Name: idx_profile_checkins_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_checkins_created ON public.profile_checkins USING btree (created_at);


--
-- Name: idx_profile_checkins_kind_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_checkins_kind_status ON public.profile_checkins USING btree (kind, status);


--
-- Name: idx_profile_checkins_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_checkins_member ON public.profile_checkins USING btree (member_id);


--
-- Name: idx_reflection_feelings_word; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reflection_feelings_word ON public.reflection_feelings USING btree (lower(word));


--
-- Name: idx_reflections_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reflections_forum ON public.reflections USING btree (chapter_id, forum);


--
-- Name: idx_reflections_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reflections_member ON public.reflections USING btree (member_id);


--
-- Name: idx_role_assignments_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_assignments_chapter ON public.role_assignments USING btree (chapter_id);


--
-- Name: idx_role_assignments_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_assignments_role ON public.role_assignments USING btree (chapter_role_id);


--
-- Name: idx_sap_contacts_sap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_contacts_sap ON public.sap_contacts USING btree (sap_id);


--
-- Name: idx_sap_interest_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_interest_forum ON public.sap_forum_interest USING btree (forum_id);


--
-- Name: idx_sap_interest_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_interest_member ON public.sap_forum_interest USING btree (chapter_member_id);


--
-- Name: idx_sap_interest_sap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_interest_sap ON public.sap_forum_interest USING btree (sap_id);


--
-- Name: idx_sap_ratings_forum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_ratings_forum ON public.sap_forum_ratings USING btree (forum_id);


--
-- Name: idx_sap_ratings_sap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sap_ratings_sap ON public.sap_forum_ratings USING btree (sap_id);


--
-- Name: idx_scenarios_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenarios_fiscal_year ON public.scenarios USING btree (fiscal_year);


--
-- Name: idx_slps_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slps_chapter ON public.slps USING btree (chapter_id);


--
-- Name: idx_slps_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slps_member ON public.slps USING btree (member_id);


--
-- Name: idx_speaker_pipeline_chapter_fy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speaker_pipeline_chapter_fy ON public.speaker_pipeline USING btree (chapter_id, fiscal_year);


--
-- Name: idx_speaker_pipeline_speaker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speaker_pipeline_speaker ON public.speaker_pipeline USING btree (speaker_id);


--
-- Name: idx_speakers_share_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_share_scope ON public.speakers USING btree (share_scope) WHERE (share_scope = 'global'::text);


--
-- Name: idx_survey_responses_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_responses_chapter ON public.survey_responses USING btree (chapter_id);


--
-- Name: idx_vendor_reviews_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_reviews_member ON public.vendor_reviews USING btree (chapter_member_id);


--
-- Name: idx_vendor_reviews_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_reviews_vendor ON public.vendor_reviews USING btree (vendor_id);


--
-- Name: idx_vendors_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_category ON public.vendors USING btree (category);


--
-- Name: idx_vendors_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_chapter ON public.vendors USING btree (chapter_id);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (name);


--
-- Name: idx_vendors_sap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_sap ON public.vendors USING btree (sap_id) WHERE (sap_id IS NOT NULL);


--
-- Name: idx_vendors_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tier ON public.vendors USING btree (tier) WHERE (tier = 'sap_partner'::text);


--
-- Name: beta_terms_acknowledgments beta_terms_acknowledgments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_acknowledgments
    ADD CONSTRAINT beta_terms_acknowledgments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: beta_terms_acknowledgments beta_terms_acknowledgments_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_terms_acknowledgments
    ADD CONSTRAINT beta_terms_acknowledgments_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.beta_terms_versions(id) ON DELETE RESTRICT;


--
-- Name: budget_items budget_items_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: chair_reports chair_reports_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chair_reports
    ADD CONSTRAINT chair_reports_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: chair_reports chair_reports_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chair_reports
    ADD CONSTRAINT chair_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id);


--
-- Name: chapter_communications chapter_communications_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_communications
    ADD CONSTRAINT chapter_communications_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: chapter_communications chapter_communications_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_communications
    ADD CONSTRAINT chapter_communications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id);


--
-- Name: chapter_members chapter_members_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_members
    ADD CONSTRAINT chapter_members_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: chapter_roles chapter_roles_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_roles
    ADD CONSTRAINT chapter_roles_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: compass_items compass_items_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compass_items
    ADD CONSTRAINT compass_items_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: compass_items compass_items_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compass_items
    ADD CONSTRAINT compass_items_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: compass_items compass_items_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compass_items
    ADD CONSTRAINT compass_items_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: contract_checklists contract_checklists_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_checklists
    ADD CONSTRAINT contract_checklists_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_documents event_documents_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_documents
    ADD CONSTRAINT event_documents_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: event_documents event_documents_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_documents
    ADD CONSTRAINT event_documents_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_documents event_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_documents
    ADD CONSTRAINT event_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: events events_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: events events_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE SET NULL;


--
-- Name: events events_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;


--
-- Name: feature_recommendation_votes feature_recommendation_votes_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendation_votes
    ADD CONSTRAINT feature_recommendation_votes_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.feature_recommendations(id) ON DELETE CASCADE;


--
-- Name: feature_recommendation_votes feature_recommendation_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendation_votes
    ADD CONSTRAINT feature_recommendation_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feature_recommendations feature_recommendations_duplicate_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendations
    ADD CONSTRAINT feature_recommendations_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES public.feature_recommendations(id) ON DELETE SET NULL;


--
-- Name: feature_recommendations feature_recommendations_submitted_by_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendations
    ADD CONSTRAINT feature_recommendations_submitted_by_chapter_id_fkey FOREIGN KEY (submitted_by_chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;


--
-- Name: feature_recommendations feature_recommendations_submitted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_recommendations
    ADD CONSTRAINT feature_recommendations_submitted_by_user_id_fkey FOREIGN KEY (submitted_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: fiscal_year_budget_lines fiscal_year_budget_lines_fiscal_year_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_budget_lines
    ADD CONSTRAINT fiscal_year_budget_lines_fiscal_year_budget_id_fkey FOREIGN KEY (fiscal_year_budget_id) REFERENCES public.fiscal_year_budgets(id) ON DELETE CASCADE;


--
-- Name: fiscal_year_budgets fiscal_year_budgets_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_budgets
    ADD CONSTRAINT fiscal_year_budgets_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: profiles fk_profiles_chapter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_chapter FOREIGN KEY (chapter_id) REFERENCES public.chapters(id);


--
-- Name: forum_agenda_items forum_agenda_items_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agenda_items
    ADD CONSTRAINT forum_agenda_items_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.forum_agendas(id) ON DELETE CASCADE;


--
-- Name: forum_agendas forum_agendas_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agendas
    ADD CONSTRAINT forum_agendas_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_agendas forum_agendas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agendas
    ADD CONSTRAINT forum_agendas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: forum_agendas forum_agendas_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_agendas
    ADD CONSTRAINT forum_agendas_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_calendar_events forum_calendar_events_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_calendar_events
    ADD CONSTRAINT forum_calendar_events_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_calendar_events forum_calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_calendar_events
    ADD CONSTRAINT forum_calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: forum_calendar_events forum_calendar_events_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_calendar_events
    ADD CONSTRAINT forum_calendar_events_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_calendar_events forum_calendar_events_sap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_calendar_events
    ADD CONSTRAINT forum_calendar_events_sap_id_fkey FOREIGN KEY (sap_id) REFERENCES public.saps(id) ON DELETE SET NULL;


--
-- Name: forum_constitution_ratifications forum_constitution_ratifications_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_ratifications
    ADD CONSTRAINT forum_constitution_ratifications_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_constitution_ratifications forum_constitution_ratifications_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_ratifications
    ADD CONSTRAINT forum_constitution_ratifications_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: forum_constitution_ratifications forum_constitution_ratifications_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_ratifications
    ADD CONSTRAINT forum_constitution_ratifications_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.forum_constitution_versions(id) ON DELETE CASCADE;


--
-- Name: forum_constitution_versions forum_constitution_versions_authored_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_versions
    ADD CONSTRAINT forum_constitution_versions_authored_by_fkey FOREIGN KEY (authored_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: forum_constitution_versions forum_constitution_versions_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_versions
    ADD CONSTRAINT forum_constitution_versions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_constitution_versions forum_constitution_versions_constitution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitution_versions
    ADD CONSTRAINT forum_constitution_versions_constitution_id_fkey FOREIGN KEY (constitution_id) REFERENCES public.forum_constitutions(id) ON DELETE CASCADE;


--
-- Name: forum_constitutions forum_constitutions_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_constitutions forum_constitutions_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_constitutions
    ADD CONSTRAINT forum_constitutions_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_documents forum_documents_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_documents
    ADD CONSTRAINT forum_documents_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_documents forum_documents_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_documents
    ADD CONSTRAINT forum_documents_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_documents forum_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_documents
    ADD CONSTRAINT forum_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: forum_history_members forum_history_members_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_history_members
    ADD CONSTRAINT forum_history_members_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_history_members forum_history_members_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_history_members
    ADD CONSTRAINT forum_history_members_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: forum_history_members forum_history_members_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_history_members
    ADD CONSTRAINT forum_history_members_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forum_role_assignments forum_role_assignments_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_role_assignments
    ADD CONSTRAINT forum_role_assignments_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: forum_role_assignments forum_role_assignments_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_role_assignments
    ADD CONSTRAINT forum_role_assignments_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: forum_role_assignments forum_role_assignments_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_role_assignments
    ADD CONSTRAINT forum_role_assignments_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: forums forums_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: life_events life_events_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.life_events
    ADD CONSTRAINT life_events_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: member_invites member_invites_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_invites
    ADD CONSTRAINT member_invites_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id);


--
-- Name: member_invites member_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_invites
    ADD CONSTRAINT member_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: member_private member_private_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_private
    ADD CONSTRAINT member_private_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: member_scorecards member_scorecards_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_scorecards
    ADD CONSTRAINT member_scorecards_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: member_scorecards member_scorecards_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_scorecards
    ADD CONSTRAINT member_scorecards_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE SET NULL;


--
-- Name: member_scorecards member_scorecards_member_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_scorecards
    ADD CONSTRAINT member_scorecards_member_profile_id_fkey FOREIGN KEY (member_profile_id) REFERENCES public.profiles(id);


--
-- Name: mentor_pairings mentor_pairings_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_pairings
    ADD CONSTRAINT mentor_pairings_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: mentor_pairings mentor_pairings_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_pairings
    ADD CONSTRAINT mentor_pairings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: mentor_pairings mentor_pairings_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_pairings
    ADD CONSTRAINT mentor_pairings_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE;


--
-- Name: mentors mentors_appointed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_appointed_by_fkey FOREIGN KEY (appointed_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: mentors mentors_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: mentors mentors_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: navigator_broadcast_responses navigator_broadcast_responses_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcast_responses
    ADD CONSTRAINT navigator_broadcast_responses_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.navigator_broadcasts(id) ON DELETE CASCADE;


--
-- Name: navigator_broadcast_responses navigator_broadcast_responses_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcast_responses
    ADD CONSTRAINT navigator_broadcast_responses_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: navigator_broadcast_responses navigator_broadcast_responses_navigator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcast_responses
    ADD CONSTRAINT navigator_broadcast_responses_navigator_id_fkey FOREIGN KEY (navigator_id) REFERENCES public.navigators(id) ON DELETE CASCADE;


--
-- Name: navigator_broadcasts navigator_broadcasts_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcasts
    ADD CONSTRAINT navigator_broadcasts_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: navigator_broadcasts navigator_broadcasts_sender_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_broadcasts
    ADD CONSTRAINT navigator_broadcasts_sender_member_id_fkey FOREIGN KEY (sender_member_id) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: navigator_pairings navigator_pairings_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_pairings
    ADD CONSTRAINT navigator_pairings_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: navigator_pairings navigator_pairings_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_pairings
    ADD CONSTRAINT navigator_pairings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: navigator_pairings navigator_pairings_navigator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_pairings
    ADD CONSTRAINT navigator_pairings_navigator_id_fkey FOREIGN KEY (navigator_id) REFERENCES public.navigators(id) ON DELETE CASCADE;


--
-- Name: navigator_resources navigator_resources_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_resources
    ADD CONSTRAINT navigator_resources_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: navigator_sessions navigator_sessions_pairing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigator_sessions
    ADD CONSTRAINT navigator_sessions_pairing_id_fkey FOREIGN KEY (pairing_id) REFERENCES public.navigator_pairings(id) ON DELETE CASCADE;


--
-- Name: navigators navigators_appointed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigators
    ADD CONSTRAINT navigators_appointed_by_fkey FOREIGN KEY (appointed_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: navigators navigators_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigators
    ADD CONSTRAINT navigators_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: navigators navigators_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigators
    ADD CONSTRAINT navigators_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: parking_lot_entries parking_lot_entries_author_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_lot_entries
    ADD CONSTRAINT parking_lot_entries_author_member_id_fkey FOREIGN KEY (author_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: parking_lot_entries parking_lot_entries_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_lot_entries
    ADD CONSTRAINT parking_lot_entries_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: platform_feedback platform_feedback_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_feedback
    ADD CONSTRAINT platform_feedback_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;


--
-- Name: platform_feedback platform_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_feedback
    ADD CONSTRAINT platform_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profile_checkins profile_checkins_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_checkins
    ADD CONSTRAINT profile_checkins_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: profile_checkins profile_checkins_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_checkins
    ADD CONSTRAINT profile_checkins_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: profile_checkins profile_checkins_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_checkins
    ADD CONSTRAINT profile_checkins_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reflection_feelings reflection_feelings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflection_feelings
    ADD CONSTRAINT reflection_feelings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: reflections reflections_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: reflections reflections_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: reflections reflections_template_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_template_slug_fkey FOREIGN KEY (template_slug) REFERENCES public.reflection_templates(slug);


--
-- Name: role_assignments role_assignments_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_chapter_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_chapter_role_id_fkey FOREIGN KEY (chapter_role_id) REFERENCES public.chapter_roles(id) ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: sap_contacts sap_contacts_sap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_contacts
    ADD CONSTRAINT sap_contacts_sap_id_fkey FOREIGN KEY (sap_id) REFERENCES public.saps(id) ON DELETE CASCADE;


--
-- Name: sap_forum_interest sap_forum_interest_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: sap_forum_interest sap_forum_interest_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: sap_forum_interest sap_forum_interest_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: sap_forum_interest sap_forum_interest_sap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_interest
    ADD CONSTRAINT sap_forum_interest_sap_id_fkey FOREIGN KEY (sap_id) REFERENCES public.saps(id) ON DELETE CASCADE;


--
-- Name: sap_forum_ratings sap_forum_ratings_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: sap_forum_ratings sap_forum_ratings_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: sap_forum_ratings sap_forum_ratings_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id) ON DELETE CASCADE;


--
-- Name: sap_forum_ratings sap_forum_ratings_sap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_forum_ratings
    ADD CONSTRAINT sap_forum_ratings_sap_id_fkey FOREIGN KEY (sap_id) REFERENCES public.saps(id) ON DELETE CASCADE;


--
-- Name: saps saps_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saps
    ADD CONSTRAINT saps_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: scenarios scenarios_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: slps slps_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slps
    ADD CONSTRAINT slps_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: slps slps_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slps
    ADD CONSTRAINT slps_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: speaker_pipeline speaker_pipeline_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_pipeline
    ADD CONSTRAINT speaker_pipeline_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: speaker_pipeline speaker_pipeline_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_pipeline
    ADD CONSTRAINT speaker_pipeline_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE;


--
-- Name: speakers speakers_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: speakers speakers_imported_from_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_imported_from_speaker_id_fkey FOREIGN KEY (imported_from_speaker_id) REFERENCES public.speakers(id) ON DELETE SET NULL;


--
-- Name: survey_responses survey_responses_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: survey_responses survey_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT survey_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: vendor_reviews vendor_reviews_chapter_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_reviews
    ADD CONSTRAINT vendor_reviews_chapter_member_id_fkey FOREIGN KEY (chapter_member_id) REFERENCES public.chapter_members(id) ON DELETE CASCADE;


--
-- Name: vendor_reviews vendor_reviews_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_reviews
    ADD CONSTRAINT vendor_reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: vendors vendors_sap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_sap_id_fkey FOREIGN KEY (sap_id) REFERENCES public.saps(id) ON DELETE SET NULL;


--
-- Name: venues venues_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: chapter_members Admin can delete chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete chapter_members" ON public.chapter_members FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: chapter_roles Admin can delete chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete chapter_roles" ON public.chapter_roles FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: navigator_broadcast_responses Admin can delete response; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete response" ON public.navigator_broadcast_responses FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: role_assignments Admin can delete role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete role_assignments" ON public.role_assignments FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: sap_contacts Admin can delete sap_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete sap_contacts" ON public.sap_contacts FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: vendors Admin can delete vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete vendors" ON public.vendors FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: chapter_members Admin can insert chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert chapter_members" ON public.chapter_members FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: chapter_roles Admin can insert chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert chapter_roles" ON public.chapter_roles FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: role_assignments Admin can insert role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert role_assignments" ON public.role_assignments FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: sap_contacts Admin can insert sap_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert sap_contacts" ON public.sap_contacts FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_members Admin can update chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update chapter_members" ON public.chapter_members FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: chapter_roles Admin can update chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update chapter_roles" ON public.chapter_roles FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: role_assignments Admin can update role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update role_assignments" ON public.role_assignments FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: sap_contacts Admin can update sap_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update sap_contacts" ON public.sap_contacts FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_members Admins can delete chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete chapter_members" ON public.chapter_members FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_roles Admins can delete chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete chapter_roles" ON public.chapter_roles FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: compass_items Admins can delete compass_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete compass_items" ON public.compass_items FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: event_documents Admins can delete event_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete event_documents" ON public.event_documents FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: forum_agenda_items Admins can delete forum_agenda_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_agenda_items" ON public.forum_agenda_items FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_agendas Admins can delete forum_agendas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_agendas" ON public.forum_agendas FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_calendar_events Admins can delete forum_calendar_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_calendar_events" ON public.forum_calendar_events FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitution_ratifications Admins can delete forum_constitution_ratifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_constitution_ratifications" ON public.forum_constitution_ratifications FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitution_versions Admins can delete forum_constitution_versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_constitution_versions" ON public.forum_constitution_versions FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitutions Admins can delete forum_constitutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_constitutions" ON public.forum_constitutions FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_documents Admins can delete forum_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_documents" ON public.forum_documents FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_history_members Admins can delete forum_history_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_history_members" ON public.forum_history_members FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_role_assignments Admins can delete forum_role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forum_role_assignments" ON public.forum_role_assignments FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: member_invites Admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invites" ON public.member_invites FOR DELETE USING (public.is_admin());


--
-- Name: mentor_pairings Admins can delete mentor_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete mentor_pairings" ON public.mentor_pairings FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: mentors Admins can delete mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete mentors" ON public.mentors FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_broadcasts Admins can delete navigator_broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete navigator_broadcasts" ON public.navigator_broadcasts FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_pairings Admins can delete navigator_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete navigator_pairings" ON public.navigator_pairings FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_resources Admins can delete navigator_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete navigator_resources" ON public.navigator_resources FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_sessions Admins can delete navigator_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete navigator_sessions" ON public.navigator_sessions FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigators Admins can delete navigators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete navigators" ON public.navigators FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: profile_checkins Admins can delete profile_checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profile_checkins" ON public.profile_checkins FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: role_assignments Admins can delete role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete role_assignments" ON public.role_assignments FOR DELETE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_members Admins can insert chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert chapter_members" ON public.chapter_members FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_roles Admins can insert chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert chapter_roles" ON public.chapter_roles FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: compass_items Admins can insert compass_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert compass_items" ON public.compass_items FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: event_documents Admins can insert event_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert event_documents" ON public.event_documents FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: forum_agenda_items Admins can insert forum_agenda_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert forum_agenda_items" ON public.forum_agenda_items FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_agendas Admins can insert forum_agendas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert forum_agendas" ON public.forum_agendas FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitution_versions Admins can insert forum_constitution_versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert forum_constitution_versions" ON public.forum_constitution_versions FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitutions Admins can insert forum_constitutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert forum_constitutions" ON public.forum_constitutions FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: member_invites Admins can insert invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert invites" ON public.member_invites FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: mentor_pairings Admins can insert mentor_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert mentor_pairings" ON public.mentor_pairings FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: mentors Admins can insert mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert mentors" ON public.mentors FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_broadcasts Admins can insert navigator_broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert navigator_broadcasts" ON public.navigator_broadcasts FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_pairings Admins can insert navigator_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert navigator_pairings" ON public.navigator_pairings FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_resources Admins can insert navigator_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert navigator_resources" ON public.navigator_resources FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_sessions Admins can insert navigator_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert navigator_sessions" ON public.navigator_sessions FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigators Admins can insert navigators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert navigators" ON public.navigators FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: notifications Admins can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: role_assignments Admins can insert role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert role_assignments" ON public.role_assignments FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_calendar_events Admins can manage forum_calendar_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage forum_calendar_events" ON public.forum_calendar_events FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_documents Admins can manage forum_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage forum_documents" ON public.forum_documents FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_history_members Admins can manage forum_history_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage forum_history_members" ON public.forum_history_members FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_role_assignments Admins can manage forum_role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage forum_role_assignments" ON public.forum_role_assignments FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin()));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- Name: chapter_members Admins can update chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update chapter_members" ON public.chapter_members FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_roles Admins can update chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update chapter_roles" ON public.chapter_roles FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: compass_items Admins can update compass_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update compass_items" ON public.compass_items FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: event_documents Admins can update event_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update event_documents" ON public.event_documents FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: forum_agenda_items Admins can update forum_agenda_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_agenda_items" ON public.forum_agenda_items FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_agendas Admins can update forum_agendas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_agendas" ON public.forum_agendas FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_calendar_events Admins can update forum_calendar_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_calendar_events" ON public.forum_calendar_events FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitution_versions Admins can update forum_constitution_versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_constitution_versions" ON public.forum_constitution_versions FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_constitutions Admins can update forum_constitutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_constitutions" ON public.forum_constitutions FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_documents Admins can update forum_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_documents" ON public.forum_documents FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_history_members Admins can update forum_history_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_history_members" ON public.forum_history_members FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: forum_role_assignments Admins can update forum_role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update forum_role_assignments" ON public.forum_role_assignments FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: mentor_pairings Admins can update mentor_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update mentor_pairings" ON public.mentor_pairings FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: mentors Admins can update mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update mentors" ON public.mentors FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_broadcasts Admins can update navigator_broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update navigator_broadcasts" ON public.navigator_broadcasts FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_pairings Admins can update navigator_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update navigator_pairings" ON public.navigator_pairings FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_resources Admins can update navigator_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update navigator_resources" ON public.navigator_resources FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigator_sessions Admins can update navigator_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update navigator_sessions" ON public.navigator_sessions FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: navigators Admins can update navigators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update navigators" ON public.navigators FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: profile_checkins Admins can update profile_checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update profile_checkins" ON public.profile_checkins FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: role_assignments Admins can update role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update role_assignments" ON public.role_assignments FOR UPDATE USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: member_invites Admins can view all invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all invites" ON public.member_invites FOR SELECT USING (public.is_admin());


--
-- Name: notifications Admins can view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.is_admin());


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


--
-- Name: sap_forum_ratings Admins can view all sap_forum_ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sap_forum_ratings" ON public.sap_forum_ratings FOR SELECT USING ((public.is_super_admin() OR public.is_admin()));


--
-- Name: profile_checkins Admins or self can view profile_checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins or self can view profile_checkins" ON public.profile_checkins FOR SELECT USING ((public.is_super_admin() OR public.is_admin() OR (member_id = public.current_chapter_member_id())));


--
-- Name: survey_responses Admins read own chapter surveys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read own chapter surveys" ON public.survey_responses FOR SELECT USING ((public.is_super_admin() OR (public.is_admin() AND (chapter_id = public.user_chapter_id()))));


--
-- Name: forum_constitution_ratifications Anon can insert forum_constitution_ratifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can insert forum_constitution_ratifications" ON public.forum_constitution_ratifications FOR INSERT WITH CHECK (true);


--
-- Name: reflection_feelings Anyone can view feelings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view feelings" ON public.reflection_feelings FOR SELECT USING (true);


--
-- Name: reflection_templates Anyone can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view templates" ON public.reflection_templates FOR SELECT USING (true);


--
-- Name: reflection_feelings Authenticated can add feelings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can add feelings" ON public.reflection_feelings FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: fiscal_year_budget_lines Authenticated can delete fiscal_year_budget_lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can delete fiscal_year_budget_lines" ON public.fiscal_year_budget_lines FOR DELETE TO authenticated USING (true);


--
-- Name: fiscal_year_budgets Authenticated can delete fiscal_year_budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can delete fiscal_year_budgets" ON public.fiscal_year_budgets FOR DELETE TO authenticated USING (true);


--
-- Name: speaker_pipeline Authenticated can delete speaker_pipeline; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can delete speaker_pipeline" ON public.speaker_pipeline FOR DELETE TO authenticated USING (true);


--
-- Name: fiscal_year_budget_lines Authenticated can insert fiscal_year_budget_lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert fiscal_year_budget_lines" ON public.fiscal_year_budget_lines FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: fiscal_year_budgets Authenticated can insert fiscal_year_budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert fiscal_year_budgets" ON public.fiscal_year_budgets FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: speaker_pipeline Authenticated can insert speaker_pipeline; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert speaker_pipeline" ON public.speaker_pipeline FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: fiscal_year_budget_lines Authenticated can update fiscal_year_budget_lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can update fiscal_year_budget_lines" ON public.fiscal_year_budget_lines FOR UPDATE TO authenticated USING (true);


--
-- Name: fiscal_year_budgets Authenticated can update fiscal_year_budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can update fiscal_year_budgets" ON public.fiscal_year_budgets FOR UPDATE TO authenticated USING (true);


--
-- Name: speaker_pipeline Authenticated can update speaker_pipeline; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can update speaker_pipeline" ON public.speaker_pipeline FOR UPDATE TO authenticated USING (true);


--
-- Name: vendor_reviews Authenticated can view vendor_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view vendor_reviews" ON public.vendor_reviews FOR SELECT USING (true);


--
-- Name: vendors Authenticated can view vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view vendors" ON public.vendors FOR SELECT USING (true);


--
-- Name: platform_feedback Authenticated users can submit feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can submit feedback" ON public.platform_feedback FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: life_events Author can delete own life events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can delete own life events" ON public.life_events FOR DELETE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: life_events Author can insert own life events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can insert own life events" ON public.life_events FOR INSERT WITH CHECK ((member_id = public.current_chapter_member_id()));


--
-- Name: life_events Author can update own life events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can update own life events" ON public.life_events FOR UPDATE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: life_events Author can view own life events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can view own life events" ON public.life_events FOR SELECT USING ((member_id = public.current_chapter_member_id()));


--
-- Name: parking_lot_entries Author delete parking lot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author delete parking lot" ON public.parking_lot_entries FOR DELETE USING ((author_member_id = public.current_chapter_member_id()));


--
-- Name: reflections Author delete reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author delete reflections" ON public.reflections FOR DELETE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: parking_lot_entries Author insert parking lot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author insert parking lot" ON public.parking_lot_entries FOR INSERT WITH CHECK (((author_member_id = public.current_chapter_member_id()) AND (forum = public.current_member_forum())));


--
-- Name: reflections Author insert reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author insert reflections" ON public.reflections FOR INSERT WITH CHECK ((member_id = public.current_chapter_member_id()));


--
-- Name: parking_lot_entries Author or admin can delete parking lot entry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author or admin can delete parking lot entry" ON public.parking_lot_entries FOR DELETE USING (((author_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: parking_lot_entries Author or admin can insert parking lot entry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author or admin can insert parking lot entry" ON public.parking_lot_entries FOR INSERT WITH CHECK ((((author_member_id = public.current_chapter_member_id()) AND (forum = public.current_member_forum())) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: parking_lot_entries Author or admin can update parking lot entry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author or admin can update parking lot entry" ON public.parking_lot_entries FOR UPDATE USING (((author_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: parking_lot_entries Author update parking lot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author update parking lot" ON public.parking_lot_entries FOR UPDATE USING ((author_member_id = public.current_chapter_member_id()));


--
-- Name: reflections Author update reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author update reflections" ON public.reflections FOR UPDATE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: reflections Author view reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author view reflections" ON public.reflections FOR SELECT USING ((member_id = public.current_chapter_member_id()));


--
-- Name: chair_reports Board can delete chair_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can delete chair_reports" ON public.chair_reports FOR DELETE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chapter_communications Board can delete chapter_communications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can delete chapter_communications" ON public.chapter_communications FOR DELETE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: forums Board can delete forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can delete forums" ON public.forums FOR DELETE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: member_scorecards Board can delete member_scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can delete member_scorecards" ON public.member_scorecards FOR DELETE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chair_reports Board can insert chair_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can insert chair_reports" ON public.chair_reports FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chapter_communications Board can insert chapter_communications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can insert chapter_communications" ON public.chapter_communications FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: forums Board can insert forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can insert forums" ON public.forums FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: member_scorecards Board can insert member_scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can insert member_scorecards" ON public.member_scorecards FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chair_reports Board can update chair_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can update chair_reports" ON public.chair_reports FOR UPDATE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chapter_communications Board can update chapter_communications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can update chapter_communications" ON public.chapter_communications FOR UPDATE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: forums Board can update forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can update forums" ON public.forums FOR UPDATE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: member_scorecards Board can update member_scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board can update member_scorecards" ON public.member_scorecards FOR UPDATE USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: budget_items Chapter scoped delete budget_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete budget_items" ON public.budget_items FOR DELETE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = budget_items.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: contract_checklists Chapter scoped delete contract_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete contract_checklists" ON public.contract_checklists FOR DELETE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = contract_checklists.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: events Chapter scoped delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete events" ON public.events FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: saps Chapter scoped delete saps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete saps" ON public.saps FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: scenarios Chapter scoped delete scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete scenarios" ON public.scenarios FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: speakers Chapter scoped delete speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete speakers" ON public.speakers FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: venues Chapter scoped delete venues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped delete venues" ON public.venues FOR DELETE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: budget_items Chapter scoped insert budget_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert budget_items" ON public.budget_items FOR INSERT WITH CHECK ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = budget_items.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: contract_checklists Chapter scoped insert contract_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert contract_checklists" ON public.contract_checklists FOR INSERT WITH CHECK ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = contract_checklists.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: events Chapter scoped insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert events" ON public.events FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: saps Chapter scoped insert saps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert saps" ON public.saps FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: scenarios Chapter scoped insert scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert scenarios" ON public.scenarios FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: speakers Chapter scoped insert speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert speakers" ON public.speakers FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: venues Chapter scoped insert venues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped insert venues" ON public.venues FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: budget_items Chapter scoped select budget_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select budget_items" ON public.budget_items FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = budget_items.event_id) AND (public.is_chapter_admin(events.chapter_id) OR (events.chapter_id = public.user_chapter_id())))))));


--
-- Name: chair_reports Chapter scoped select chair_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select chair_reports" ON public.chair_reports FOR SELECT USING ((public.is_super_admin() OR public.is_board_member(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: chapter_communications Chapter scoped select chapter_communications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select chapter_communications" ON public.chapter_communications FOR SELECT USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: chapter_members Chapter scoped select chapter_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select chapter_members" ON public.chapter_members FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: chapter_roles Chapter scoped select chapter_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select chapter_roles" ON public.chapter_roles FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: compass_items Chapter scoped select compass_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select compass_items" ON public.compass_items FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: contract_checklists Chapter scoped select contract_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select contract_checklists" ON public.contract_checklists FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = contract_checklists.event_id) AND (public.is_chapter_admin(events.chapter_id) OR (events.chapter_id = public.user_chapter_id())))))));


--
-- Name: event_documents Chapter scoped select event_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select event_documents" ON public.event_documents FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: events Chapter scoped select events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select events" ON public.events FOR SELECT USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: fiscal_year_budget_lines Chapter scoped select fiscal_year_budget_lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select fiscal_year_budget_lines" ON public.fiscal_year_budget_lines FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.fiscal_year_budgets fyb
  WHERE ((fyb.id = fiscal_year_budget_lines.fiscal_year_budget_id) AND (fyb.chapter_id = public.user_chapter_id()))))));


--
-- Name: fiscal_year_budgets Chapter scoped select fiscal_year_budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select fiscal_year_budgets" ON public.fiscal_year_budgets FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_agenda_items Chapter scoped select forum_agenda_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_agenda_items" ON public.forum_agenda_items FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.forum_agendas fa
  WHERE ((fa.id = forum_agenda_items.agenda_id) AND (fa.chapter_id = public.user_chapter_id()))))));


--
-- Name: forum_agendas Chapter scoped select forum_agendas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_agendas" ON public.forum_agendas FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_calendar_events Chapter scoped select forum_calendar_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_calendar_events" ON public.forum_calendar_events FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_constitution_ratifications Chapter scoped select forum_constitution_ratifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_constitution_ratifications" ON public.forum_constitution_ratifications FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_constitution_versions Chapter scoped select forum_constitution_versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_constitution_versions" ON public.forum_constitution_versions FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_constitutions Chapter scoped select forum_constitutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_constitutions" ON public.forum_constitutions FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_documents Chapter scoped select forum_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_documents" ON public.forum_documents FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_history_members Chapter scoped select forum_history_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_history_members" ON public.forum_history_members FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forum_role_assignments Chapter scoped select forum_role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forum_role_assignments" ON public.forum_role_assignments FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: forums Chapter scoped select forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select forums" ON public.forums FOR SELECT USING ((public.is_super_admin() OR public.is_board_member(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: member_scorecards Chapter scoped select member_scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select member_scorecards" ON public.member_scorecards FOR SELECT USING ((public.is_super_admin() OR public.is_board_member(chapter_id)));


--
-- Name: mentor_pairings Chapter scoped select mentor_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select mentor_pairings" ON public.mentor_pairings FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: mentors Chapter scoped select mentors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select mentors" ON public.mentors FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: navigator_broadcast_responses Chapter scoped select navigator_broadcast_responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigator_broadcast_responses" ON public.navigator_broadcast_responses FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.navigator_broadcasts nb
  WHERE ((nb.id = navigator_broadcast_responses.broadcast_id) AND (nb.chapter_id = public.user_chapter_id()))))));


--
-- Name: navigator_broadcasts Chapter scoped select navigator_broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigator_broadcasts" ON public.navigator_broadcasts FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: navigator_pairings Chapter scoped select navigator_pairings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigator_pairings" ON public.navigator_pairings FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: navigator_resources Chapter scoped select navigator_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigator_resources" ON public.navigator_resources FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: navigator_sessions Chapter scoped select navigator_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigator_sessions" ON public.navigator_sessions FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.navigator_pairings np
  WHERE ((np.id = navigator_sessions.pairing_id) AND (np.chapter_id = public.user_chapter_id()))))));


--
-- Name: navigators Chapter scoped select navigators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select navigators" ON public.navigators FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: role_assignments Chapter scoped select role_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select role_assignments" ON public.role_assignments FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: sap_contacts Chapter scoped select sap_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select sap_contacts" ON public.sap_contacts FOR SELECT USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.saps s
  WHERE ((s.id = sap_contacts.sap_id) AND (s.chapter_id = public.user_chapter_id()))))));


--
-- Name: sap_forum_interest Chapter scoped select sap_forum_interest; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select sap_forum_interest" ON public.sap_forum_interest FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: saps Chapter scoped select saps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select saps" ON public.saps FOR SELECT USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: scenarios Chapter scoped select scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select scenarios" ON public.scenarios FOR SELECT USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: speaker_pipeline Chapter scoped select speaker_pipeline; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select speaker_pipeline" ON public.speaker_pipeline FOR SELECT USING ((public.is_super_admin() OR (chapter_id = public.user_chapter_id())));


--
-- Name: venues Chapter scoped select venues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped select venues" ON public.venues FOR SELECT USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR (public.user_chapter_id() = chapter_id)));


--
-- Name: budget_items Chapter scoped update budget_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update budget_items" ON public.budget_items FOR UPDATE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = budget_items.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: contract_checklists Chapter scoped update contract_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update contract_checklists" ON public.contract_checklists FOR UPDATE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = contract_checklists.event_id) AND public.is_chapter_admin(events.chapter_id))))));


--
-- Name: events Chapter scoped update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update events" ON public.events FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: saps Chapter scoped update saps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update saps" ON public.saps FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: scenarios Chapter scoped update scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update scenarios" ON public.scenarios FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: speakers Chapter scoped update speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update speakers" ON public.speakers FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: venues Chapter scoped update venues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chapter scoped update venues" ON public.venues FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id)));


--
-- Name: parking_lot_entries Forum view parking lot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Forum view parking lot" ON public.parking_lot_entries FOR SELECT USING (((chapter_id = public.user_chapter_id()) AND (forum = public.current_member_forum())));


--
-- Name: slps Member or admin can delete SLP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Member or admin can delete SLP" ON public.slps FOR DELETE USING (((member_id = public.current_chapter_member_id()) OR public.is_slp_admin(chapter_id)));


--
-- Name: slps Member or admin can insert SLP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Member or admin can insert SLP" ON public.slps FOR INSERT WITH CHECK (((member_id = public.current_chapter_member_id()) OR public.is_slp_admin(chapter_id)));


--
-- Name: slps Member or admin can read SLP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Member or admin can read SLP" ON public.slps FOR SELECT USING (((member_id = public.current_chapter_member_id()) OR public.is_slp_admin(chapter_id)));


--
-- Name: slps Member or admin can update SLP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Member or admin can update SLP" ON public.slps FOR UPDATE USING (((member_id = public.current_chapter_member_id()) OR public.is_slp_admin(chapter_id))) WITH CHECK (((member_id = public.current_chapter_member_id()) OR public.is_slp_admin(chapter_id)));


--
-- Name: vendor_reviews Members can insert vendor_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert vendor_reviews" ON public.vendor_reviews FOR INSERT WITH CHECK ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_reviews.vendor_id) AND (public.user_chapter_id() = v.chapter_id))))));


--
-- Name: vendors Members can insert vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert vendors" ON public.vendors FOR INSERT WITH CHECK ((public.is_super_admin() OR (public.user_chapter_id() = chapter_id)));


--
-- Name: sap_forum_interest Members can manage own sap_forum_interest; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can manage own sap_forum_interest" ON public.sap_forum_interest FOR INSERT WITH CHECK (((chapter_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: sap_forum_ratings Members can manage own sap_forum_ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can manage own sap_forum_ratings" ON public.sap_forum_ratings FOR INSERT WITH CHECK (((chapter_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: chapter_members Members can update own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update own row" ON public.chapter_members FOR UPDATE USING ((public.current_chapter_member_id() = id)) WITH CHECK ((public.current_chapter_member_id() = id));


--
-- Name: sap_forum_interest Members can update own sap_forum_interest; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update own sap_forum_interest" ON public.sap_forum_interest FOR UPDATE USING (((chapter_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: sap_forum_ratings Members can update own sap_forum_ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update own sap_forum_ratings" ON public.sap_forum_ratings FOR UPDATE USING (((chapter_member_id = public.current_chapter_member_id()) OR public.is_super_admin() OR public.is_admin()));


--
-- Name: sap_forum_ratings Members can view own sap_forum_ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view own sap_forum_ratings" ON public.sap_forum_ratings FOR SELECT USING ((chapter_member_id = public.current_chapter_member_id()));


--
-- Name: navigator_broadcast_responses Navigator or admin can insert response; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Navigator or admin can insert response" ON public.navigator_broadcast_responses FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin() OR (chapter_member_id = public.current_chapter_member_id())));


--
-- Name: navigator_broadcast_responses Navigator or admin can update own response; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Navigator or admin can update own response" ON public.navigator_broadcast_responses FOR UPDATE USING ((public.is_super_admin() OR public.is_admin() OR (chapter_member_id = public.current_chapter_member_id())));


--
-- Name: member_private Owner can delete own private fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can delete own private fields" ON public.member_private FOR DELETE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: member_private Owner can insert own private fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can insert own private fields" ON public.member_private FOR INSERT WITH CHECK ((member_id = public.current_chapter_member_id()));


--
-- Name: member_private Owner can update own private fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can update own private fields" ON public.member_private FOR UPDATE USING ((member_id = public.current_chapter_member_id()));


--
-- Name: member_private Owner can view own private fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can view own private fields" ON public.member_private FOR SELECT USING ((member_id = public.current_chapter_member_id()));


--
-- Name: vendor_reviews Owner or admin can delete vendor_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner or admin can delete vendor_reviews" ON public.vendor_reviews FOR DELETE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_reviews.vendor_id) AND (public.is_chapter_admin(v.chapter_id) OR ((public.user_chapter_id() = v.chapter_id) AND (vendor_reviews.chapter_member_id = ( SELECT cm.id
           FROM public.chapter_members cm
          WHERE ((cm.chapter_id = v.chapter_id) AND (cm.email = (( SELECT users.email
                   FROM auth.users
                  WHERE (users.id = auth.uid())))::text))
         LIMIT 1)))))))));


--
-- Name: vendor_reviews Owner or admin can update vendor_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner or admin can update vendor_reviews" ON public.vendor_reviews FOR UPDATE USING ((public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = vendor_reviews.vendor_id) AND (public.is_chapter_admin(v.chapter_id) OR ((public.user_chapter_id() = v.chapter_id) AND (vendor_reviews.chapter_member_id = ( SELECT cm.id
           FROM public.chapter_members cm
          WHERE ((cm.chapter_id = v.chapter_id) AND (cm.email = (( SELECT users.email
                   FROM auth.users
                  WHERE (users.id = auth.uid())))::text))
         LIMIT 1)))))))));


--
-- Name: vendors Owner or admin can update vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner or admin can update vendors" ON public.vendors FOR UPDATE USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR ((public.user_chapter_id() = chapter_id) AND (created_by = auth.uid()))));


--
-- Name: profile_checkins Self or admin can insert profile_checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Self or admin can insert profile_checkins" ON public.profile_checkins FOR INSERT WITH CHECK ((public.is_super_admin() OR public.is_admin() OR (member_id = public.current_chapter_member_id())));


--
-- Name: speakers Speakers visible by chapter or global share; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers visible by chapter or global share" ON public.speakers FOR SELECT USING ((public.is_super_admin() OR public.is_chapter_admin(chapter_id) OR (share_scope = 'global'::text)));


--
-- Name: chapters Super admin can delete chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can delete chapters" ON public.chapters FOR DELETE USING (public.is_super_admin());


--
-- Name: chapters Super admin can insert chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can insert chapters" ON public.chapters FOR INSERT WITH CHECK (public.is_super_admin());


--
-- Name: chapters Super admin can update chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can update chapters" ON public.chapters FOR UPDATE USING (public.is_super_admin());


--
-- Name: platform_feedback Super admins read all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins read all feedback" ON public.platform_feedback FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: platform_feedback Super admins update feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins update feedback" ON public.platform_feedback FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: survey_responses Users can manage own survey; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own survey" ON public.survey_responses USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = recipient_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: chapters Users can view own chapter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own chapter" ON public.chapters FOR SELECT USING ((public.is_super_admin() OR (id = public.user_chapter_id())));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = recipient_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: beta_terms_versions anyone reads terms versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone reads terms versions" ON public.beta_terms_versions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: feature_recommendation_votes auth reads recommendation votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth reads recommendation votes" ON public.feature_recommendation_votes FOR SELECT TO authenticated USING (true);


--
-- Name: feature_recommendations auth reads recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth reads recommendations" ON public.feature_recommendations FOR SELECT TO authenticated USING (true);


--
-- Name: beta_terms_acknowledgments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beta_terms_acknowledgments ENABLE ROW LEVEL SECURITY;

--
-- Name: beta_terms_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beta_terms_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

--
-- Name: chair_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chair_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_communications ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: compass_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compass_items ENABLE ROW LEVEL SECURITY;

--
-- Name: contract_checklists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contract_checklists ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_recommendations delete own or super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "delete own or super admin" ON public.feature_recommendations FOR DELETE TO authenticated USING ((public.is_super_admin() OR (submitted_by_user_id = auth.uid())));


--
-- Name: feature_recommendation_votes delete own vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "delete own vote" ON public.feature_recommendation_votes FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: event_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_recommendation_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_recommendation_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: fiscal_year_budget_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fiscal_year_budget_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: fiscal_year_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fiscal_year_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_agenda_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_agenda_items ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_agendas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_agendas ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_constitution_ratifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_constitution_ratifications ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_constitution_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_constitution_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_constitutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_constitutions ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_history_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_history_members ENABLE ROW LEVEL SECURITY;

--
-- Name: forum_role_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forum_role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: forums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_recommendations lc submits recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lc submits recommendations" ON public.feature_recommendations FOR INSERT TO authenticated WITH CHECK ((public.can_submit_lc_recommendations() AND (submitted_by_user_id = auth.uid())));


--
-- Name: feature_recommendation_votes lc votes recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lc votes recommendations" ON public.feature_recommendation_votes FOR INSERT TO authenticated WITH CHECK ((public.can_submit_lc_recommendations() AND (user_id = auth.uid())));


--
-- Name: life_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;

--
-- Name: member_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: member_private; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_private ENABLE ROW LEVEL SECURITY;

--
-- Name: member_scorecards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_scorecards ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_pairings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_pairings ENABLE ROW LEVEL SECURITY;

--
-- Name: mentors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

--
-- Name: navigator_broadcast_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigator_broadcast_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: navigator_broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigator_broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: navigator_pairings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigator_pairings ENABLE ROW LEVEL SECURITY;

--
-- Name: navigator_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigator_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: navigator_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigator_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: navigators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigators ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: parking_lot_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parking_lot_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reflection_feelings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reflection_feelings ENABLE ROW LEVEL SECURITY;

--
-- Name: reflection_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reflection_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: reflections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

--
-- Name: role_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: sap_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sap_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: sap_forum_interest; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sap_forum_interest ENABLE ROW LEVEL SECURITY;

--
-- Name: sap_forum_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sap_forum_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: saps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saps ENABLE ROW LEVEL SECURITY;

--
-- Name: scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: slps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.slps ENABLE ROW LEVEL SECURITY;

--
-- Name: speaker_pipeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speaker_pipeline ENABLE ROW LEVEL SECURITY;

--
-- Name: speakers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

--
-- Name: beta_terms_versions super admin manages terms versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "super admin manages terms versions" ON public.beta_terms_versions TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: feature_recommendations super admin updates recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "super admin updates recommendations" ON public.feature_recommendations FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: survey_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: beta_terms_acknowledgments users insert own acks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users insert own acks" ON public.beta_terms_acknowledgments FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: beta_terms_acknowledgments users read own acks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own acks" ON public.beta_terms_acknowledgments FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_super_admin()));


--
-- Name: vendor_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: venues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- ============================================================
-- auth.users triggers (live outside public schema, must be captured manually)
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS sync_profile_last_sign_in_trigger ON auth.users;
CREATE TRIGGER sync_profile_last_sign_in_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_last_sign_in();
