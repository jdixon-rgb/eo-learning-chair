-- ============================================================
-- 072 Public Speaker Library
-- ============================================================
-- A cross-chapter, public catalog of speakers seeded from the EO
-- Global Speakers Academy and grown by Learning Chairs over time.
-- Conceptually a TripAdvisor-for-EO-speakers: any LC can browse,
-- review, contribute, and import to their own pipeline.
--
-- Three new tables + one new column:
--
--   public_speakers          – the shared catalog (no chapter_id)
--   public_speaker_reviews   – 1–5 star + body, attributed to a chapter,
--                              one per LC per speaker
--   public_speaker_revisions – audit log of edits (who/what/when),
--                              populated by trigger
--   speakers.imported_from_library_id – lineage on chapter pipeline rows
--
-- The chapter `speakers` table stays exactly as it was. Importing a
-- library speaker into a chapter pipeline COPIES the data into a new
-- speakers row with imported_from_library_id set. The library row and
-- the chapter row then evolve independently — chapters can edit fees,
-- pipeline stage, contact info without touching the public catalog.
--
-- RLS policies:
--   public_speakers: any authenticated user can SELECT; INSERT/UPDATE
--     restricted to learning chair-style roles via the
--     can_edit_speaker_library() helper; DELETE super_admin only.
--   public_speaker_reviews: any authenticated user can SELECT; users
--     can INSERT/UPDATE/DELETE their own review only.
--   public_speaker_revisions: any authenticated user can SELECT;
--     INSERTs happen via trigger only; no manual writes.

-- ── 1. public_speakers ─────────────────────────────────────────────
create table if not exists public.public_speakers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  topic           text default '',
  eo_chapter      text default '',          -- speaker's home EO chapter, e.g. "EO Las Vegas"
  class_year      text default '',          -- e.g. "Fall 2022" — for GSA cohorts
  source          text default '',          -- e.g. "EO Global Speakers Academy"
  source_url      text default '',
  bio             text default '',
  photo_url       text default '',
  honorarium_amount numeric(10,2),          -- speaking fee
  honorarium_notes  text default '',        -- e.g. "varies by event format", "negotiable"
  travel_amount   numeric(10,2),            -- expected travel cost
  travel_notes    text default '',          -- e.g. "based in Las Vegas, bills actuals"
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists public_speakers_name_idx       on public.public_speakers (lower(name));
create index if not exists public_speakers_topic_idx      on public.public_speakers (lower(topic));
create index if not exists public_speakers_eo_chapter_idx on public.public_speakers (lower(eo_chapter));
create index if not exists public_speakers_source_idx     on public.public_speakers (source);

-- Idempotent unique to support seeding (lower-cased name within a source).
-- Lets the seed migration use ON CONFLICT to skip already-loaded GSA rows.
create unique index if not exists public_speakers_source_name_unique
  on public.public_speakers (source, lower(name));

-- ── 2. public_speaker_reviews ──────────────────────────────────────
create table if not exists public.public_speaker_reviews (
  id                  uuid primary key default gen_random_uuid(),
  public_speaker_id   uuid not null references public.public_speakers(id) on delete cascade,
  reviewer_user_id    uuid not null references auth.users(id) on delete cascade,
  reviewer_chapter_id uuid references public.chapters(id) on delete set null,
  rating              smallint not null check (rating between 1 and 5),
  body                text default '',
  event_format        text default '',  -- aligns with constants EVENT_FORMATS ids (keynote, workshop_2hr, etc.)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (public_speaker_id, reviewer_user_id)
);

create index if not exists public_speaker_reviews_speaker_idx
  on public.public_speaker_reviews (public_speaker_id);
create index if not exists public_speaker_reviews_reviewer_idx
  on public.public_speaker_reviews (reviewer_user_id);

-- Auto-stamp reviewer_chapter_id from the reviewer's profile if not provided.
create or replace function public._stamp_review_chapter()
returns trigger as $$
begin
  if new.reviewer_chapter_id is null then
    select chapter_id into new.reviewer_chapter_id
      from public.profiles
      where id = new.reviewer_user_id
      limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_stamp_review_chapter on public.public_speaker_reviews;
