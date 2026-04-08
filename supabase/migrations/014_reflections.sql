-- 013_reflections.sql
-- Reflections module: per-forum journaling + parking lot.
-- Three templates (Modern, Hesse Classic, EO Standard) driven by JSONB schemas.
-- Feelings library seeded from NVC + Hesse 5 Core Emotions; grows globally.
-- Reflections are strictly private to the author until declared to the parking lot.
-- Parking lot entries are visible to members of the same forum, author-only edit.

-- ── 0. Helper: resolve current auth user → chapter_members row ───
-- Links Supabase auth user to their chapter_members record via email match.
create or replace function public.current_chapter_member_id()
returns uuid as $$
  select cm.id
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Helper: current user's forum (text label from chapter_members.forum)
create or replace function public.current_member_forum()
returns text as $$
  select cm.forum
  from public.chapter_members cm
  join auth.users u on lower(u.email) = lower(cm.email)
  where u.id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ── 1. reflection_feelings (global library) ──────────────────
create table if not exists public.reflection_feelings (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  source text not null default 'user' check (source in ('nvc', 'hesse', 'user')),
  polarity text check (polarity in ('satisfied', 'unsatisfied')),
  parent_group text,
  intensity text check (intensity in ('strong', 'moderate', 'low')),
  created_by uuid references public.chapter_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reflection_feelings_word on public.reflection_feelings(lower(word));
create index if not exists idx_reflection_feelings_source on public.reflection_feelings(source);

-- ── 2. reflection_templates ──────────────────────────────────
-- Seeded, read-only from app. The schema JSONB drives the editor UI.
create table if not exists public.reflection_templates (
  slug text primary key,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  schema jsonb not null,
  created_at timestamptz not null default now()
);

-- ── 3. reflections ───────────────────────────────────────────
-- Per-member, per-forum journal entries. Strictly private to author.
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum text not null,
  member_id uuid not null references public.chapter_members(id) on delete cascade,
  template_slug text not null references public.reflection_templates(slug),
  category text check (category in ('business', 'personal', 'community')),
  content jsonb not null default '{}'::jsonb,
  feelings text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reflections_member on public.reflections(member_id);
create index if not exists idx_reflections_forum on public.reflections(chapter_id, forum);

-- ── 4. parking_lot_entries ───────────────────────────────────
-- Per-forum shared parking lot. Author-authored name + scores.
-- Standalone: no link back to reflection. Survives clearing.
create table if not exists public.parking_lot_entries (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  forum text not null,
  author_member_id uuid not null references public.chapter_members(id) on delete cascade,
  name text not null,
  importance int not null check (importance between 1 and 10),
  urgency int not null check (urgency between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parking_lot_forum on public.parking_lot_entries(chapter_id, forum);
create index if not exists idx_parking_lot_author on public.parking_lot_entries(author_member_id);

-- ── 5. RLS ────────────────────────────────────────────────────
alter table public.reflection_feelings enable row level security;
alter table public.reflection_templates enable row level security;
alter table public.reflections enable row level security;
alter table public.parking_lot_entries enable row level security;

-- reflection_feelings: anyone auth can read + insert (grows globally, no moderation v1)
create policy "Anyone can view feelings" on public.reflection_feelings
  for select using (true);
create policy "Authenticated can add feelings" on public.reflection_feelings
  for insert with check (auth.uid() is not null);

-- reflection_templates: read-only to everyone
create policy "Anyone can view templates" on public.reflection_templates
  for select using (true);

-- reflections: strictly author-only (select/insert/update/delete)
create policy "Author can view own reflections" on public.reflections
  for select using (member_id = public.current_chapter_member_id());
create policy "Author can insert own reflections" on public.reflections
  for insert with check (member_id = public.current_chapter_member_id());
create policy "Author can update own reflections" on public.reflections
  for update using (member_id = public.current_chapter_member_id());
create policy "Author can delete own reflections" on public.reflections
  for delete using (member_id = public.current_chapter_member_id());

-- parking_lot_entries: forum-mates can read; author-only write
create policy "Forum members can view parking lot" on public.parking_lot_entries
  for select using (
    chapter_id = public.user_chapter_id()
    and forum = public.current_member_forum()
  );
create policy "Author can insert parking lot entry" on public.parking_lot_entries
  for insert with check (
    author_member_id = public.current_chapter_member_id()
    and forum = public.current_member_forum()
  );
create policy "Author can update own parking lot entry" on public.parking_lot_entries
  for update using (author_member_id = public.current_chapter_member_id());
create policy "Author can delete own parking lot entry" on public.parking_lot_entries
  for delete using (author_member_id = public.current_chapter_member_id());

-- ── 6. Seed templates ────────────────────────────────────────
insert into public.reflection_templates (slug, name, description, sort_order, schema) values
(
  'modern',
  'Modern',
  'A single deep dive. Pick a topic, name your feelings, then ladder through three "why is that important?" prompts to uncover what it really says about you.',
  1,
  '{
    "kind": "single",
    "fields": [
      { "key": "feelings",     "type": "feelings_pills", "label": "Feelings",                                  "help": "What feelings come up around this topic?" },
      { "key": "headline",     "type": "short_text",     "label": "Headline",                                  "help": "In your own words — what are you trying to say?" },
      { "key": "context",      "type": "long_text",      "label": "Context",                                    "help": "A paragraph around the headline so others could understand it." },
      { "key": "significance", "type": "long_text",      "label": "Significance",                              "help": "Why is this significant to you?" },
      { "key": "why_1",        "type": "long_text",      "label": "Why is that important?",                     "help": "" },
      { "key": "why_2",        "type": "long_text",      "label": "Why is that important? (again)",             "help": "" },
      { "key": "why_3",        "type": "long_text",      "label": "Why is that important? (one more time)",     "help": "" },
      { "key": "self_insight", "type": "long_text",      "label": "What does this say about me?",               "help": "Closing paragraph." }
    ]
  }'::jsonb
),
(
  'hesse_classic',
  'Hesse Classic',
  'The traditional full-surface check-in. MEPS one-word read, life-area grid, a challenge to explore, topics to bring, and an update on where you left things last time.',
  2,
  '{
    "kind": "grid",
    "meps": [
      { "key": "mental",    "label": "Mental"    },
      { "key": "emotional", "label": "Emotional" },
      { "key": "physical",  "label": "Physical"  },
      { "key": "spiritual", "label": "Spiritual" }
    ],
    "rows": [
      { "key": "professional",  "label": "Professional"           },
      { "key": "personal",      "label": "Personal / Family"      }
    ],
    "columns": [
      { "key": "headline",     "label": "Headline",     "type": "short_text" },
      { "key": "emotions",     "label": "Emotions",     "type": "feelings_pills" },
      { "key": "significance", "label": "Significance and impact for me", "type": "long_text" }
    ],
    "footers": [
      { "key": "eq_challenge", "type": "long_text", "label": "EQ — Challenge / Opportunity to explore" },
      { "key": "iq_topics",    "type": "long_text", "label": "IQ — Topics" },
      { "key": "update",       "type": "long_text", "label": "Update" }
    ]
  }'::jsonb
),
(
  'eo_standard',
  'EO Standard',
  'The classic 5% worksheet. Strongest feelings of the past month across Work, Family, Personal, and the 30–60 days ahead.',
  3,
  '{
    "kind": "grid",
    "rows": [
      { "key": "work",     "label": "Work"                },
      { "key": "family",   "label": "Family"              },
      { "key": "personal", "label": "Personal"            },
      { "key": "next",     "label": "Next 30–60 days"     }
    ],
    "columns": [
      { "key": "feelings",     "label": "Feelings",                            "type": "feelings_pills", "help": "Strongest feelings this past month. Single words. 3–5 per row." },
      { "key": "headline",     "label": "Headline",                            "type": "short_text",     "help": "What caused these feelings? Only one sentence." },
      { "key": "significance", "label": "Significance (5%)",                   "type": "long_text",      "help": "How was this personally significant to me? Dig deep." }
    ],
    "footers": [
      { "key": "explore", "type": "long_text", "label": "A challenge or opportunity I would like to explore further with the group is…" }
    ]
  }'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  schema = excluded.schema;

-- ── 7. Seed feelings library ─────────────────────────────────
-- Hesse 5 Core Emotions (with intensity metadata)
insert into public.reflection_feelings (word, source, parent_group, intensity) values
-- MAD
('Furious','hesse','mad','strong'),('Betrayed','hesse','mad','strong'),('Outraged','hesse','mad','strong'),('Angry','hesse','mad','strong'),('Irate','hesse','mad','strong'),('Irritated','hesse','mad','strong'),
('Frustrated','hesse','mad','moderate'),('Agitated','hesse','mad','moderate'),('Disgusted','hesse','mad','moderate'),('Annoyed','hesse','mad','moderate'),
('Upset','hesse','mad','low'),('Resistant','hesse','mad','low'),
-- GLAD
('Elated','hesse','glad','strong'),('Passionate','hesse','glad','strong'),('Overjoyed','hesse','glad','strong'),('Thrilled','hesse','glad','strong'),('Ecstatic','hesse','glad','strong'),('Enthusiastic','hesse','glad','strong'),
('Relieved','hesse','glad','moderate'),('Satisfied','hesse','glad','moderate'),('Happy','hesse','glad','moderate'),('Pleased','hesse','glad','moderate'),
('Content','hesse','glad','low'),('Delighted','hesse','glad','low'),
-- SAD
('Depressed','hesse','sad','strong'),('Miserable','hesse','sad','strong'),('Alone','hesse','sad','strong'),('Hurt','hesse','sad','strong'),('Hopeless','hesse','sad','strong'),('Insecure','hesse','sad','strong'),
('Somber','hesse','sad','moderate'),('Heartbroken','hesse','sad','moderate'),('Discouraged','hesse','sad','moderate'),('Disappointed','hesse','sad','moderate'),
('Unhappy','hesse','sad','low'),('Dissatisfied','hesse','sad','low'),
-- SCARED
('Terrified','hesse','scared','strong'),('Horrified','hesse','scared','strong'),('Frantic','hesse','scared','strong'),('Petrified','hesse','scared','strong'),('Frightened','hesse','scared','strong'),('Distressed','hesse','scared','strong'),
('Threatened','hesse','scared','moderate'),('Apprehensive','hesse','scared','moderate'),('Intimidated','hesse','scared','moderate'),('Anxious','hesse','scared','moderate'),
('Worried','hesse','scared','low'),('Cautious','hesse','scared','low'),
-- ASHAMED
('Mortified','hesse','ashamed','strong'),('Remorseful','hesse','ashamed','strong'),('Humiliated','hesse','ashamed','strong'),('Worthless','hesse','ashamed','strong'),('Disgraced','hesse','ashamed','strong'),('Exposed','hesse','ashamed','strong'),
('Unworthy','hesse','ashamed','moderate'),('Apologetic','hesse','ashamed','moderate'),('Guilty','hesse','ashamed','moderate'),('Secretive','hesse','ashamed','moderate'),
('Regretful','hesse','ashamed','low'),('Embarrassed','hesse','ashamed','low')
on conflict (word) do nothing;

-- NVC inventory — needs satisfied
insert into public.reflection_feelings (word, source, polarity, parent_group) values
('Compassionate','nvc','satisfied','affectionate'),('Friendly','nvc','satisfied','affectionate'),('Loving','nvc','satisfied','affectionate'),('Open-hearted','nvc','satisfied','affectionate'),('Sympathetic','nvc','satisfied','affectionate'),('Tender','nvc','satisfied','affectionate'),('Warm','nvc','satisfied','affectionate'),
('Absorbed','nvc','satisfied','engaged'),('Alert','nvc','satisfied','engaged'),('Curious','nvc','satisfied','engaged'),('Engrossed','nvc','satisfied','engaged'),('Enchanted','nvc','satisfied','engaged'),('Entranced','nvc','satisfied','engaged'),('Fascinated','nvc','satisfied','engaged'),('Interested','nvc','satisfied','engaged'),('Intrigued','nvc','satisfied','engaged'),('Involved','nvc','satisfied','engaged'),('Spellbound','nvc','satisfied','engaged'),('Stimulated','nvc','satisfied','engaged'),
('Expectant','nvc','satisfied','hopeful'),('Encouraged','nvc','satisfied','hopeful'),('Optimistic','nvc','satisfied','hopeful'),
('Empowered','nvc','satisfied','confident'),('Open','nvc','satisfied','confident'),('Proud','nvc','satisfied','confident'),('Safe','nvc','satisfied','confident'),('Secure','nvc','satisfied','confident'),
('Amazed','nvc','satisfied','excited'),('Animated','nvc','satisfied','excited'),('Ardent','nvc','satisfied','excited'),('Aroused','nvc','satisfied','excited'),('Astonished','nvc','satisfied','excited'),('Dazzled','nvc','satisfied','excited'),('Eager','nvc','satisfied','excited'),('Energetic','nvc','satisfied','excited'),('Giddy','nvc','satisfied','excited'),('Invigorated','nvc','satisfied','excited'),('Lively','nvc','satisfied','excited'),('Surprised','nvc','satisfied','excited'),('Vibrant','nvc','satisfied','excited'),
('Appreciative','nvc','satisfied','grateful'),('Moved','nvc','satisfied','grateful'),('Thankful','nvc','satisfied','grateful'),('Touched','nvc','satisfied','grateful'),
('Awed','nvc','satisfied','inspired'),('Wonder','nvc','satisfied','inspired'),
('Amused','nvc','satisfied','joyful'),('Glad','nvc','satisfied','joyful'),('Jubilant','nvc','satisfied','joyful'),('Tickled','nvc','satisfied','joyful'),
('Blissful','nvc','satisfied','exhilarated'),('Enthralled','nvc','satisfied','exhilarated'),('Exuberant','nvc','satisfied','exhilarated'),('Radiant','nvc','satisfied','exhilarated'),('Rapturous','nvc','satisfied','exhilarated'),
('Calm','nvc','satisfied','peaceful'),('Clear-headed','nvc','satisfied','peaceful'),('Comfortable','nvc','satisfied','peaceful'),('Centered','nvc','satisfied','peaceful'),('Equanimous','nvc','satisfied','peaceful'),('Fulfilled','nvc','satisfied','peaceful'),('Mellow','nvc','satisfied','peaceful'),('Quiet','nvc','satisfied','peaceful'),('Relaxed','nvc','satisfied','peaceful'),('Serene','nvc','satisfied','peaceful'),('Still','nvc','satisfied','peaceful'),('Tranquil','nvc','satisfied','peaceful'),('Trusting','nvc','satisfied','peaceful'),
('Enlivened','nvc','satisfied','refreshed'),('Rejuvenated','nvc','satisfied','refreshed'),('Renewed','nvc','satisfied','refreshed'),('Rested','nvc','satisfied','refreshed'),('Restored','nvc','satisfied','refreshed'),('Revived','nvc','satisfied','refreshed')
on conflict (word) do nothing;

-- NVC inventory — needs not satisfied
insert into public.reflection_feelings (word, source, polarity, parent_group) values
('Apprehensive','nvc','unsatisfied','afraid'),('Dread','nvc','unsatisfied','afraid'),('Foreboding','nvc','unsatisfied','afraid'),('Mistrustful','nvc','unsatisfied','afraid'),('Panicked','nvc','unsatisfied','afraid'),('Scared','nvc','unsatisfied','afraid'),('Suspicious','nvc','unsatisfied','afraid'),('Wary','nvc','unsatisfied','afraid'),
('Aggravated','nvc','unsatisfied','annoyed'),('Dismayed','nvc','unsatisfied','annoyed'),('Disgruntled','nvc','unsatisfied','annoyed'),('Displeased','nvc','unsatisfied','annoyed'),('Exasperated','nvc','unsatisfied','annoyed'),('Impatient','nvc','unsatisfied','annoyed'),('Irked','nvc','unsatisfied','annoyed'),
('Enraged','nvc','unsatisfied','angry'),('Incensed','nvc','unsatisfied','angry'),('Indignant','nvc','unsatisfied','angry'),('Livid','nvc','unsatisfied','angry'),('Resentful','nvc','unsatisfied','angry'),
('Animosity','nvc','unsatisfied','aversion'),('Appalled','nvc','unsatisfied','aversion'),('Contempt','nvc','unsatisfied','aversion'),('Dislike','nvc','unsatisfied','aversion'),('Hate','nvc','unsatisfied','aversion'),('Hostile','nvc','unsatisfied','aversion'),('Repulsed','nvc','unsatisfied','aversion'),
('Ambivalent','nvc','unsatisfied','confused'),('Baffled','nvc','unsatisfied','confused'),('Bewildered','nvc','unsatisfied','confused'),('Dazed','nvc','unsatisfied','confused'),('Hesitant','nvc','unsatisfied','confused'),('Lost','nvc','unsatisfied','confused'),('Mystified','nvc','unsatisfied','confused'),('Perplexed','nvc','unsatisfied','confused'),('Puzzled','nvc','unsatisfied','confused'),('Torn','nvc','unsatisfied','confused'),
('Alienated','nvc','unsatisfied','disconnected'),('Aloof','nvc','unsatisfied','disconnected'),('Apathetic','nvc','unsatisfied','disconnected'),('Bored','nvc','unsatisfied','disconnected'),('Cold','nvc','unsatisfied','disconnected'),('Detached','nvc','unsatisfied','disconnected'),('Distant','nvc','unsatisfied','disconnected'),('Distracted','nvc','unsatisfied','disconnected'),('Indifferent','nvc','unsatisfied','disconnected'),('Numb','nvc','unsatisfied','disconnected'),('Removed','nvc','unsatisfied','disconnected'),('Uninterested','nvc','unsatisfied','disconnected'),('Withdrawn','nvc','unsatisfied','disconnected'),
('Alarmed','nvc','unsatisfied','disquiet'),('Discombobulated','nvc','unsatisfied','disquiet'),('Disconcerted','nvc','unsatisfied','disquiet'),('Disturbed','nvc','unsatisfied','disquiet'),('Perturbed','nvc','unsatisfied','disquiet'),('Rattled','nvc','unsatisfied','disquiet'),('Restless','nvc','unsatisfied','disquiet'),('Shocked','nvc','unsatisfied','disquiet'),('Startled','nvc','unsatisfied','disquiet'),('Troubled','nvc','unsatisfied','disquiet'),('Turbulent','nvc','unsatisfied','disquiet'),('Turmoil','nvc','unsatisfied','disquiet'),('Uncomfortable','nvc','unsatisfied','disquiet'),('Uneasy','nvc','unsatisfied','disquiet'),('Unnerved','nvc','unsatisfied','disquiet'),('Unsettled','nvc','unsatisfied','disquiet'),
('Ashamed','nvc','unsatisfied','embarrassed'),('Chagrined','nvc','unsatisfied','embarrassed'),('Flustered','nvc','unsatisfied','embarrassed'),('Self-conscious','nvc','unsatisfied','embarrassed'),
('Beat','nvc','unsatisfied','fatigue'),('Burnt out','nvc','unsatisfied','fatigue'),('Depleted','nvc','unsatisfied','fatigue'),('Exhausted','nvc','unsatisfied','fatigue'),('Lethargic','nvc','unsatisfied','fatigue'),('Listless','nvc','unsatisfied','fatigue'),('Sleepy','nvc','unsatisfied','fatigue'),('Tired','nvc','unsatisfied','fatigue'),('Weary','nvc','unsatisfied','fatigue'),('Worn out','nvc','unsatisfied','fatigue'),
('Agony','nvc','unsatisfied','pain'),('Anguished','nvc','unsatisfied','pain'),('Bereaved','nvc','unsatisfied','pain'),('Devastated','nvc','unsatisfied','pain'),('Grief','nvc','unsatisfied','pain'),('Lonely','nvc','unsatisfied','pain'),('Regretful','nvc','unsatisfied','pain'),
('Dejected','nvc','unsatisfied','sad'),('Despair','nvc','unsatisfied','sad'),('Despondent','nvc','unsatisfied','sad'),('Disheartened','nvc','unsatisfied','sad'),('Forlorn','nvc','unsatisfied','sad'),('Gloomy','nvc','unsatisfied','sad'),('Heavy-hearted','nvc','unsatisfied','sad'),('Melancholy','nvc','unsatisfied','sad'),('Wretched','nvc','unsatisfied','sad'),
('Cranky','nvc','unsatisfied','tense'),('Distraught','nvc','unsatisfied','tense'),('Edgy','nvc','unsatisfied','tense'),('Fidgety','nvc','unsatisfied','tense'),('Frazzled','nvc','unsatisfied','tense'),('Irritable','nvc','unsatisfied','tense'),('Jittery','nvc','unsatisfied','tense'),('Nervous','nvc','unsatisfied','tense'),('Overwhelmed','nvc','unsatisfied','tense'),('Stressed-out','nvc','unsatisfied','tense'),
('Fragile','nvc','unsatisfied','vulnerable'),('Guarded','nvc','unsatisfied','vulnerable'),('Helpless','nvc','unsatisfied','vulnerable'),('Leery','nvc','unsatisfied','vulnerable'),('Reserved','nvc','unsatisfied','vulnerable'),('Sensitive','nvc','unsatisfied','vulnerable'),('Shaky','nvc','unsatisfied','vulnerable'),
('Envious','nvc','unsatisfied','yearning'),('Jealous','nvc','unsatisfied','yearning'),('Longing','nvc','unsatisfied','yearning'),('Nostalgic','nvc','unsatisfied','yearning'),('Pining','nvc','unsatisfied','yearning'),('Wistful','nvc','unsatisfied','yearning')
on conflict (word) do nothing;

-- ── 8. Reload PostgREST schema cache ──────────────────────────
notify pgrst, 'reload schema';
