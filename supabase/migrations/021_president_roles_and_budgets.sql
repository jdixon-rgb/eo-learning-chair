-- Add president and finance_chair as first-class app roles
-- Create fiscal_year_budgets table for FY-level budget with per-chair line items

-- ── 1. Add president + finance_chair to profiles role check ──
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin',
    'president',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- ── 2. Add to member_invites role check ──
alter table public.member_invites drop constraint if exists member_invites_role_check;
alter table public.member_invites add constraint member_invites_role_check
  check (role in (
    'super_admin',
    'president',
    'finance_chair',
    'learning_chair',
    'engagement_chair',
    'chapter_experience_coordinator',
    'chapter_executive_director',
    'committee_member',
    'board_liaison',
    'member'
  ));

-- ── 3. Update is_admin() to include president + finance_chair ──
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in (
      'president',
      'finance_chair',
      'learning_chair',
      'engagement_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

-- ── 4. Update is_chapter_admin() ──
create or replace function public.is_chapter_admin(check_chapter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and chapter_id = check_chapter_id
    and role in (
      'president',
      'finance_chair',
      'learning_chair',
      'engagement_chair',
      'chapter_experience_coordinator',
      'chapter_executive_director'
    )
  );
$$ language sql security definer stable;

-- ── 5. Fiscal year budgets table ──
-- Each FY has one master budget set by the president, with per-chair line items
create table if not exists public.fiscal_year_budgets (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fiscal_year text not null,
  total_budget integer not null default 0,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chapter_id, fiscal_year)
);

create index if not exists idx_fy_budgets_chapter_fy
  on public.fiscal_year_budgets(chapter_id, fiscal_year);

-- Per-chair budget line items within a fiscal year
create table if not exists public.fiscal_year_budget_lines (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_budget_id uuid not null references public.fiscal_year_budgets(id) on delete cascade,
  role_key text not null,
  label text not null default '',
  amount integer not null default 0,
  notes text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fy_budget_lines_budget
  on public.fiscal_year_budget_lines(fiscal_year_budget_id);

-- RLS
alter table public.fiscal_year_budgets enable row level security;
alter table public.fiscal_year_budget_lines enable row level security;

create policy "Anon can read fiscal_year_budgets" on public.fiscal_year_budgets for select to anon, authenticated using (true);
create policy "Authenticated can insert fiscal_year_budgets" on public.fiscal_year_budgets for insert to authenticated with check (true);
create policy "Authenticated can update fiscal_year_budgets" on public.fiscal_year_budgets for update to authenticated using (true);
create policy "Authenticated can delete fiscal_year_budgets" on public.fiscal_year_budgets for delete to authenticated using (true);

create policy "Anon can read fiscal_year_budget_lines" on public.fiscal_year_budget_lines for select to anon, authenticated using (true);
create policy "Authenticated can insert fiscal_year_budget_lines" on public.fiscal_year_budget_lines for insert to authenticated with check (true);
create policy "Authenticated can update fiscal_year_budget_lines" on public.fiscal_year_budget_lines for update to authenticated using (true);
create policy "Authenticated can delete fiscal_year_budget_lines" on public.fiscal_year_budget_lines for delete to authenticated using (true);

notify pgrst, 'reload schema';
