# Migration playbook

What to do when a Supabase migration goes sideways. One page. Read it before you need it.

## Before pushing a migration to prod

1. **Push to staging first.** Run `supabase db push --linked --yes` against the staging project.
2. **Smoke test the affected feature in the staging deploy.** Don't trust "the migration applied cleanly" — confirm the feature still works.
3. **Re-link to prod**, then `supabase db push --linked --yes`.
4. **Watch Sentry** for ~10 minutes after prod deploy. New errors that mention table/column names = you broke something.

## When a prod migration fails midway

Symptoms: `supabase db push` errors out mid-statement, or schema is partially applied.

1. **Don't panic and don't re-run.** Re-running can make it worse if the migration is non-idempotent.
2. **Check current schema state** in the Supabase SQL editor — what got applied, what didn't?
3. **Fix forward, not backward.** Write a corrective migration that brings prod to the intended state. Apply it manually via SQL editor first if needed, then add it to `supabase/migrations/` so the migration history reflects reality.
4. **Update `supabase_migrations.schema_migrations`** if rows are out of sync with what's actually in the DB. (See `project_schema_drift` memory for prior incidents.)

## When a prod migration succeeds but breaks the app

Symptoms: deploy succeeds, but Sentry lights up or users report errors.

1. **Roll back the deploy first** (Vercel → Deployments → previous → "Promote to Production"). The app instantly serves the old code against the new schema. If the schema change was additive (new column, new table), this works.
2. **If the schema change was destructive** (dropped column, renamed table, changed type), the rollback won't help — the old code expects the old schema. In that case:
   - Decide: roll the schema back, or roll the code forward?
   - **Schema rollback**: write an inverse migration. Risky if any new data has been written using the new schema.
   - **Code roll-forward**: hot-fix the broken code paths and redeploy. Usually safer.

## When data has been corrupted or wrongly deleted

PITR is **not enabled** (skipped 2026-04-26 — daily backups deemed sufficient for current scale).

1. **Daily backup restore** is the only option. Supabase → Project → Database → Backups.
2. Restore creates a *new* project — you do not get an in-place restore on daily backups. You'll need to extract the affected rows/tables and re-import to prod manually.
3. Up to 24 hours of data may be lost. If a particular app crosses a "data-per-hour-is-precious" threshold, revisit PITR for that project ($100/mo for 7-day second-granularity).

## Communication

- If prod is down or degraded for >5 min, post in the relevant channel before the customer asks.
- Don't quietly ship the fix and hope nobody noticed. Customers trust transparent more than they trust perfect.

## After every incident

Add a one-liner to the relevant project memory or to this playbook so the next incident has more context, not less.
