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

See `.env.example` at the repo root. Three keys:

- `VITE_APP_ENV` — one of `production | staging | development`. Drives Sentry tagging.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — point at the matching Supabase project.
- `VITE_SENTRY_DSN` — same DSN across envs; the `environment` tag distinguishes them in Sentry.

In Vercel, set these under **Settings → Environment Variables**, scoped to the matching environment (Production vs Preview).

## Switching local dev between environments

Edit `.env.local` and restart `npm run dev`. There is no per-env config file — one env at a time.

## Running migrations against staging

```sh
# One-time link (run once, picks the staging project from the picker)
supabase link --project-ref <STAGING_REF>

# Push migrations
supabase db push --linked --yes

# Re-link to prod when done
supabase link --project-ref pnrbvaehjbabjckixoxt
```

Long-term we may want a script that swaps between linked projects without re-running the picker; for now, manual is fine.
