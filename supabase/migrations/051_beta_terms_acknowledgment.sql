-- Beta Terms versioning + per-user acknowledgment.
--
-- Our Chapter OS is in active beta with chapters across 30+ countries
-- requesting access. We need an enforceable record that every user has
-- accepted the beta terms (assumption of risk + indemnification of JSD,
-- Aidan Taylor LLC, and EO Arizona) before using the product.
--
-- Two tables:
--   beta_terms_versions          immutable history of every published terms version
--   beta_terms_acknowledgments   per-user record of which version they accepted, when
--
-- Re-acknowledgment: when a new terms version is published (e.g. Chair Chat
-- adds AI-translation disclaimers), the app gates returning users on a
-- blocking modal until they accept the new version.
--
-- "Current" terms = row with the latest effective_date <= today. Helper
-- function current_beta_terms_version() returns the row to the client.
--
-- Idempotent: safe to re-run.

create table if not exists public.beta_terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,                       -- "1.0", "1.1", ...
  effective_date date not null,
  content_md text not null,                           -- full markdown shown in modal
  summary text not null default '',                   -- one-liner for re-ack diff card
  created_at timestamptz not null default now()
);

create index if not exists idx_beta_terms_versions_effective on public.beta_terms_versions(effective_date desc);

create table if not exists public.beta_terms_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id uuid not null references public.beta_terms_versions(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  user_agent text,                                    -- captured for audit; nullable
  unique (user_id, version_id)
);

create index if not exists idx_beta_terms_acks_user on public.beta_terms_acknowledgments(user_id);

-- RLS
alter table public.beta_terms_versions enable row level security;
alter table public.beta_terms_acknowledgments enable row level security;

-- Anyone (including unauthenticated, for the login-page modal) can read terms.
drop policy if exists "anyone reads terms versions" on public.beta_terms_versions;
create policy "anyone reads terms versions" on public.beta_terms_versions
  for select to anon, authenticated
  using (true);

-- Only super_admin can insert/update/delete versions (publishing happens via SQL or admin tooling).
drop policy if exists "super admin manages terms versions" on public.beta_terms_versions;
create policy "super admin manages terms versions" on public.beta_terms_versions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Users read their own acks; super_admin reads all (audit).
drop policy if exists "users read own acks" on public.beta_terms_acknowledgments;
create policy "users read own acks" on public.beta_terms_acknowledgments
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- Users insert their own acks only.
drop policy if exists "users insert own acks" on public.beta_terms_acknowledgments;
create policy "users insert own acks" on public.beta_terms_acknowledgments
  for insert to authenticated
  with check (user_id = auth.uid());

-- No update/delete from clients (acks are immutable historical records).

-- Current-terms helper: returns the single most recent in-effect version.
create or replace function public.current_beta_terms_version()
returns table (
  id uuid,
  version text,
  effective_date date,
  content_md text,
  summary text
)
language sql
stable
security definer
as $$
  select id, version, effective_date, content_md, summary
  from public.beta_terms_versions
  where effective_date <= current_date
  order by effective_date desc, version desc
  limit 1;
$$;

grant execute on function public.current_beta_terms_version() to anon, authenticated;

-- Convenience helper: did the current authenticated user ack the current terms?
create or replace function public.has_acked_current_beta_terms()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.beta_terms_acknowledgments a
    join public.current_beta_terms_version() c on c.id = a.version_id
    where a.user_id = auth.uid()
  );
$$;

grant execute on function public.has_acked_current_beta_terms() to authenticated;

