# Environments

This app runs in three environments. Each is isolated: separate Supabase project, separate Vercel deploy, separate env vars.

| Environment | Branch    | Vercel deploy             | Supabase project                       |
|-------------|-----------|---------------------------|----------------------------------------|
| production  | `main`    | production (custom domain)| OurChapter OS (`pnrbvaehjbabjckixoxt`) |
| staging     | `staging` | preview (Vercel-assigned) | OurChapter OS - Staging                |
| development | local     | `vite` dev server         | (point at staging by default)          |

## Promotion model

```
local dev  →  push to `staging` branch  →  rehearse migration on staging Supabase  →  merge into `main`  →  prod deploy + `supabase db push --linked --yes` against prod
```

Migrations always run against staging first. Only after a clean staging run do they go to prod.

## Env vars

See `.env.example` at the repo root. Client-side keys (Vite-injected, prefixed `VITE_`):

- `VITE_APP_ENV` — one of `production | staging | development`. Drives Sentry tagging.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — point at the matching Supabase project.
- `VITE_SENTRY_DSN` — same DSN across envs; the `environment` tag distinguishes them in Sentry.

Server-side keys (used by `/api/*` Vercel serverless functions, **never** prefixed `VITE_`):

- `ANTHROPIC_API_KEY` — required by `/api/contracts/parse`, `/api/venues/lookup`, `/api/constitution/parse`. Same key is fine across envs.
- `GOOGLE_PLACES_API_KEY` — optional, augments venue auto-lookup with photos / verified addresses.

In Vercel, set these under **Settings → Environment Variables**. **Important:** scope each key to **both Production *and* Preview** (the `staging` branch deploys are previews, so a Production-only scope leaves staging broken). For client-side keys with different values per env (Supabase URL/anon key), set the production value scoped to Production and the staging value scoped to Preview.

## Switching local dev between environments

Edit `.env.local` and restart `npm run dev`. There is no per-env config file — one env at a time.

## Bootstrapping a new Supabase project (e.g. spinning up a new staging or replacing one)

The migration history (`supabase/migrations/001` through `069`) does **not** apply cleanly to a fresh DB — early migrations have ordering and bootstrap drift. Instead, use the prod schema baseline.

`supabase/baseline.sql` is a `pg_dump` of prod's `public` schema (taken 2026-04-26). It captures all tables, functions, RLS policies, indexes, and the auth.users triggers as they exist in prod. `supabase/baseline_migration_tracking.sql` marks all baseline-included migrations as already applied so future `db push` doesn't try to replay them.

### One-time bootstrap procedure for a new Supabase project

```sh
# 1. Get the new project's direct DB connection string
#    Settings → Database → Connection string → URI (port 5432, NOT pooler)

NEW_DB_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres'

# 2. Wipe & prepare (skip if project is brand new and untouched)
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c "
  drop schema if exists public cascade;
  create schema public;
  grant usage on schema public to postgres, anon, authenticated, service_role;
  grant all on schema public to postgres, service_role;
  alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
  truncate supabase_migrations.schema_migrations;
"

# 3. Apply the baseline schema
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f supabase/baseline.sql

# 4. Mark baseline-included migrations as already applied
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f supabase/baseline_migration_tracking.sql

# 5. Link Supabase CLI and apply any newer migrations
supabase link --project-ref <new-ref>
supabase db push --linked --yes
```

After step 5, the new project is in lockstep with prod plus any unmerged migrations from `supabase/migrations/`.

### Routine migration push (existing envs)

```sh
# Link to staging (the linked project sticks across CLI sessions)
supabase link --project-ref xsktrjbicqsgphuhaahz

# Push migrations to staging FIRST
supabase db push --linked --yes

# Smoke test the affected feature on the staging deploy URL
# Only after staging is clean:
supabase link --project-ref pnrbvaehjbabjckixoxt
supabase db push --linked --yes
```

**Always re-link to prod when finished.** Leaving the CLI linked to staging risks pushing prod-intended migrations to staging next time. Use `supabase projects list` to confirm which project is linked (●).

### Refreshing the baseline

The baseline is a snapshot — it goes stale as new migrations land. When you've accumulated meaningful drift (say, after every 30+ new migrations) regenerate:

```sh
# With CLI linked to prod
PGPASSWORD='<prod_db_password>' pg_dump \
  --host=db.pnrbvaehjbabjckixoxt.supabase.co --port=5432 --username=postgres --dbname=postgres \
  --schema=public --schema-only --no-owner --no-privileges \
  -f supabase/baseline.sql

PGPASSWORD='<prod_db_password>' pg_dump \
  --host=db.pnrbvaehjbabjckixoxt.supabase.co --port=5432 --username=postgres --dbname=postgres \
  --schema=supabase_migrations --data-only --inserts --no-owner --no-privileges \
  -f supabase/baseline_migration_tracking.sql

# Re-add the auth.users triggers footer to baseline.sql (pg_dump --schema=public misses them):
#   - on_auth_user_created → public.handle_new_user()
#   - sync_profile_last_sign_in_trigger → public.sync_profile_last_sign_in()
# See git history of baseline.sql for the exact footer block.

# Make CREATE SCHEMA idempotent
sed -i.bak 's/^CREATE SCHEMA public;$/CREATE SCHEMA IF NOT EXISTS public;/' supabase/baseline.sql
rm supabase/baseline.sql.bak
```