create trigger trg_stamp_review_chapter
  before insert on public.public_speaker_reviews
  for each row execute function public._stamp_review_chapter();

-- ── 3. public_speaker_revisions (audit log) ────────────────────────
create table if not exists public.public_speaker_revisions (
  id                uuid primary key default gen_random_uuid(),
  public_speaker_id uuid not null references public.public_speakers(id) on delete cascade,
  editor_user_id    uuid references auth.users(id) on delete set null,
  editor_chapter_id uuid references public.chapters(id) on delete set null,
  changed_at        timestamptz not null default now(),
  -- jsonb diff: { "field_name": { "old": <value>, "new": <value> }, ... }
  changes           jsonb not null default '{}'::jsonb
);

create index if not exists public_speaker_revisions_speaker_idx
  on public.public_speaker_revisions (public_speaker_id, changed_at desc);

-- Trigger: on UPDATE, compute a column-by-column diff and write a
-- revision row. INSERTs are not logged here — created_by + created_at
-- on public_speakers itself capture the original authorship.
create or replace function public._log_public_speaker_revision()
returns trigger as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_chapter_id uuid;
begin
  -- Compare each editable column. If unchanged, skip.
  if (new.name is distinct from old.name) then
    v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', old.name, 'new', new.name));
  end if;
  if (new.topic is distinct from old.topic) then
    v_changes := v_changes || jsonb_build_object('topic', jsonb_build_object('old', old.topic, 'new', new.topic));
  end if;
  if (new.eo_chapter is distinct from old.eo_chapter) then
    v_changes := v_changes || jsonb_build_object('eo_chapter', jsonb_build_object('old', old.eo_chapter, 'new', new.eo_chapter));
  end if;
  if (new.class_year is distinct from old.class_year) then
    v_changes := v_changes || jsonb_build_object('class_year', jsonb_build_object('old', old.class_year, 'new', new.class_year));
  end if;
  if (new.source is distinct from old.source) then
    v_changes := v_changes || jsonb_build_object('source', jsonb_build_object('old', old.source, 'new', new.source));
  end if;
  if (new.source_url is distinct from old.source_url) then
    v_changes := v_changes || jsonb_build_object('source_url', jsonb_build_object('old', old.source_url, 'new', new.source_url));
  end if;
  if (new.bio is distinct from old.bio) then
    v_changes := v_changes || jsonb_build_object('bio', jsonb_build_object('old', old.bio, 'new', new.bio));
  end if;
  if (new.photo_url is distinct from old.photo_url) then
    v_changes := v_changes || jsonb_build_object('photo_url', jsonb_build_object('old', old.photo_url, 'new', new.photo_url));
  end if;
  if (new.honorarium_amount is distinct from old.honorarium_amount) then
    v_changes := v_changes || jsonb_build_object('honorarium_amount', jsonb_build_object('old', old.honorarium_amount, 'new', new.honorarium_amount));
  end if;
  if (new.honorarium_notes is distinct from old.honorarium_notes) then
    v_changes := v_changes || jsonb_build_object('honorarium_notes', jsonb_build_object('old', old.honorarium_notes, 'new', new.honorarium_notes));
  end if;
  if (new.travel_amount is distinct from old.travel_amount) then
    v_changes := v_changes || jsonb_build_object('travel_amount', jsonb_build_object('old', old.travel_amount, 'new', new.travel_amount));
  end if;
  if (new.travel_notes is distinct from old.travel_notes) then
    v_changes := v_changes || jsonb_build_object('travel_notes', jsonb_build_object('old', old.travel_notes, 'new', new.travel_notes));
  end if;

  -- Only log if anything actually changed (skip pure updated_at touches).
  if v_changes = '{}'::jsonb then
    return new;
  end if;

  -- Pull editor's chapter_id from their profile.
  select chapter_id into v_chapter_id
    from public.profiles
    where id = auth.uid()
    limit 1;

  insert into public.public_speaker_revisions (
    public_speaker_id, editor_user_id, editor_chapter_id, changes
  ) values (
    new.id, auth.uid(), v_chapter_id, v_changes
  );

  -- Bump updated_at on the row itself.
  new.updated_at := now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_public_speaker_revision on public.public_speakers;
