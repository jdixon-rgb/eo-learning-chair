# Migration playbook

What to do when a Supabase migration goes sideways. One page. Read it before you need it.

## After every prod deploy: run the post-deploy check

```sh
./scripts/post-deploy-check.sh <prod-anon-key>
```

This is the pilot's-checklist equivalent for shipping code/schema to prod. It runs the automated verifications (repo state, migration sync, app liveness, REST read paths) and prints a single-page status report ending in `DEPLOY HEALTHY` / `DEPLOY HEALTHY (with warnings)` / `DEPLOY UNHEALTHY`. Anything other than green-or-warnings means stop and investigate before considering the deploy complete.

The script also prints a short list of manual verification cues (sidebar version stamp, dashboard render, Sentry check) that need eyes-on. Don't skip those — they catch the long tail this script can't.

The anon key argument is optional but strongly recommended; without it the REST smoke test is skipped. Get it from Supabase Dashboard → prod project → Settings → API → anon/public key. (It's safe to share — every browser hitting the prod app has it.)

## Before pushing a migration to prod

1. **Push to staging first.** Run `supabase db push --linked --yes` against the staging project.
2. **Smoke test the affected feature in the staging deploy.** Don't trust "the migration applied cleanly" — confirm the feature still works.
3. **For risky migrations** (RLS policy changes, function changes, constraint changes — anything beyond a pure additive `ADD COLUMN` / `CREATE TABLE`): test against an ephemeral prod clone first. See `docs/EPHEMERAL_CLONE_TESTING.md`. Staging tests the code; the ephemeral clone tests prod's *data shape*. Both matter.
4. **Snapshot prod's schema before pushing.** One-liner:
   ```sh
   mkdir -p snapshots && supabase db dump --linked --schema public -f "snapshots/$(date +%Y%m%d_%H%M%S)_pre_push.sql"
   ```
   Costs nothing, gives a known-good restore point if a migration goes sideways. Snapshots dir is gitignored.
5. **Re-link to prod**, then `supabase db push --linked --yes`.
6. **Smoke-test prod immediately** with the script:
   ```sh
   ./scripts/smoke-test-supabase.sh pnrbvaehjbabjckixoxt <prod-anon-key>
   ```
   If anything fails to load, treat it as a live incident. Don't wait for users to report it.
7. **Run the post-deploy checklist:**
   ```sh
   ./scripts/post-deploy-check.sh <prod-anon-key>
   ```
   This bundles the smoke test plus all the other verifications. If it ends in `DEPLOY UNHEALTHY`, treat as a live incident.
8. **Watch Sentry** for ~10 minutes after prod deploy. New errors that mention table/column names = you broke something.

## Every migration must reload PostgREST schema

Append this line to the end of every migration file:

```sql
notify pgrst, 'reload schema';
```

Without it, PostgREST's cached schema can lag behind the DB until the next config reload, causing "column does not exist" errors and `select *` returning malformed responses on tables you just modified. This is a small cost to pay (no behavior change when nothing changed) for a meaningful reduction in "migration applied but the app says X is broken" reports.

## RLS policy review checklist

When adding any new `CREATE POLICY` to an existing table, confirm:

1. **Does it coexist with the table's existing permissive policies?** Multiple permissive policies for the same operation are OR-ed *after* every USING clause is evaluated — an error in *any* policy fails the whole query, even if another would have granted access. Don't ship a policy that errors on ANY plausible row.
2. **Is every column reference null-safe?** `col = ANY(arr)` where `arr` may be NULL evaluates to NULL (fine), but `ANY(arr)` where `arr` is missing entirely or contains NULL elements can throw on certain Postgres configs. Coalesce arrays to `'{}'::type[]` before comparison if there's any doubt.
3. **Does it work against prod-shaped data, not just staging's smaller / synthetic dataset?** If staging doesn't have rows that exercise the policy's edge cases, the bug will surface on prod first. Test the SELECT against a representative row sample before merging.
4. **What other tables embed-select this one?** PostgREST `select=*,fk_table(*)` queries fail entirely if the embedded table errors. Today (2026-05-09) a broken events policy cascaded to budget_items + contract_checklists fetches.

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

PITR (Point-in-Time Recovery, second-granularity rollback to any point in the last 7 days) is **available** under the prod project's Pro plan but has **not been enabled** as of 2026-05-09. At 1 chapter the daily-backup-only fallback was tolerable; at 15+ invited chapters heading to 50+ it is *not* — daily granularity means a bad migration mid-day costs every active chair a full day of edits, with manual re-import being the only recovery path. **Enable PITR on the prod project before scale grows further.** Supabase Dashboard → prod project → Settings → Database → Add-ons → Point-in-Time Recovery. Cost runs ~$100/mo per project; cheap relative to one preventable multi-chapter incident.

Once PITR is enabled:

1. **Roll back the database to a specific timestamp** via Supabase Dashboard → Database → Backups → "Restore" tab. Pick a time before the corruption.
2. PITR can restore in-place to the same project (unlike daily-backup restore which creates a new project).
3. Anything written *after* the restore point is lost. So the moment something is found broken, lock down writes (or just communicate with chairs to hold off) before restoring.

Until PITR is enabled, fall back to daily backups:

1. **Daily backup restore.** Supabase → Project → Database → Backups.
2. Restore creates a *new* project — you do not get an in-place restore on daily backups. You'll need to extract the affected rows/tables and re-import to prod manually.
3. Up to 24 hours of data may be lost across every chapter.

## Communication

- If prod is down or degraded for >5 min, post in the relevant channel before the customer asks.
- Don't quietly ship the fix and hope nobody noticed. Customers trust transparent more than they trust perfect.

## After every incident

Add a one-liner to the relevant project memory or to this playbook so the next incident has more context, not less.
