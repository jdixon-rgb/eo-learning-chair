-- Platform-wide feedback inbox. Every "Send Feedback" / "Report Bug"
-- submission lands here so the builder can triage without scattered DMs.
--
-- Anyone signed in can insert (authenticated users only — super-admins and
-- chapter users alike can send feedback). Only super-admins can read the
-- inbox.

create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  chapter_id uuid references public.chapters(id) on delete set null,
  feedback_type text not null default 'suggestion'
    check (feedback_type in ('suggestion', 'bug', 'praise', 'question')),
  message text not null,
  url text,
  user_agent text,
  status text not null default 'new'
    check (status in ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_platform_feedback_status
  on public.platform_feedback(status, created_at desc);
create index if not exists idx_platform_feedback_chapter
  on public.platform_feedback(chapter_id);

alter table public.platform_feedback enable row level security;

-- Anyone authenticated can insert their own feedback
create policy "Authenticated users can submit feedback"
  on public.platform_feedback for insert
  to authenticated
  with check (true);

-- Only super-admins can read or update the inbox
create policy "Super admins read all feedback"
  on public.platform_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

create policy "Super admins update feedback"
  on public.platform_feedback for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

notify pgrst, 'reload schema';
