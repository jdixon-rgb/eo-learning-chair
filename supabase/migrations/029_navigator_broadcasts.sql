-- 029_navigator_broadcasts.sql
-- Navigator broadcasts: the Engagement Chair fires one message to every
-- active navigator (e.g. "How's your connection going — Y / N?") and
-- navigators tap a single option to respond. Aggregated response view
-- solves the "too many 1:1 threads to keep alive" failure mode that kills
-- navigator follow-through today.
--
-- Two tables:
--   1. navigator_broadcasts           — the prompts, with response options
--   2. navigator_broadcast_responses  — one row per navigator per broadcast

-- ── 1. navigator_broadcasts ──────────────────────────────────
create table if not exists public.navigator_broadcasts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_year text not null,
  sender_member_id uuid references public.chapter_members(id) on delete set null,
  prompt text not null,
  -- JSON array of { value: string, label: string } objects.
  -- Default is yes/no but the chair can customize per-broadcast.
  options jsonb not null default '[
    { "value": "yes", "label": "Yes" },
    { "value": "no",  "label": "No"  }
  ]'::jsonb,
  status text not null default 'open' check (status in ('open', 'closed')),
  sent_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_navigator_broadcasts_chapter on public.navigator_broadcasts(chapter_id);
create index if not exists idx_navigator_broadcasts_fy on public.navigator_broadcasts(fiscal_year);
create index if not exists idx_navigator_broadcasts_status on public.navigator_broadcasts(status);

-- ── 2. navigator_broadcast_responses ─────────────────────────
create table if not exists public.navigator_broadcast_responses (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.navigator_broadcasts(id) on delete cascade,
  navigator_id uuid not null references public.navigators(id) on delete cascade,
  -- chapter_member_id denormalized for faster aggregation queries
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  response_value text not null,
  note text default '',
  responded_at timestamptz not null default now(),
  unique (broadcast_id, navigator_id)
);

create index if not exists idx_nbr_broadcast on public.navigator_broadcast_responses(broadcast_id);
create index if not exists idx_nbr_navigator on public.navigator_broadcast_responses(navigator_id);
create index if not exists idx_nbr_member on public.navigator_broadcast_responses(chapter_member_id);

-- ── 3. RLS ────────────────────────────────────────────────────
-- Match the permissive pattern used elsewhere: anyone authenticated can read,
-- admins can write broadcasts, any navigator can insert their own response.
alter table public.navigator_broadcasts enable row level security;
alter table public.navigator_broadcast_responses enable row level security;

-- navigator_broadcasts: admin-only write, anyone can read
create policy "Anon can view navigator_broadcasts" on public.navigator_broadcasts
  for select using (true);
create policy "Admins can insert navigator_broadcasts" on public.navigator_broadcasts
  for insert with check (public.is_super_admin() or public.is_admin());
create policy "Admins can update navigator_broadcasts" on public.navigator_broadcasts
  for update using (public.is_super_admin() or public.is_admin());
create policy "Admins can delete navigator_broadcasts" on public.navigator_broadcasts
  for delete using (public.is_super_admin() or public.is_admin());

-- navigator_broadcast_responses:
--   select: anyone authenticated (chair needs to see all; navigators see everyone's count)
--   insert: the responding navigator (their chapter_member_id must match their auth),
--           or an admin (so chair can log a response on someone's behalf if needed)
--   update: same as insert (navigator can change their mind)
--   delete: admin only
create policy "Anon can view navigator_broadcast_responses" on public.navigator_broadcast_responses
  for select using (true);
create policy "Navigator or admin can insert response" on public.navigator_broadcast_responses
  for insert with check (
    public.is_super_admin()
    or public.is_admin()
    or chapter_member_id = public.current_chapter_member_id()
  );
create policy "Navigator or admin can update own response" on public.navigator_broadcast_responses
  for update using (
    public.is_super_admin()
    or public.is_admin()
    or chapter_member_id = public.current_chapter_member_id()
  );
create policy "Admin can delete response" on public.navigator_broadcast_responses
  for delete using (public.is_super_admin() or public.is_admin());

-- ── 4. Reload PostgREST schema cache ──────────────────────────
notify pgrst, 'reload schema';
