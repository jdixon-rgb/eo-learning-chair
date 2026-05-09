# Ephemeral clone testing for risky migrations

When to use this: **before pushing any migration to prod that touches RLS policies, indexes, constraints, or functions.** Pure additive `ADD COLUMN` / `CREATE TABLE` migrations don't need this; everything else does.

The goal is to verify the migration applies cleanly *and the app still works* against prod-shaped data before subjecting real chapters to it. Staging's data shape ≠ prod's data shape (e.g. staging often uses fictional rows; prod has 15+ chapters with real edge cases the synthetic data doesn't exercise).

## Why this matters at scale

At 1 chapter, a bad migration is one panicked chair. At 50+ chapters across countries, a bad migration is 50+ panicked chairs sending emails simultaneously to staff who can't respond fast enough. Cost of a 30-minute ephemeral clone test ≈ saved by avoiding one such incident.

## Steps

### 1. Restore prod to a fresh ephemeral Supabase project

In the Supabase dashboard for the **prod** project (`pnrbvaehjbabjckixoxt`):

1. **Database → Backups** → pick the most recent backup or a PITR timestamp (latest is fine; we just need shape).
2. **Restore to → New project** (NOT in-place).
3. Name the new project something like `tmp-clone-YYYYMMDD-HHMM`.
4. Wait ~5 min for restoration. Note the new project's reference ID.

### 2. Link the CLI and apply the candidate migration

```sh
# Save current link target so we can restore at the end
PRIOR_LINK=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")

supabase link --project-ref <ephemeral-ref>
supabase db push --linked --yes
```

If the push fails: **stop here.** The migration is broken against prod's shape. Fix it, retry on a fresh ephemeral clone (don't reuse the partially-applied one).

### 3. Smoke-test the affected surfaces

Run the smoke-test script against the ephemeral project:

```sh
./scripts/smoke-test-supabase.sh <ephemeral-ref> <ephemeral-anon-key>
```

(Get the anon key from **Project Settings → API** in the Supabase dashboard.)

The script hits a representative set of REST endpoints and verifies each returns 200 with non-empty data where applicable. If any fail, the migration breaks something on prod-shaped data.

### 4. Manual smoke check (also do this)

Update `.env.local` to point at the ephemeral project (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), `npm run dev`, and walk through:

- Dashboard for **at least 3 different chapters** (use Super Admin → Switch Chapter)
- `/partners` Active|Prospect|Past — does each tab load?
- `/portal/forum` for a member account — agenda, parking lot, reflections all visible?
- `/admin/members` — member list loads?

You're looking for visible failures *or* the red `dbError` banner. If everything loads cleanly across multiple chapters, the migration is safe to push to real prod.

### 5. Trash the ephemeral clone

In the Supabase dashboard for the ephemeral project: **Settings → General → Pause project** (frees compute), then delete after 24h to be sure nothing is needed for follow-up.

```sh
# Re-link CLI to where it was before
[ -n "$PRIOR_LINK" ] && supabase link --project-ref "$PRIOR_LINK"
```

### 6. Now — and only now — push to real prod

```sh
supabase link --project-ref pnrbvaehjbabjckixoxt   # prod
supabase db push --linked --yes
```

Then run the smoke-test script against prod immediately:

```sh
./scripts/smoke-test-supabase.sh pnrbvaehjbabjckixoxt <prod-anon-key>
```

If anything fails post-prod-push, you have ~7 days of PITR retention to roll back to (assuming PITR is enabled — see `docs/MIGRATION_PLAYBOOK.md`).

## What this does NOT replace

- Pushing to staging first and smoke-testing there. Staging tests the *code path*; the ephemeral clone tests the *data shape*. Both matter.
- Reviewing the migration before writing it. The cheapest bug to catch is the one you don't ship.
- Sentry monitoring after the prod push. The ephemeral clone tests static state; Sentry catches the long tail of "works on first load but errors on edge case at minute 47."
