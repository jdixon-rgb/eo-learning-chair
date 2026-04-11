# Archived migrations

These 5 migration files are **already applied in production** but have been
moved out of `supabase/migrations/` because their version prefixes collide
with sibling files in the same directory.

## Why the move was necessary

Several migrations in this repo ended up sharing a numeric prefix (e.g., two
different `024_*.sql` files were authored in parallel). Postgres's
`schema_migrations` table keys on the version prefix alone, so only one file
per prefix can be "tracked" by the Supabase CLI at a time. The others became
ghosts — locally present, remotely unmatched — which blocked `supabase db push`
from being used for new migrations.

Moving the ghost files out of `supabase/migrations/` lets the CLI see a clean,
collision-free history and makes `supabase db push` the working path for all
future schema changes.

## Files in here

| File | Collides with | Applied via |
|---|---|---|
| `008_staff_invite_rpc.sql` | `008_contract_ai_items.sql` | Supabase Studio SQL Editor |
| `018_forum_roles_and_home.sql` | `018_fiscal_year_columns.sql` | Supabase Studio SQL Editor |
| `024_vendors.sql` | `024_mentors.sql` | Supabase Studio SQL Editor |
| `025_forum_agendas.sql` | `025_event_sap_contacts.sql` | Supabase Studio SQL Editor |
| `027_forum_document_uploads.sql` | `027_forum_constitution.sql` | Supabase Studio SQL Editor |

These files are preserved for historical reference and for the case described
below.

## If you ever rebuild the database from scratch

The "live" database (as of the move) already contains every object these files
create, so normal day-to-day work needs nothing from this folder. **But** if
you bring up a fresh Supabase project and try to replay the migration history
via `supabase db push`, the CLI will skip this folder and you'll be missing
those 5 migrations' changes.

For a from-scratch rebuild:

1. Let `supabase db push` apply everything in `supabase/migrations/`.
2. Then manually run each file in this folder via the SQL Editor (or `psql`),
   in alphabetical order.

Do **not** move these files back into `supabase/migrations/` — it will break
CLI tracking again.

## Future migrations: avoid the collision

When you add a new migration file, make sure its numeric prefix is strictly
greater than every prefix in both `supabase/migrations/` **and**
`supabase/migrations_archive/`. `ls supabase/migrations/ | tail -1` is the
fastest check.