create trigger trg_log_public_speaker_revision
  before update on public.public_speakers
  for each row execute function public._log_public_speaker_revision();

-- ── 4. speakers.imported_from_library_id ───────────────────────────
alter table public.speakers
  add column if not exists imported_from_library_id uuid references public.public_speakers(id) on delete set null;

create index if not exists speakers_imported_from_library_idx
  on public.speakers (imported_from_library_id) where imported_from_library_id is not null;

-- ── 5. Permissions helper ──────────────────────────────────────────
-- Who can edit / contribute to the public speaker library? Today:
-- learning chair (and elect), super admin, regional learning chair
-- expert (informed cross-chapter opinions), president-style roles
-- and chapter staff.
create or replace function public.can_edit_speaker_library()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in (
        'super_admin',
        'learning_chair',
        'learning_chair_elect',
        'regional_learning_chair_expert',
        'president',
        'president_elect',
        'president_elect_elect',
        'chapter_executive_director',
        'chapter_experience_coordinator'
      )
  );
$$ language sql security definer stable;

-- ── 6. RLS ─────────────────────────────────────────────────────────
alter table public.public_speakers          enable row level security;
alter table public.public_speaker_reviews   enable row level security;
alter table public.public_speaker_revisions enable row level security;

-- public_speakers: anyone signed in can read.
drop policy if exists "public_speakers_select" on public.public_speakers;
create policy "public_speakers_select" on public.public_speakers
  for select to authenticated using (true);

drop policy if exists "public_speakers_insert" on public.public_speakers;
create policy "public_speakers_insert" on public.public_speakers
  for insert to authenticated
  with check (public.can_edit_speaker_library());

drop policy if exists "public_speakers_update" on public.public_speakers;
create policy "public_speakers_update" on public.public_speakers
  for update to authenticated
  using (public.can_edit_speaker_library())
  with check (public.can_edit_speaker_library());

drop policy if exists "public_speakers_delete" on public.public_speakers;
create policy "public_speakers_delete" on public.public_speakers
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- public_speaker_reviews: anyone signed in can read; users CRUD their own only.
drop policy if exists "public_speaker_reviews_select" on public.public_speaker_reviews;
create policy "public_speaker_reviews_select" on public.public_speaker_reviews
  for select to authenticated using (true);

drop policy if exists "public_speaker_reviews_insert" on public.public_speaker_reviews;
create policy "public_speaker_reviews_insert" on public.public_speaker_reviews
  for insert to authenticated
  with check (
    auth.uid() = reviewer_user_id
    and public.can_edit_speaker_library()
  );

drop policy if exists "public_speaker_reviews_update" on public.public_speaker_reviews;
create policy "public_speaker_reviews_update" on public.public_speaker_reviews
  for update to authenticated
  using (auth.uid() = reviewer_user_id)
  with check (auth.uid() = reviewer_user_id);

drop policy if exists "public_speaker_reviews_delete" on public.public_speaker_reviews;
create policy "public_speaker_reviews_delete" on public.public_speaker_reviews
  for delete to authenticated
  using (
    auth.uid() = reviewer_user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- public_speaker_revisions: read-only to clients; writes happen via trigger.
drop policy if exists "public_speaker_revisions_select" on public.public_speaker_revisions;
create policy "public_speaker_revisions_select" on public.public_speaker_revisions
  for select to authenticated using (true);

-- No INSERT/UPDATE/DELETE policies → everything but SELECT is denied
-- to authenticated. The trigger runs as security definer so it can
-- still write rows.

notify pgrst, 'reload schema';