-- Seed v1.0
insert into public.beta_terms_versions (version, effective_date, content_md, summary)
values (
  '1.0',
  '2026-04-19',
  $tmd$# Our Chapter OS — Beta Program Terms

## What this is

Our Chapter OS is an **independent software project** built by John-Scott Dixon, an Entrepreneurs' Organization member, for use by other EO members and chapters. It is **not a product of, sponsored by, endorsed by, or affiliated with** Entrepreneurs' Organization, EO Global, EO Arizona, or any EO chapter, region, or governing body. References to EO terminology, roles, or structure are descriptive only.

The software is provided through Aidan Taylor, LLC, a private Arizona limited liability company.

## Beta status

This software is in **active beta**. By requesting access (including by requesting a magic-link sign-in email) and by acknowledging these terms, you acknowledge and agree that:

1. **Bugs and outages are expected.** Features may change, regress, or be removed without notice. Data displayed may be incomplete, incorrect, or temporarily unavailable.
2. **Data may be lost.** Although reasonable backup measures are in place, no guarantee is made that any data you enter will be preserved, recoverable, or retained for any period. **You are solely responsible for maintaining your own backups.** A "Download Backup" function is provided in the application for this purpose, and you are encouraged to use it regularly.
3. **No warranty.** The software is provided **"AS IS" and "AS AVAILABLE,"** without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, accuracy, reliability, availability, or non-infringement.
4. **No fitness for any decision.** Outputs of the software (including budget figures, member rosters, attendance counts, financial calculations, AI-generated suggestions, translations, contract reviews, and recommendations) are informational only and **must not be relied upon for legal, financial, fiduciary, contractual, or governance decisions** without independent verification.
5. **AI-generated content.** Where the software uses generative AI to produce translations, summaries, contract reviews, recommendations, or other output, that output may be inaccurate, incomplete, biased, or fabricated. **AI output is not legal, financial, or professional advice** and must be independently verified before any reliance.
6. **No support obligation.** No service-level commitment, response time, uptime guarantee, or feature roadmap commitment is made or implied.

## Assumption of risk and indemnification

By using the software, you, on behalf of yourself, your chapter, and any entity you represent:

1. **Assume all risk** arising from your use of the software, including but not limited to data loss, data exposure, downtime, incorrect outputs, miscommunications with members or partners, and any operational, financial, or reputational consequences.
2. **Release and indemnify** John-Scott Dixon (personally), Aidan Taylor, LLC, **and the EO Arizona chapter** (collectively, the "Released Parties") from any and all claims, demands, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to your use of, or inability to use, the software, whether based in contract, tort, statute, or otherwise.
3. **Maximum aggregate liability.** The maximum aggregate liability of the Released Parties to you, for any cause whatsoever, shall not exceed **one hundred U.S. dollars ($100.00)**, regardless of the form of action.
4. **Waive consequential damages.** In no event shall the Released Parties be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, or business interruption, even if advised of the possibility.

## Data handling

Your chapter's data is stored in a multi-tenant database with row-level security scoping data to your chapter. Reasonable measures are taken to prevent cross-chapter data exposure, but **no security guarantee is made**. Do not enter information into the software that you cannot afford to have lost, exposed, or made available to other users in error.

## Termination

Access to the software may be suspended or terminated at any time, for any reason or no reason, with or without notice. Upon termination, your data may be deleted; you are responsible for retaining backups before termination.

## Governing law

These terms are governed by the laws of the State of Arizona, without regard to conflict-of-law principles. Any dispute shall be resolved exclusively in the state or federal courts located in Maricopa County, Arizona.

## Updates to these terms

These terms may be updated from time to time. Material changes will require renewed acknowledgment before continued use of the software. Continued use after the effective date of an updated version constitutes acceptance of the updated terms.

## Acknowledgment

By acknowledging these terms (whether at sign-in or in-application), you confirm that you have read, understood, and agreed to them. A record of your acknowledgment, including timestamp and the version of these terms in effect, will be retained.

---
*Beta Terms version 1.0 — effective 2026-04-19*
$tmd$,
  'Initial beta terms — assumption of risk + indemnification of JSD, Aidan Taylor LLC, and EO Arizona.'
)
on conflict (version) do nothing;

notify pgrst, 'reload schema';
