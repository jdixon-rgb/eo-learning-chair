# EO Learning Chair — Changelog

Version source of truth: `src/lib/version.js`
Displayed in the app sidebar footer.

---

## Version Numbering

**Format:** `MAJOR.MINOR.PATCH`

| Segment | When to bump | How |
|---------|-------------|-----|
| PATCH | Bug fixes, small tweaks | Manual bump in `src/lib/version.js` |
| MINOR | New feature or notable change | Manual bump in `src/lib/version.js` |
| MAJOR | Breaking change or milestone release | Manual bump in `src/lib/version.js` |

---

## v1.90.1 — 2026-05-08

### Fix: Hide Coordinator nav item from SAP Chair

The SAP Chair surface no longer shows the **Coordinator** link under
the Admin section in the left-hand sidebar. Other admin permissions
for the SAP Chair are unchanged.

---

## v1.90.0 — 2026-05-07

### Feature: Send Speaker Payment Package to Executive Director

Learning chairs can now email a speaker's contract, W-9, and key
payment terms (deposit, final payment, due dates, payment notes)
directly to the chapter's Executive Director from the speaker card.
The email body summarizes the terms inline so the ED doesn't have to
open the PDFs to find the deposit amount or due date.

**What's new:**
- New "Send payment package to ED" button at the top of the Speaker
  Documents section in the speaker dialog (visible once a contract or
  W-9 has been uploaded).
- A modal collects recipient (pre-filled from the chapter's new
  *Executive Director Email* setting), optional CC, optional note, and
  the event context for the subject line.
- New Payment Terms section on the speaker dialog (deposit, deposit
  due date, final payment, final due date, free-form payment notes).
- Audit display under the Documents header: "Last sent {date} to
  {email}" once a package has been sent — supports re-sends.
- New Settings → Chapter Configuration field: *Executive Director
  Email* (default recipient).

**Required deploy step:** This feature depends on Resend. Set these
two Vercel env vars (Production and Preview) before the feature can
send mail:

- `RESEND_API_KEY` — from Resend → API Keys
- `RESEND_FROM_EMAIL` — a verified sender, e.g. `OurChapter OS <noreply@ourchapteros.com>`

Until those are set the API endpoint returns a 500 with a clear
"Server misconfigured" message and the modal surfaces it.

**Schema:** Migration `077_speaker_payment_package.sql` adds
`chapters.executive_director_email` and several columns on
`speaker_pipeline` (`deposit_amount`, `deposit_due_date`,
`final_payment_amount`, `final_payment_due_date`,
`payment_terms_notes`, `ed_package_sent_at`, `ed_package_sent_to`).

Files: `supabase/migrations/077_speaker_payment_package.sql`,
`api/speakers/send-payment-package.js`,
`src/components/SendPaymentPackageDialog.jsx`,
`src/pages/SpeakersPage.jsx`,
`src/pages/SettingsPage.jsx`.

---

## v1.89.5 — 2026-05-06

### Fix: "Set Primary" on event speakers no longer silently no-ops

Clicking "Set Primary" on a candidate speaker would briefly highlight
them as primary and then revert. Cause: when the chosen speaker's id
existed in local state but not on the server (an orphan from the
earlier `addSpeaker` race fixed in 1.89.4), `updateEvent` caught the
FK violation and silently retried with `speaker_id: null` — making it
look like nothing happened.

Now the FK error reverts only the failed field to its prior value
(rather than nulling it) and surfaces a clear banner: *"Couldn't
update speaker — that record isn't on the server yet. Please refresh
the page and try again."* A page refresh re-hydrates from the server
and clears the stale local row.

Files: `src/lib/store.js`

---

## v1.89.4 — 2026-05-06

### Fix: speaker_pipeline FK violation when deleting a freshly-added duplicate

Adding a speaker and quickly deleting it (e.g. removing a duplicate)
produced a "Save failed (insert:speaker_pipeline) … violates foreign
key constraint" banner. Cause: `addSpeaker` awaited the `speakers`
insert but fired the `speaker_pipeline` insert without awaiting, and
the form's submit handler didn't await `addSpeaker` either — so a
delete could land at Supabase between the two inserts and the trailing
pipeline insert hit a missing speaker.

Now both inserts are awaited (and the form stays open until they
complete), failed creates roll back local state, and the redundant
explicit pipeline-row deletes in `deleteSpeaker` are removed in favor
of the existing `ON DELETE CASCADE` FK.

Files: `src/lib/store.js`, `src/pages/SpeakersPage.jsx`

---

## v1.89.3 — 2026-05-05

### Fix: Speaker contract / W-9 uploads accept any filename

Some speaker documents (e.g. agency-supplied contracts) couldn't be
uploaded — the file picker would close and nothing happened, with no
error shown. Cause: the storage path used the raw filename, which
Supabase Storage rejects when it contains non-ASCII characters,
em-dashes, smart quotes, `#`, `&`, etc.

Now the storage key is sanitized (the original filename is still kept
and shown in the UI), a timestamp prefix prevents collisions on
re-upload, and any failure surfaces a visible error instead of
silently doing nothing.

Files: `src/pages/SpeakersPage.jsx`

---

## v1.89.2 — 2026-04-30

### Fix: Lifeline photo uploads — "Bucket not found" error

After 1.89.1 fixed the storage RLS, uploads still failed with a
"Bucket not found" 404 from the Supabase Storage service. Cause:
RLS is enabled on `storage.buckets` in this project but no SELECT
policy was ever defined, so authenticated users couldn't even see
the bucket row to upload into.

Migration `076` adds a SELECT policy on `storage.buckets` granting
authenticated users visibility of the `lifeline-photos` bucket only.
Object-level access stays gated by the per-folder `storage.objects`
policies from migration 075 — only the owning user can read or write
under their own auth-uid folder.

---

## v1.89.1 — 2026-04-30

### Fix: Lifeline event photos now persist (storage upload was silently failing)

The 1.89.0 release uploaded photos to a path scoped by `member_id` and
guarded by a storage RLS policy that called `current_chapter_member_id()`.
That SECURITY DEFINER function doesn't behave reliably from inside the
storage RLS evaluation context, so every upload was being rejected and
the form was swallowing the error before the user saw it. The image
visible right after save was the local file preview — nothing actually
landed in the bucket or the row.

- New migration `075` rewrites the storage policies to use the canonical
  Supabase pattern: scope by `auth.uid()`, with `auth.uid()` as the
  first folder of every object key.
- The client now builds paths as `{auth.uid()}/{event_id}/{filename}`
  and passes `userId` (auth.uid()) to `setLifeEventPhoto`.
- Photo upload errors are no longer swallowed — they stay on screen so
  the user can retry without losing their picked file, and full error
  details are logged to the console for triage.

Privacy is unchanged: only the owning user can read or write under
their own auth-uid folder, and `life_events` row-level RLS continues
to ensure a photo can only be attached to an event the user owns.

---

## v1.89.0 — 2026-04-30

### Feature: Photo upload for Lifeline events

Members can now attach a photo to each event on their Lifeline. The
photo appears as a thumbnail on the event card in the All Events list
and in full size inside the Event Details modal (click to enlarge).

- Add / replace / remove a photo from the Add Event and Edit Event form
  (JPEG / PNG / WebP / GIF, 5 MB max).
- Photos are stored in a new private `lifeline-photos` Supabase Storage
  bucket. Storage RLS scopes access by `member_id` folder so only the
  owning member can read or write their own files — same privacy posture
  as the rest of the Lifeline module.
- New columns on `life_events`: `photo_storage_path`, `photo_file_name`.

Migration: `074_lifeline_event_photos.sql`.

---

## v1.88.5 — 2026-04-29

### Fix: Restore `text-white` on solid-color buttons broken by v1.88.4 sweep

The 1.88.4 sweep over-converted: it turned `text-white` into
`text-foreground` everywhere, but on solid dark accent backgrounds
(`bg-primary`, `bg-warm`, `bg-red-600/80`) `text-white` is correct —
those buttons want light text on a dark surface. After the sweep
those buttons rendered dark text on dark, invisible.

Reverted 7 occurrences:

- ReflectionsPage: "Clear all" (`bg-red-600/80`), Save (`bg-primary/90`),
  Declare to parking lot (`bg-warm/90`), Add to parking lot
  (`bg-primary`), and the two editor save buttons (`bg-primary` ×2).
- ScaleQuestion: the active/selected scale button (`bg-primary`).

Light text on solid dark accent ≠ over-conversion target. Lesson for
future sweeps: only swap `text-white` → `text-foreground` where the
parent surface is light. Solid `bg-primary` / `bg-warm` /
`bg-{red,emerald,blue}-{600+}` keep `text-white`.

---

## v1.88.4 — 2026-04-29

### Fix: Sweep remaining light-on-light contrast bugs across the app

Continuation of v1.88.3's Reflections fix. Searched the entire frontend
for places using dark-theme color utilities (`text-white`, `bg-white/X`,
`border-white/X`, `bg-ink`, hardcoded dark hex backgrounds) on top of
the light-themed Member Portal layout, and converted them to the
project's light-theme tokens.

**Line-level fixes:**

- `MemberNotificationsPage.jsx:149` — unread notification title was
  `text-white` on a light card → `text-foreground`.
- `ForumHomePage.jsx:1538` — minutes input field had `text-white` on
  `bg-muted/30` → `text-foreground`.
- `ForumHomePage.jsx:1650` — parking lot total cell had `text-white`
  on default light table cell → `text-foreground`.
- `ForumHomePage.jsx:1700` — author select had `text-white` on
  `bg-muted/30` → `text-foreground`.
- `ForumHomePage.jsx` (sweep) — replaced all `bg-ink` option backgrounds
  with `bg-card` for consistency (though browsers ignore option styling).
- `NavigatorBroadcastCard.jsx:148` — broadcast note textarea had
  `text-white placeholder-white/30` → `text-foreground placeholder:text-muted-foreground/60`.

**Full-file conversions** (52 class swaps total):

- `src/components/survey/MultiSelectQuestion.jsx`
- `src/components/survey/OpenTextQuestion.jsx`
- `src/components/survey/RankingQuestion.jsx`
- `src/components/survey/ScaleQuestion.jsx`
- `src/components/survey/SingleSelectQuestion.jsx`

All five were originally written assuming a dark survey overlay but
render inside the light-themed `SurveyPage` in the Member Portal, so
question prompts, option labels, and rating widgets were invisible or
near-invisible. Same conversion mapping as v1.88.3 (text-foreground,
text-muted-foreground, bg-muted, border-border, etc.).

Excluded from the sweep on purpose:
- `LifelinePage.jsx` — has its own intentional `lifeline-paper` /
  `lifeline-ink` paper-themed surface.
- `SAPPortalLayout` and its pages — separate themed surface.

---

## v1.88.3 — 2026-04-29

### Fix: Reflections page — dark text on light background

`ReflectionsPage.jsx` was originally written assuming a dark surface,
so every text/border/background utility was on the white-on-dark scale
(`text-white`, `bg-white/5`, `border-white/10`, etc.). The Member
Portal layout is light-themed (cream `bg-background`), so the page
rendered white-on-cream and was effectively unreadable for any
member opening Reflections in production. The Parking Lot tab's
filter dropdown had the same issue — selected text invisible on the
closed select.

Converted all dark-theme color utilities in `ReflectionsPage.jsx` to
the project's light-theme tokens:

- `text-white` / `text-white/90` / `text-white/80` → `text-foreground`
- `text-white/70` → `text-foreground/80`
- `text-white/60` / `text-white/50` → `text-muted-foreground`
- `text-white/40-20` → `text-muted-foreground/{50-80}`
- `bg-white/{5,[0.03],[0.02]}` → `bg-muted/{20,30,40}`
- `border-white/{5,10}` → `border-border{,/60}`
- `placeholder-white/30` → `placeholder:text-muted-foreground/60`
- Modal background `bg-[#0f1724]` → `bg-card`
- Select option background `bg-ink` → `bg-card`

No layout or behavior changes — pure styling swap.

---

## v1.88.2 — 2026-04-28

### Fix: Hide "Use phone instead" toggle on Login until SMS works

Twilio toll-free verification is still in review, so the SMS-OTP path
sends a code that never arrives — users on the phone tab dead-end on
the verify-code screen waiting for an SMS that won't show. Hidden the
toggle behind a `PHONE_OTP_ENABLED` const in `LoginPage.jsx` (set to
`false`); flip it back to `true` once SMS delivery is confirmed in
prod. Email magic-link, Google, and Microsoft remain visible and are
the only sign-in paths users are pointed at.

---

## v1.88.1 — 2026-04-28

### Fix: Stale `estimated_amount` references on `budget_items`

Migration 010 renamed `budget_items.estimated_amount` to `budget_amount`,
but four code references slipped through:

- `EventDetailPage.jsx` (×2) — `syncSpeakerFeeBudget` was writing
  `estimated_amount` when a primary speaker was set on an event.
  Surfaced as a yellow toast: "Save failed (update:budget_items):
  Could not find the 'estimated_amount' column of 'budget_items' in
  the schema cache".
- `EventsPage.jsx` and `CalendarPage.jsx` — read-side aggregations of
  `b.estimated_amount` silently summed to 0, so per-event budget rolls
  on the events list and calendar showed $0 even when budget lines
  existed.

All four switched to `budget_amount`. Read paths now compute correctly;
the speaker-fee sync no longer fails silently.

---

## v1.88.0 — 2026-04-27

### Feature: Public Speaker Library

A new cross-chapter, shared catalog of speakers — a TripAdvisor-style
library for EO Learning Chairs. Seeded with 92 speakers from the EO
Global Speakers Academy database; grown by Learning Chairs over time
through open contribution and reviews.

**Surfaces (sidebar nav under Learning Chair + Regional Learning
Chair Expert):**

- `/library/speakers` — list with search (name / topic), filters
  (EO chapter, class year, minimum rating, honorarium range,
  completeness flags), and sort (name, rating, review count, recently
  added, recently updated).
- `/library/speakers/:id` — detail view with photo, bio, honorarium,
  travel cost (with notes), reviews from other Learning Chairs, and
  a collapsible revision history.

**Capabilities:**

- **View**: Learning Chair, Learning Chair Elect, Regional Learning
  Chair Expert, Super Admin, President-style roles, EDs, Coordinators.
- **Add a new speaker**: any role above (open contribution model,
  per JSD's spec).
- **Edit existing speaker**: any role above. Every edit is recorded
  in `public_speaker_revisions` via a Postgres trigger — who edited,
  what fields changed, when. Visible in the detail page's collapsible
  Revision History panel.
- **Add review (1–5 stars + free-text body)**: same role set. One
  review per Learning Chair per speaker (uniquely keyed); editable
  and deletable by the author.
- **Add to my pipeline**: Learning Chair, Learning Chair Elect, EDs,
  Coordinators, Super Admin. Imports a copy into the active chapter's
  `speakers` table with `imported_from_library_id` set so we keep the
  lineage. The library row stays untouched; the chapter copy evolves
  independently (pipeline stage, fees, contract, etc.). Regional
  experts cannot import (they have no chapter pipeline).

**Schema (migration 072):**

- `public_speakers` — shared catalog, no chapter_id. Fields include
  name, topic, eo_chapter, class_year, source, source_url, bio,
  photo_url, honorarium_amount/notes, travel_amount/notes.
- `public_speaker_reviews` — rating + body, attributed to user +
  chapter. Reviewer chapter auto-stamped from the reviewer's profile.
- `public_speaker_revisions` — audit log populated by trigger on
  `public_speakers` UPDATE. Stores a JSONB diff of changed fields
  with the editor's user id and chapter.
- `speakers.imported_from_library_id` — new nullable FK on chapter
  pipeline rows for lineage.

**Seed (migration 073):** loads the 92 GSA speakers from
`eo_global_speakers_academy_database.xlsx` (committed alongside).
Idempotent via a `(source, lower(name))` unique index, so a future
GSA refresh can be added as a follow-up migration without colliding.

**RLS:** SELECT is open to authenticated; INSERT/UPDATE on speakers
gated by a `can_edit_speaker_library()` SQL helper that mirrors the
JS permission set; reviewers can only CRUD their own reviews;
revisions are read-only to clients (writes happen via the trigger).

Migrations 072 and 073 applied to staging Supabase 2026-04-27.
Promote to prod after staging verification.

---

## v1.87.1 — 2026-04-27

### Fix: Staff Add silently failed because upsert_staff_invite RPC was missing

The Add Staff form on the Staff page POSTed to `rpc/upsert_staff_invite`,
which returned `PGRST202 — Could not find the function ... in the schema
cache`. The RPC was originally defined in `008_staff_invite_rpc.sql`,
but that file collided on version prefix with another 008 migration and
got moved to `supabase/migrations_archive/`. The archived migration was
never replayed against either Supabase project, so the function did not
exist in staging or prod.

Compounding the silence: `upsertStaffInvite` in `boardStore.js` only
logged the error to `console.error`, so the page's UI showed a green
"Added <email>." confirmation while no row was actually inserted.
Justice Butler appeared in the table because someone added her manually
via the Studio SQL editor at some point; nothing else has been added
via the form since the function went missing.

Two fixes:

- **Migration 071** restores `public.upsert_staff_invite(p_email,
  p_full_name, p_role, p_chapter_id)` with the same body as the
  archived 008 migration. Pushed to staging and prod 2026-04-27.
- **`upsertStaffInvite` now throws on error** instead of silently
  console-logging. The page already wraps the call in try/catch and
  surfaces `err.message` — so any future RPC failure (RLS, missing
  function, constraint violation) will show up in the form's status
  line instead of looking like a successful add.

---

## v1.87.0 — 2026-04-26

### Feature: Super-admin surface to invite Regional Learning Chair Experts

Adds a `Regional Experts` page under Super Admin (sidebar nav item) for
inviting cross-chapter oversight roles — today the Regional Learning
Chair Expert role, scaffolded for additional regional roles in future.

The form takes name, email, and region (with autocomplete suggestions
drawn from canonical EO_REGIONS plus regions already tagged on chapters,
so labels stay consistent). Saving inserts into `member_invites` with
`chapter_id = null` and the chosen region. Once the invitee signs in,
the existing `handle_new_user` trigger creates a profile with the
correct role + region, which routes them to `RegionalLearningDashboard`.

The list view shows status (Invited vs Active), the chosen region, and
delete + generate-magic-link actions (latter is super_admin only,
matching the StaffManagementPage pattern).

### Fix: handle_new_user dropped region copy in migration 069

Migration 066 added the `region` column copy from invite to profile.
Migration 069 then rewrote `handle_new_user` to add the wildcard-domain
fallback path — but the rewrite silently dropped the `region` column
from the profile insert, so any regional expert created since 069 would
sign in with `profile.region = NULL` and see the empty-state Regional
Dashboard forever.

Migration 070 rebuilds `handle_new_user` combining both: the three
lookup passes from 069 (exact email, phone, domain wildcard), with
the `region` copy from 066 restored in the matched-invite branch.

---

## v1.86.1 — 2026-04-26

### Fix: Wrap React tree in Sentry.ErrorBoundary

Verified Sentry is initialized correctly on staging (DSN baked into
bundle, `environment: "staging"` tag set, test envelope accepted by
`ingest.us.sentry.io`). Added a `Sentry.ErrorBoundary` around `<App />`
in `src/main.jsx` so React render-time crashes also reach Sentry —
previously they were swallowed by React's default handling and never
hit `window.onerror`, which is what Sentry's auto-instrumentation
listens to.

---

## v1.86.0 — 2026-04-26

### Feature: Test Accounts legend on super-admin dashboard (staging/dev only)

Adds a yellow callout panel on the Super Admin dashboard that lists
seeded test invites (one per chair role, all routing to the dev's
inbox via Gmail+aliases) with a one-click "Send Magic Link" button
per role.

The panel is gated three ways:
- Only renders when `VITE_APP_ENV` is `staging` or `development`
  (production never sees it, even for super_admin).
- Only queries `member_invites` rows matching the test-account
  email pattern, so the panel is empty if the seed isn't applied.
- Only the super-admin surface mounts the component.

Companion to `supabase/seed_saps.sql` and `supabase/seed.sql` —
together they give a fresh staging environment realistic data plus
multi-role login coverage in ~2 minutes of setup.

---

## v1.85.1 — 2026-04-25

### Fix: own-chapter shared speakers now visible in the Shared Library

When a chapter toggled a speaker to "Globally Shared," the speaker
correctly persisted with `share_scope='global'` — but the Shared
Library tab filtered it out via `.neq('chapter_id', activeChapterId)`.
The original intent was "don't show speakers you can't fork," but the
side effect was that users had no way to confirm their share was live
or manage their contributions from this view, making it look broken.

**Behavior now:**
- Own-chapter shared speakers appear in the Shared Library alongside
  other chapters' contributions.
- They're tagged "Your chapter" instead of the source chapter name.
- The fork button is replaced with a disabled "Your contribution —
  visible to other chapters" pill so the action is unambiguous.

Also removed the hardcoded `$` prefix from fee-range display in the
Shared Library cards (held over from before currency support was
added). The amount is shown as `30K–50K` for now; surfacing the source
chapter's currency in cross-chapter views needs a denormalization on
the speaker row and is tracked separately.

---

## v1.85.0 — 2026-04-25

### Visual: dollar-sign icon → wallet icon, app-wide

The dollar-sign (`$`) icon was used everywhere as the "money" /
"budget" glyph — sidebar nav, dashboard cards, event cost badges,
budget tables, scenarios, settings. It read as US-centric next to
chapters whose budgets are denominated in EUR, INR, KES, PAB, etc.

Swapped to lucide's `Wallet` across all 11 files that imported
`DollarSign`. Currency-agnostic, reads instantly as "budget", no
flag attached. Currency formatting (the actual numbers) is
unchanged — that already respects each chapter's `currency` setting
via `formatCurrency()`.

---

## v1.84.2 — 2026-04-25

### Added: Panama currency and timezone

- Currency: **PAB** — Panamanian Balboa (pegged 1:1 with USD; pick
  PAB for chapters that book in Balboa, USD if they keep books in
  US dollars).
- Timezone: **America/Panama** (EST, no DST).

---

## v1.84.1 — 2026-04-25

### Hotfix: white screen of death on super-admin dashboard

`Map` was imported from `lucide-react` (the icon) without an alias,
which shadowed the global `Map` constructor. The very next line —
`new Map()` in the regions-in-use memo — then tried to instantiate a
React component, failing with `wh is not a constructor` after
minification and white-screening the entire app.

Aliased the import to `MapIcon`. Also reverted the `chapter.jsx`
refactor to a pure additive `refreshChapters` (the original
`useEffect` is untouched) so the on-mount load behavior is exactly
what it was before v1.84.0.

---

## v1.84.0 — 2026-04-25

### Feature: Super-admin can rename/merge regions; broader currency & timezone coverage

**Region management on the Super-Admin Dashboard:**
A new collapsible "Regions" card lists every distinct region currently
in use across chapters, with chapter counts. Click "Rename" on any
row to edit inline — typing a new name and saving runs a bulk
`UPDATE chapters SET region = <new> WHERE region = <old>`. Typing
an *existing* region name effectively merges the two. The autocomplete
draws from canonical `EO_REGIONS` plus values already in the DB.

This fixes the "U.S.W vs U.S. East vs U.S. West" inconsistency
without needing a migration or a SQL console.

**ChapterProvider** now exposes `refreshChapters()` so the dashboard
can re-pull after a rename without a full page reload. The active
chapter selection is preserved across refreshes (previously the
provider would reset to the first chapter on every effect run, which
would have yanked a super-admin out of context after every save).

**Currencies added:** PHP (Philippine Peso), KES (Kenyan Shilling),
INR (Indian Rupee), NZD (New Zealand Dollar). Greece uses EUR
(already supported).

**Timezones added:** Europe/Athens (Greece), Africa/Nairobi (Kenya),
Asia/Manila (Philippines), Asia/Kolkata (New Delhi), Pacific/Auckland
(New Zealand).

---

## v1.82.0 — 2026-04-24

### Feature: Regional Learning Chair Expert can drill into chapters (read-only)

Clicking any chapter card on the Regional Learning Dashboard now
takes the regional expert *into* that chapter's Learning Chair
surfaces — Year Arc, Speakers, Events, Venues, Budget, SAPs,
Survey Results — with full read access and zero write access.

**How the scoping works:**
- `ChapterProvider` now treats regional roles the same as super-admin
  for chapter-switching, but filters `allChapters` to those tagged
  with the user's (or impersonated) region. The sidebar Chapter
  Switcher appears automatically and only lists in-region chapters.
- Clicking a card on the Regional Dashboard calls `setActiveChapterId`
  then navigates to `/calendar` (Year Arc).
- `CHAIR_ROLE_CONFIGS.regional_learning_chair_expert` now includes
  the full set of Learning Chair nav items. Permission-gated items
  (SAPs, Venues, Budget, Survey Results) resolve against her role.

**Read-only enforcement:**
- Added to all `canView*` permissions; never to any `canEdit*` list,
  so every edit/create/delete button is hidden by the existing
  `hasPermission(...)` checks throughout the app.
- New `canViewSpeakerFees` permission gates `fee_estimated` /
  `fee_actual` columns on SpeakersPage. She sees the public
  `fee_range` but "Private" + lock icon in place of negotiated
  amounts.
- Explicitly excluded from `PORTAL_ROLES` so forum, reflections,
  and lifeline routes remain inaccessible.

**Read-only banner:** thin primary-tinted strip below the TopBar
when a regional role is viewing a chapter. Names the chapter and
the role, reminds her editing is disabled and member-private areas
are not accessible.

---

## v1.81.1 — 2026-04-24

### Feature: super-admin can impersonate Regional Learning Chair Expert by region

Mirrors the SAP contact impersonation pattern. When a super-admin
switches into `regional_learning_chair_expert` via the sidebar's
Switch Role dropdown, a second dropdown appears labeled "as region"
listing every region currently in use across chapters. Picking one
makes the Regional Learning Dashboard render as if you were the
expert for that region.

New `effectiveRegion` in the auth context — when impersonating,
it's the picked region; otherwise it's `profile.region`. Dashboards
should read this, not `profile.region` directly.

Persists in localStorage under `eo-view-as-region`; cleared when
switching back to the super-admin's own role.

---

## v1.81.0 — 2026-04-24

### Feature: chair activity signals + region-grouped dashboard + freeform region

Three linked upgrades so the Regional Learning Chair Expert demo
feels *alive*, not static.

**1. Chair activity signals.** New `ActivityIndicator` component —
colored dot (green <7d, amber 7–30d, gray >30d or never) plus a
relative-time label ("2h ago", "yesterday", "3mo ago", "never
signed in"). Appears on:
- Super Admin Dashboard chapter cards (one line per chair role)
- Regional Learning Dashboard chapter cards (next to the LC)
- Chapter Config Members table (replaced the generic "Active" badge)

Backed by a new `profiles.last_sign_in_at` column synced from
`auth.users` via a trigger (migration 067). Historical data
backfilled so signals are accurate immediately.

**2. Region-grouped Super Admin Dashboard.** Chapters now cluster
under a region header, alphabetical within each region. Untagged
chapters fall into a "No region set" group at the bottom so it's
obvious which ones still need tagging. Each chapter card also now
lists its chairs (up to 7 role types) with live activity dots and
a chair count tile beside FY start.

**3. Freeform region entry.** The Region field on ChapterConfigPage
is now an input + HTML `<datalist>` combobox. Suggestions come from
a union of `EO_REGIONS` + `DISTINCT chapters.region` fetched live
from the DB. Type any new region name (e.g. "U.S. Central") and
save — next time you edit a chapter, that region appears as a
suggestion. No code change needed to grow the list.

---

## v1.80.0 — 2026-04-24

### Feature: Regional Learning Chair Expert

First regional-scoped role on the platform. A Regional Learning Chair
Expert oversees every chapter-level Learning Chair in a given region
(e.g. "U.S. West"). She has no `chapter_id` — she spans multiple —
and her dashboard aggregates across every chapter tagged with her
region.

**What she sees** at `/regional/learning`:
- One card per chapter in her region
- Each card shows: chapter name + theme, the Learning Chair's name
  and email, upcoming events (next 3), and total speakers in pipeline
- Empty state preview when no chapters are tagged yet — shows her
  what the surface will look like once chapters come online, so she
  can evangelize the feature even as the first adopter

**Data layer (migration 066):**
- `chapters.region`, `profiles.region`, `member_invites.region`
  (all text, nullable) — tag any chapter with a region; regional-
  role profiles carry their own region
- `regional_learning_chair_expert` added to the role check
  constraints on both profiles and member_invites
- `handle_new_user` updated to carry `invite.region` into the new
  profile alongside `chapter_id`
- Helper function `is_regional_learning_chair_expert_for(chapter_id)`
  for future cross-chapter RLS (not wired into existing policies
  this pass — existing SELECT permissiveness already covers V1)

**Frontend plumbing:**
- New `CHAIR_ROLE_CONFIGS` entry with homePath `/regional/learning`
  so `ChairHome` routes her correctly after sign-in
- New `REGIONAL_ROLES` permissions list; added to
  `ADMIN_LAYOUT_ROLES` so she gets the admin sidebar
- Region dropdown added to ChapterConfigPage (EO_REGIONS constant
  starts with "U.S. West" and "Other" — add entries as the real
  EO region list surfaces)

Only Learning-side for V1. Regional roles for Engagement, President,
etc. can follow the same pattern when needed.

---

## v1.79.0 — 2026-04-24

### Feature: Welcome guide for brand-new chapters

First chair to sign into a freshly created chapter used to land on an
empty dashboard with no orientation — events empty, speakers empty,
members empty, with no signal that this was expected for a new
chapter. Felt broken.

Now: a `ChapterWelcomeGuide` panel appears at the top of the
role-specific dashboard when the chapter has no data yet. Panel
includes:

- Welcome headline with chapter name
- Short explainer framing the blank state as expected
- 3–5 role-specific quick-win action cards (icons + copy + links to
  the surfaces where the first chair would seed data)
- Dismissible via an X; choice persists per-chapter in localStorage
  so it doesn't nag once the chair is oriented

Wired into: Learning Chair `DashboardPage`, `PresidentDashboard`,
`EngagementDashboard`. Each surface picks its own "empty chapter"
signal and passes role-appropriate actions into the component.

### Supabase migration 064: restore super_admin in is_admin()

Migration 045 was supposed to add `super_admin` to the `is_admin()`
Postgres function but didn't stick in production — same schema-drift
pattern as 035/037–040. Result: every RLS policy using `is_admin()`
silently rejected super-admin reads, making freshly-created invites
invisible on the chapter config page. Migration 064 re-declares the
function with super_admin included; idempotent, safe to re-run.

### Supabase migration 065: restore chapter_id in handle_new_user

Migration 060's phone-OTP rewrite of `handle_new_user` dropped the
`chapter_id` column from the INSERT into profiles. Migration 061
inherited the omission. Result: a new user matched to an invite got
a profile with `chapter_id = NULL`, which meant they never appeared
in the chapter's Members table. Migration 065 restores the column
and backfills orphaned profiles whose invite had a chapter_id.

---

## v1.78.1 — 2026-04-24

### Fix: OAuth error messages were provider-specific

`humanizeOAuthError` in AuthCallbackPage hardcoded "Google" in its
fallback messages, which made a Microsoft sign-in failure surface
as "Google sign-in didn't complete" — misleading when you just
clicked the Microsoft button. Made the copy provider-neutral.

---

## v1.78.0 — 2026-04-24

### Feature: Microsoft OAuth sign-in

Adds "Continue with Microsoft" alongside "Continue with Google" on
the login page. Same motivation: corporate email gateways drop
magic-link emails, and Microsoft 365 is the other half of the
business-user world we weren't covering. Supabase's Azure provider
handles Microsoft Entra ID (work + school accounts) and personal
Microsoft accounts (Outlook, Hotmail, Live) under one button —
tenant breadth is configured on the Supabase provider, not in code.

Code lands live; button will surface a friendly "We couldn't start
Microsoft sign-in" message until the Azure app is registered and
the Supabase Azure provider is enabled. No user impact in the
interim because sign-in is still possible via Google, magic link,
or SMS.

### Infra setup required (out of band)

- Register a multi-tenant app in the Azure portal under a stable
  account (not role-based — OAuth registrations outlive roles).
- Add redirect URI `https://auth.ourchapteros.com/auth/v1/callback`.
- Enable the Azure provider in Supabase → Authentication → Providers
  with the Azure client ID + secret.

---

## v1.77.4 — 2026-04-23

### Polish: page titles in the TopBar slot, not the content body

Ten chair / admin / super-admin pages were rendering their
`<h1>` + subtitle in the content area instead of pushing them into
the TopBar's white header slot via the `PageHeader` component. Now
they match the pattern Learning Chair / Board pages have been using
all along: title + subtitle up in the white strip on desktop,
in-body on mobile (which the PageHeader component handles itself).

Pages cleaned up:

- `super-admin/SuperAdminDashboard` (the page that surfaced this)
- `super-admin/AnalyticsPage`
- `super-admin/ChapterConfigPage`
- `admin/NotificationComposePage`
- `board/BoardDashboardPage`
- `board/ChairReportsPage`
- `board/ForumsPage`
- `engagement/EngagementDashboard`
- `finance/FinanceDashboard`
- `president/PresidentDashboard`

Icons that used to decorate the in-body `<h1>` were dropped — the
TopBar slot is text-only by design. Unused imports pruned.

---

## v1.77.3 — 2026-04-23

### Fix: OAuth sign-in silently failing (hash race)

v1.77.1's AuthCallbackPage stripped the URL hash in a `useEffect`
under the (wrong) assumption that Supabase-JS parses the token hash
synchronously on client construction. It doesn't — v2 does it
asynchronously during its own `initialize()`. So the effect ran
first, destroyed the `#access_token=…&refresh_token=…` payload, and
Supabase had nothing to parse → no session → AuthCallbackPage's
"no session + no profile" branch fired → user bounced back to
`/login` with no error message (because `fetchProfile` never ran,
so no `oauth_rejected` was set).

Fix: delete the manual `history.replaceState`. Supabase cleans the
URL itself after it saves the session, which is what we wanted the
hash gone for in the first place.

Surfaced during the custom-domain cutover (v1.77.2) — the race was
always there, but timing on the new domain made it reliably reproduce.

---

## v1.77.2 — 2026-04-23

### Infra: Supabase custom domain (auth.ourchapteros.com)

Activated `auth.ourchapteros.com` as the Supabase project's custom
domain and retargeted `VITE_SUPABASE_URL` at it. User-visible change:
the Google OAuth consent screen now reads "Continue to
**auth.ourchapteros.com**" instead of "Continue to
**pnrbvaehjbabjckixoxt.supabase.co**" — cleaner branding, less
"what is this cryptic third party" friction for first-time sign-ins.

Backend is otherwise unchanged: same project, same database, same
auth tables. The old project-ref hostname still resolves for a grace
period, so cached bundles in users' browsers keep working.

---

## v1.77.1 — 2026-04-23

### Polish: clean Google OAuth landing

The Google OAuth round-trip previously dropped users back on "/" with
the raw Supabase token hash in the address bar
(`#access_token=eyJ…&refresh_token=…`) and the generic ProtectedRoute
spinner — it looked like debug output, not a product. Now:

- New public route `/auth/callback` receives the redirect. It scrubs
  the token hash from the URL and shows a branded "Signing you in…"
  screen with the wordmark while Supabase establishes the session.
- OAuth provider errors (`?error=access_denied`, cancellations,
  network failures) are translated into human-readable messages before
  being surfaced on the login page — no raw provider strings.
- The login page no longer passes raw Supabase error text into the
  red error box when OAuth fails to start.

Files: `src/pages/AuthCallbackPage.jsx` (new), `src/lib/auth.jsx`,
`src/App.jsx`, `src/pages/LoginPage.jsx`.

---

## v1.77.0 — 2026-04-23

### Feature: Google OAuth sign-in

Adds "Continue with Google" to the login page. Rationale: magic-link
emails get silently dropped by corporate email gateways (Melissa at
arizonaeo.com was the tipping point) and SMS-OTP is still gated on
Twilio toll-free verification. OAuth sidesteps email delivery
entirely — the user's Google / Workspace identity handles auth, so
the mail gateway is out of the loop. EO members are business owners;
most already authenticate to their domain via Google Workspace, so
"Sign in with Google" is one click and "just works".

**Allowlist safety:** magic-link and phone-OTP flows check
`is_invited_member` BEFORE sending the link/code. OAuth bypasses
that pre-check because the provider hands us a proven identity out
of band. To keep the allowlist as the single source of truth, the
check now also runs in `fetchProfile` after every sign-in — if the
signed-in user's email/phone isn't on the chapter allowlist, they're
signed out immediately and redirected to the login page with
"This account isn't on the chapter allowlist…"

Requires Supabase Auth + Google Cloud Console setup (not a code
concern — documented in the PR).

---

## v1.76.0 — 2026-04-23

### Fix: restore missing `slps` table in production

Migration 050 (Significant Life Partners table) was marked applied in
Supabase's migration tracker but the actual table, indexes, RLS, and
`is_slp_admin()` function were never created in production — part of
the known schema drift (035, 037–040, 050). Members hit
`Could not find the table 'public.slps' in the schema cache` when
trying to save partner info from their profile.

Migration 063 re-runs 050's DDL verbatim. 050 was already fully
idempotent (`create table if not exists`, `create or replace
function`, `drop policy if exists` + `create policy`), so re-running
it is safe everywhere. Production pushed via
`supabase db push --linked --yes`.

### Feature: SLPs + SAPs admin surfaces

The admin sidebar gains two new entries under Members and Staff:

- **SLPs** (`/admin/slps`): read-only list of every SLP in the
  active chapter — member, partner name, relationship, DOB,
  anniversary, kids, dietary, allergies. Admins can delete a
  record; edits happen via each member's profile (members are the
  source of truth for their own partner info).
- **SAPs** (`/partners`): links to the existing SAP Partners page,
  now exposed from the admin section as well as chair navs so it
  shows up next to the other "people data the chapter tracks"
  surfaces.

Minor version bump (`1.75.x` → `1.76.0`) for the new admin page
and the prod-schema fix.

---

## v1.75.4 — 2026-04-23

### Tweak: merge Roles into Members inside Forum

The Forum tab strip had both a **Members** view (names + email/call
affordances) and a separate **Roles** view (assign/remove forum
roles). You had to switch tabs to assign a role, then switch back to
call the person. Now it's one view: each member row shows assigned
forum roles as inline badges, and moderators see a `+ Role` button
to assign and an `×` on each badge to remove. The Call / Email
affordances are preserved. `Roles` tab is removed from the strip.

---

## v1.75.3 — 2026-04-23

### Tweak: declutter Member Portal top nav (hamburger + Lifeline moves)

Two changes to the Compass / Member Portal top bar:

- **Hamburger at all breakpoints.** The horizontal desktop nav was
  crowded — at common laptop widths the wordmark ("OurChapter OS")
  was wrapping onto two lines because the six nav items plus Admin
  link plus user name plus sign-out button were fighting for
  horizontal space. Now the top bar shows just the wordmark,
  Member badge, user name, and a menu icon; clicking the icon
  opens the full navigation panel (including Admin Dashboard and
  Sign Out).
- **Lifeline moved out of primary nav.** Lifeline now lives only
  under Forum → Tools (where it was already accessible via the
  tools grid). Rationale: Lifeline is a forum tool, not a
  top-level destination, so it doesn't earn a primary-nav slot.

---

## v1.75.2 — 2026-04-23

### Fix: replace EO-branded favicon

The previous `public/favicon.svg` was three concentric broken rings —
the EO (Entrepreneurs' Organization) globe-wireframe mark, which is
EO's trademark. Replaced with an original "OC" monogram tile in the
app's primary cerulean (#4a6d8c), mirroring the in-app Wordmark so the
browser-tab icon matches the product's own identity.

---

## v1.75.1 — 2026-04-23

### Tweak: Members and Staff admin titles render in TopBar

`MemberManagementPage` used an inline `<h1>` block (renders in the
cream content area), which broke the app's convention of surfacing
the page title + subtitle in the white TopBar strip on desktop. The
new `StaffManagementPage` had the same issue. Both now use the
shared `PageHeader` component, so `Members` / `Staff` titles and
their counts appear in the TopBar on desktop and inline on mobile
— matching every other page.

---

## v1.75.0 — 2026-04-23

### Feature: Staff admin section

New **Staff** page under admin (`/admin/staff`) alongside Members.
Staff — Executive Directors, Experience Coordinators, and other
non-member chapter employees — live in `member_invites` with a staff
app-role but never in `chapter_members`, so they were previously
invisible to the admin UI and could only be added via Settings →
Chapter Roles. The new page gives admins a direct surface:

- Lists all staff for the active chapter (from `member_invites`
  where role ∈ {`chapter_executive_director`,
  `chapter_experience_coordinator`})
- Add staff form (name, email, role) — writes via the existing
  `upsert_staff_invite` RPC
- Remove staff (deletes the whitelist row)
- Per-row **Generate sign-in link** (super_admin only) — reuses
  the existing `/api/admin/generate-magic-link` endpoint, so staff
  whose corporate email gateways drop magic-link emails can be
  unblocked out-of-band

Sidebar nav gains a **Staff** link under Members (same
`canManageMembers` gate).

Minor-version bump (`1.74.x` → `1.75.0`) because this adds a new
top-level admin surface.

---

## v1.74.6 — 2026-04-23

### Tweak: expose expected audience on Scenarios table

The Scenarios page's event table now has an **Audience** column
between Event and Speaker, rendering `event.expected_attendance` (or
`—` when unset). Gives a quick read on scenario impact — e.g. a
star-speaker slot that's also the highest-attendance event of the
year carries different weight than a small breakout. Table detail row
and Totals row colspans updated to account for the new column.

---

## v1.74.5 — 2026-04-23

### Tweak: show event time on Year Arc cards

Each event card on the Year Arc Calendar now shows the event's
time-of-day next to the date — e.g. `Monday, Aug 13, 2026 · 6:30 PM`.
Time pulled from `events.event_time` (24h `HH:MM`) and rendered via a
new `formatTime()` helper in `src/lib/utils.js`. Renders nothing when
`event_time` is null, so events without a set time keep the old
date-only line.

---

## v1.74.4 — 2026-04-23

### Tweak: link the builder attribution

`Aidan Taylor App Works` now renders as a link to
`https://AidanTaylorAppWorks.com` everywhere it appears at the bottom of
the app — the authenticated `BuiltByFooter`, the LoginPage footer, the
Settings "About the Builder" card, and the Privacy / Terms page footers.
Set via `BUILDER.url` in `src/lib/appBranding.js`; the Privacy and Terms
footers were updated to honor that field (previously rendered the company
as plain text regardless).

---

## v1.74.3 — 2026-04-20

### Tweak: surface version on the login page

The version string was previously visible only in the in-app sidebar
footer — useless when the user can't sign in (the most common moment
to need to know what version is deployed). Now rendered in the
LoginPage footer alongside the Privacy / Terms links: `Privacy · Terms · v1.74.3`.

---

## v1.74.2 — 2026-04-20

### Fix: phone-OTP "Database error saving new user"

Trigger bug introduced by 058 and not caught by 060: when a phone-only
signup arrived (`new.email` null, `new.phone` populated), the email
SELECT INTO inside `handle_new_user` was skipped, leaving the `invite`
record unassigned. The next line — `IF invite.id IS NULL` — then
raised `record "invite" is not assigned yet` (SQLSTATE 55000), which
GoTrue surfaced to the client as the generic "Database error saving
new user." The auth.users row got rolled back; nothing landed in
profiles.

Migration 061 rewrites `handle_new_user` to track lookup success with
a boolean (`invite_found`) instead of dereferencing `invite.id`, and
splits the INSERT into matched / unmatched branches so we never read
`invite.email` / `invite.role` / etc. when no SELECT INTO has run.

Verified by simulating a phone-only auth.users INSERT in a transaction:
profile lands with `email=jdixon@aidantaylor.com`, `role=super_admin`,
`phone=+16027411075` — all linked correctly from the invite row.

Migration 061.

---

## v1.74.1 — 2026-04-19

### Fix: sign-in lockout introduced by v1.74.0

Two defects in migration 058 combined to lock members out of both
email *and* phone sign-in paths:

1. **Function overload collision.** Migration 058 redefined
   `is_invited_member` with two default args. Because PostgreSQL
   determines function signatures by argument types only (defaults
   are ignored), the new `is_invited_member(text, text)` was created
   *alongside* the original `is_invited_member(text)` rather than
   replacing it. PostgREST couldn't resolve which overload to call
   when the client passed a single named arg, and the RPC failed.
   Migration 059 drops the old single-arg signature.

2. **NANP country-code mismatch.** `chapter_members.phone` stores a
   mix of 10-digit (`6027411075`) and 11-digit-with-leading-1
   (`16268402799`) values for US/Canada numbers. Migration 058's
   backfill preserved whatever was in `chapter_members` verbatim.
   But the SMS-OTP path delivers phone in E.164 (`+16027411075`),
   which digit-strips to 11 digits with a leading `1`. Comparing
   that to a 10-digit stored value failed. Migration 060 adds a
   NANP-aware normalization helper (`_normalize_phone`) that strips
   a leading `1` when the digit-only length is 11, so all US/Canada
   formats converge to the same 10-digit comparison form while
   international numbers pass through unchanged.

Verified against the super_admin account post-fix: all four of
`jdixon@aidantaylor.com` (email), `+16027411075` (E.164),
`6027411075` (10-digit), and `(602) 741-1075` (formatted) resolve
correctly.

Migrations 059 and 060.

---

## v1.74.0 — 2026-04-19

### Feature: SMS one-time-passcode sign-in (Twilio-backed) + Privacy/Terms pages

A second self-serve sign-in path that does not depend on email delivery —
solves the same class of failure as v1.73 (corporate inbox filtering)
without requiring admin intervention. Members enter their phone number,
receive a 6-digit code via SMS, and sign in.

- **LoginPage UI**: toggle link beneath the form swaps between email
  magic-link and phone OTP modes. Phone form normalizes US 10-digit
  input to E.164, accepts international numbers prefixed with `+`,
  shows the in-product opt-in disclosure required for Twilio toll-free
  verification, and routes to a 6-digit code-entry view after send.
- **Allowlist gate**: `is_invited_member` RPC now accepts `check_email`
  *or* `check_phone` (named arg, backwards-compatible). Phone matching
  strips non-digits on both sides, so input format on the client is
  forgiving.
- **Profile linking**: `handle_new_user` trigger tries email match
  first (preserves prior behavior), then falls back to digits-only
  phone match against `member_invites.phone`. New `auth.users` rows
  created via SMS path land in `profiles` with role + chapter context
  copied from the invite, exactly like the email path.
- **Backfill**: existing `member_invites` rows get phone numbers
  populated from `chapter_members.phone` (where email matches), so
  every directory entry with a phone on file can sign in via SMS
  immediately. `syncMemberInvites` (admin add/import) now also
  writes phone going forward.
- **Privacy Policy** at `/privacy` — public route, covers data
  collection, SMS-specific terms, service providers (Supabase / Vercel
  / Twilio / Resend), retention, user rights.
- **Terms of Service** at `/terms` — public route, covers eligibility,
  beta status, sign-in mechanics, SMS terms, acceptable use, content
  ownership, disclaimers.
- **LoginPage footer** links to both. Beta-Terms checkbox copy on the
  login form now references the Privacy Policy and Terms of Service
  alongside the Beta Terms.

### Operational notes

- Requires Twilio Phone provider configured in Supabase Dashboard
  (Authentication → Sign In / Providers → Phone) with a Messaging
  Service SID. Toll-free number recommended for US delivery — pre-
  approved for A2P, no 10DLC registration. Per-SMS cost ~$0.008 US,
  more for international.
- SMS template: `Your Our Chapter OS sign-in code is {{ .Code }}. Don't share this code.`
- Toll-free verification submitted with use case "Verify users";
  policy URLs `https://app.ourchapteros.com/privacy` and `/terms`.

Migration 058. New files: `src/pages/PrivacyPolicy.jsx`,
`src/pages/TermsOfService.jsx`. Modified: `src/pages/LoginPage.jsx`,
`src/lib/auth.jsx`, `src/lib/boardStore.js`, `src/App.jsx`.

---

## v1.73.0 — 2026-04-19

### Feature: Admin "Generate Sign-In Link" — bypass email delivery
For users whose corporate email gateway is silently dropping our
magic-link emails (delivered to MX with 250 OK but never reaching the
inbox — Celia Waddington's case), super_admin can now mint a real,
single-use sign-in link **without going through the email channel**
and share it via WhatsApp / SMS / Signal / in-person.

- **New Vercel serverless function** `api/admin/generate-magic-link.js`:
  verifies the caller's JWT belongs to a `super_admin`, then uses the
  service-role key to call `auth.admin.generateLink({ type: 'magiclink' })`.
  Returns the action_link plus issuance metadata.
- **Admin UI**: small Link icon next to each member row in Member
  Management (super_admin only, on hover). Click → modal opens with
  the generated URL + Copy button + warning about treating it like a
  password (anyone who clicks it signs in as that user).
- **Single-use**: link is consumed on first click and expires per
  Supabase Auth's link-expiry setting (default 1 hour).
- **Audit metadata** displayed in modal: who issued, when, for which
  email. Not yet persisted to a server-side audit log (consider
  follow-up if usage grows).

### Required env var (must add in Vercel before this works)
`SUPABASE_SERVICE_ROLE_KEY` — get it from Supabase Dashboard →
Settings → API → `service_role` key. Add in Vercel → Settings →
Environment Variables. **Never expose this in client-side code or
prefix with VITE_** — it bypasses RLS entirely.

`api/admin/generate-magic-link.js` (new), `src/pages/admin/MemberManagementPage.jsx`.

---

## v1.72.1 — 2026-04-19

### Fix: Stale CHECK constraint blocked events in February / May / December
**Bug**: creating any event in a month tagged RENEWAL (Feb), GRATITUDE
GALA (May), or NO EVENT (Dec) failed silently against
`events_strategic_importance_check`. The optimistic local insert showed
the event in the UI, but the DB row was never created. Any later
operation on that "zombie event" then silently failed too.

**Root cause**: the original CHECK from migration 001 allowed
`kickoff` / `momentum` / `renewal_critical` / `sustain` /
`strong_close`. Over time the client vocabulary in `STRATEGIC_MAP`
evolved to `kickoff` / `momentum` / `no_event` / `renewal` /
`sustain` / `gratitude_gala` — the labels diverged but the constraint
was never updated.

**Fix** (migration 057): drop the CHECK. `strategic_importance` is
informational metadata derived from `month_index`; DB-level
enumeration buys nothing. If revalidation becomes useful, a
non-breaking text-based check can be reintroduced later.

**Recovery for existing zombie events**: their data is in localStorage
but absent from Supabase. Easiest path is to delete them from the
Events page (the delete will silently no-op against the missing DB
row, then they're gone from the cache too) and re-create. New events
will persist correctly going forward.

Migration 057.

---

## v1.72.0 — 2026-04-19

### Feature: Cross-chapter speaker library sharing (forked-copy model) — V1
The fifth and final piece of the original five-piece beta plan. Lets a
chapter mark a speaker in their library as "Globally Shared" so other
chapters can discover that speaker in a new Shared Library tab and fork
a copy into their own chapter's pipeline.

- **Per-speaker share toggle** in the speaker edit form: Chapter Only
  (default) vs Globally Shared. Shows a warm-tinted explainer card
  describing what each setting does. The chapter name is denormalized
  onto the speaker row at share time so other chapters can attribute
  it without opening up cross-chapter `chapters.*` reads.
- **New Shared Library tab** on the Speakers page. Lists all globally-
  shared speakers from OTHER chapters, sorted by name. Each card shows
  name, topic, bio, fee range, and source chapter. Empty state when no
  one's sharing yet.
- **Fork-into-pipeline** flow: clicking "Add to my pipeline" on a
  shared card creates a fresh `speakers` row in the importing chapter
  (bio / topic / contact / fee_range copied) plus a blank
  `speaker_pipeline` entry for the active fiscal year. The new row's
  `imported_from_speaker_id` points back at the source for attribution.
  Importer has full sovereignty: can edit, re-share, or delete.
- **Already-forked indicator**: cards for speakers the chapter has
  already imported show "Already in your library" instead of an Add
  button.

### Schema (migration 056)
- `speakers.share_scope text` (CHECK in chapter_only / global, default
  chapter_only)
- `speakers.shared_chapter_name text` (denormalized at share time)
- `speakers.imported_from_speaker_id uuid` (provenance)
- SELECT policy on speakers updated to allow cross-chapter reads when
  `share_scope = 'global'`. Chapter-scoped admin reads still work for
  non-shared speakers.

### Out of scope (v1)
- Cross-chapter aggregation of pipeline data (historical fees, who's
  spoken at which chapters, etc.) — that's where the v1.70.0 fee
  privacy flags would kick in. Follow-up PR.
- Region-level sharing (US-West, etc.) — global-only for v1.
- "Check for updates" UI to pull latest bio changes from the source.

`src/pages/SpeakersPage.jsx`. Migration 056.

---

## v1.71.1 — 2026-04-19

### Fix: Survey responses cross-tenant leak
**Bug**: opening Survey Results from any chapter showed survey
responses from members of OTHER chapters. A super_admin viewing as a
chair in EO Shanghai saw their own EO Arizona response listed under
"Individual Responses." Other chapter admins likewise saw out-of-chapter
responses.

**Root cause**: `survey_responses` had no `chapter_id` column. The only
read gate was the broad RLS policy "Admins can read all surveys" which
used `is_admin()` with no chapter scope. The client query was bare
`select('*')` with no chapter filter either. Both layers needed.

**Fix** (migration 054 + client changes):
- Added `chapter_id` column to `survey_responses`, backfilled from
  `profiles.chapter_id` for existing rows.
- Replaced RLS read policy with chapter-scoped equivalent: super_admin
  sees all (cross-chapter support), regular chapter admins see only
  responses where `chapter_id = user_chapter_id()`.
- `SurveyPage` (member-portal submit) now includes `chapter_id` from
  the active chapter context in every upsert.
- `SurveyResultsPage` (admin read) now filters by `activeChapterId`
  and shows an empty state until the chapter context loads.

This restores the multi-tenant isolation guarantee that v1.48.0 /
migration 032 established for the rest of the schema. Survey responses
were missed in that pass because they're per-user not per-chapter in
schema, even though they're effectively chapter-scoped in usage.

Migration 054. `src/pages/portal/SurveyPage.jsx`,
`src/pages/admin/SurveyResultsPage.jsx`.

---

## v1.71.0 — 2026-04-19

### Feature: Recommendations module (Learning Chair scope)
Cross-chapter feedback queue. Any Learning Chair (or LC-Elect, or
super_admin) can submit a feature recommendation; everyone with access
can upvote; super_admin sets effort, marks status, records the version
each item shipped in.

- **New page** at `/recommendations` with a Lightbulb icon in the
  Learning Chair sidebar (under Survey Results). Visible to LCs +
  super_admin.
- **Submit form**: title + body. As you type the title, similar
  existing recommendations surface inline so you can upvote one of
  those instead of creating a near-duplicate (Jaccard word similarity,
  threshold 0.35).
- **List view**: sorted by upvotes, status-grouped (open/in-progress
  first, then shipped, then closed/duplicate). Each row shows the
  status badge, effort badge (if set by admin), shipped-in-version
  badge (if shipped), submitter name + chapter, and date.
- **Voting**: one toggle per user (DB unique constraint).
  Optimistic-on-client.
- **Super-admin controls** inline on each row: status dropdown
  (open / in_progress / shipped / closed / duplicate), effort
  dropdown (easy / medium / difficult), shipped-in-version text input.
  Setting status to `shipped` auto-stamps `shipped_at`.
- **Cross-chapter visibility**: anyone authenticated can read; only
  LCs + super_admin can submit/vote. RLS enforces both.

Migration 053. New: `src/lib/recommendationsStore.js`,
`src/pages/RecommendationsPage.jsx`. Modified: `src/lib/chairRoles.js`,
`src/App.jsx`.

---

## v1.70.0 — 2026-04-19

### Feature: Per-speaker fee privacy toggle (estimated + actual)
Speakers sometimes give a chapter a discounted rate with a request not
to share the number with other chapters. This adds a per-pipeline-entry
privacy flag for each fee value so chapter staff can honor that.

- **Two new boolean columns** on `speaker_pipeline`:
  `fee_estimated_private` and `fee_actual_private` (both default false).
- **Speaker edit form**: a small Lock toggle sits next to each fee
  input. Click to flip between Public (visible) and Private (warm-tinted
  Lock). Tooltip explains the use case.
- **Visual indicator everywhere fees render**: in the pipeline kanban
  card's inline fee inputs and in the library list's fee columns, a
  small Lock icon sits next to private values as a reminder not to
  share externally.
- **Within-chapter behavior**: fees stay fully visible to chapter
  admins (they need to see what they're paying). The Lock is just an
  indicator. Cross-chapter enforcement will arrive with the speaker
  library sharing feature (#5 on the roadmap).

Migration 052. `src/pages/SpeakersPage.jsx`.

---

## v1.69.1 — 2026-04-19

### Fix: Contract checklist FK race when opening a freshly-created event
"Save failed (insert:contract_checklists): violates foreign key constraint
contract_checklists_event_id_fkey" surfaced when a user created an event
and immediately opened it. Two bugs converged:

1. `getOrCreateChecklist(id)` was called during EventDetailPage render
   and side-effected an `INSERT` into `contract_checklists`. State
   mutation during render is a React anti-pattern.
2. The events row from `addEvent` is optimistically inserted into local
   state then asynchronously written to Supabase. Opening the event
   detail page immediately fired the checklist insert before the events
   insert had completed in the database — FK violation.

Fix: split into two operations.
- `getChecklist(eventId)` — read-only; returns existing or default
  in-memory object. Safe during render.
- `setChecklistField(eventId, field, value)` — called when the user
  toggles a checkbox or types a note. Updates the existing row, or
  inserts a new one if none exists. On FK 23503 it waits 800ms and
  retries once (covering the optimistic-insert race).

EventDetailPage now uses both. The DB row is created only on first
user interaction with the checklist, not on page mount.

`src/lib/store.js`, `src/pages/EventDetailPage.jsx`.

---

## v1.69.0 — 2026-04-19

### Feature: Chapter-scoped Download Backup on Speakers / Events / Venues
Fulfills the Beta Terms promise that users can download their own data
at any time. Each Learning Chair surface — Speakers, Events, Venues —
now has a "Backup" button next to its primary actions. Clicking it
produces a multi-sheet `.xlsx` workbook of everything chapter-scoped
on that surface, named like `EOArizona-Speakers-Backup-2026-04-19.xlsx`.

- **Speakers backup** — Library sheet (cross-FY persistent) + Pipeline
  sheet (current FY, with library fields denormalized).
- **Events backup** — Events sheet + Budget Items + Contract Checklists
  (exploded one row per event/item) + Event Documents metadata. Filename
  includes the active fiscal year.
- **Venues backup** — single Venues sheet (cross-FY persistent).
- xlsx is lazy-loaded (`import('xlsx')`) so the ~430 KB library only
  hits the network when a user actually clicks Backup, matching the
  existing convention from `MemberManagementPage`.
- jsonb columns (e.g. `events.sap_ids`, `events.candidate_speaker_ids`)
  are JSON-stringified into cells so the audit trail survives the trip.

`src/lib/backupExport.js` (new), `src/pages/SpeakersPage.jsx`,
`src/pages/EventsPage.jsx`, `src/pages/VenuesPage.jsx`.

---

## v1.68.0 — 2026-04-19

### Feature: Page title + subtitle elevated into the desktop TopBar
With the chapter name removed from the desktop TopBar in v1.67.1 the
white space sat empty. This reuses it: the current page's identity
(title + supporting metrics) now lives in the TopBar on desktop,
freeing the body for content.

- New `PageHeaderProvider` + `usePageHeader()` hook + drop-in
  `<PageHeader title=... subtitle=... />` component
  (`src/lib/pageHeader.jsx`).
- Each page calls `<PageHeader>` once at the top of its render. On
  desktop the component renders nothing in-body and pushes title +
  subtitle to TopBar via context. On mobile the chapter name stays in
  TopBar and the title block renders in-body where it always was.
- `useSetPageHeader(title, subtitle)` hook variant for pages whose
  in-body title is interactive (e.g. `EventDetailPage` where the h1 is
  click-to-edit and lock-toggle) — registers context without touching
  the body.
- Converted all Learning Chair surfaces in this PR: Dashboard, Year Arc
  Calendar, Speakers, Events, Event Detail, Venues, Budget, Scenarios,
  SAPs, Settings. Other chair surfaces (Engagement, President, Finance,
  Board, Super Admin, Member Portal, SAP Portal) keep their in-body
  headers for now and will be converted in follow-up PRs.

`src/lib/pageHeader.jsx` (new), `src/components/layout/TopBar.jsx`,
`src/App.jsx`, plus the 10 page files.

---

## v1.67.1 — 2026-04-19

### Fix: TopBar no longer duplicates the chapter name on desktop
On desktop the sidebar context block already shows the chapter name
("EO Arizona") right under the OurChapter OS wordmark, so rendering it
again in the white TopBar to the right was duplicate noise. Now hidden
on `md:` and up. On mobile the sidebar collapses behind the hamburger,
so the TopBar keeps showing the chapter name as the only place users
see it. `src/components/layout/TopBar.jsx`.

---

## v1.67.0 — 2026-04-19

### Feature: Beta Terms acknowledgment gate
With chapters from 30+ countries requesting beta access, this establishes
the legal foundation for opening access: every user must actively
acknowledge the Beta Terms — an assumption of risk and indemnification of
John-Scott Dixon personally, Aidan Taylor LLC, and EO Arizona — before
using the product. The terms frame Our Chapter OS as an **independent
project**, explicitly not a product of, sponsored by, or affiliated with
Entrepreneurs' Organization or any EO chapter.

- **LoginPage**: a single-line checkbox "I acknowledge this is beta
  software and accept the Beta Terms" is required to enable the Send
  Magic Link button. Clicking "Beta Terms" opens a read-only modal with
  the full v1.0 text. Visual focus stays on the magic-link input.
- **BetaTermsAckGate**: after sign-in, if the user has not acknowledged
  the currently in-effect terms version, a blocking modal overlays the
  app. The "I Acknowledge" button is enabled only after the user scrolls
  to the bottom of the terms. A small "Sign out instead" link is the
  only alternative.
- **Re-acknowledgment on version bump**: when a new terms version
  (e.g. v1.1 adding Chair Chat AI disclaimers) is published with an
  effective_date `<= today`, the gate reappears for all returning users
  until they accept the new version. Existing acknowledgments for older
  versions remain on record.
- **Schema**: `beta_terms_versions` (immutable history) +
  `beta_terms_acknowledgments` (unique per user + version, with
  user_agent for audit). RLS allows anyone to read terms (so the
  login-page modal works without auth), users to insert/read their own
  acks, and super_admin to read all. Helpers
  `current_beta_terms_version()` and `has_acked_current_beta_terms()`.
- v1.0 terms seeded inline in the migration with effective_date
  2026-04-19. Includes an explicit AI-content carve-out anticipating
  Chair Chat and AI contract review.

Migration 051. New: `src/lib/betaTerms.js`,
`src/components/BetaTermsModal.jsx`, `src/components/BetaTermsAckGate.jsx`.
Modified: `src/lib/auth.jsx`, `src/pages/LoginPage.jsx`, `src/App.jsx`.

---

## v1.66.3 — 2026-04-18

### Fix: Budget items now scoped to active fiscal year
The Dashboard "Budget Allocation" widget was showing $138,000 for
Speaker Fees while the Budget page showed $108,000 — same chapter,
same FY. Root cause: in `src/lib/store.js` the `events` fetch was
scoped to `chapter_id AND fiscal_year`, but `budget_items` (and
`contract_checklists`) were only scoped to `chapter_id`. Prior-year
budget rows lingered in the store and got summed by any consumer
that aggregated `budgetItems` directly — Dashboard widget,
store-level `totalBudgeted` / `totalContracted` / `totalActualSpent`.

Fix: extend the join filter to also `.eq('events.fiscal_year',
activeFiscalYear)` for both tables. All FY-scoped consumers now
see consistent totals.

`src/lib/store.js`.

---

## v1.66.2 — 2026-04-18

### Fix: "Members" nav item belongs to chapter staff only
The Members nav item was showing in the Admin sub-section of the
sidebar for every chair role (President, Learning Chair, SAP Chair,
…) because `canManageMembers` was scoped to `ADMIN_ROLES`. Member
management is a chapter-staff responsibility — chairs shouldn't see
it as part of their nav.

Tightened `canManageMembers` to:
- `super_admin` (for cross-chapter support)
- `chapter_executive_director`
- `chapter_experience_coordinator`

President, Learning Chair, SAP Chair, etc. no longer see the Members
nav item. Direct-URL access to `/admin/members` still works for
super_admin/president via the route's bypass list — this change is
nav-level only, not a hard auth lock.

`src/lib/permissions.js`.

---

## v1.66.1 — 2026-04-18

### Fix: Chapter switcher restored to the sidebar context block
The sidebar's collapsible context block was FY + role only — chapter
switching was supposed to go through `/super-admin` (Platform
Dashboard → pick a chapter). In practice, super-admins were getting
stuck inside a chapter they'd landed on (e.g. EO Shanghai) with no
quick way back without navigating through the platform dashboard.

Mounted `<ChapterSwitcher />` back above the fiscal year switcher in
the expanded context block. The component auto-hides when
`allChapters.length <= 1`, so regular chapter users see nothing new —
only super-admins get the picker.

`src/components/layout/Sidebar.jsx`.

---

## v1.66.0 — 2026-04-18

### Feature: "View as Member" role switcher option
Super admins, presidents, and chapter staff can now preview what a
chapter member sees. Picking "Member" from the Switch role dropdown
navigates to `/portal` and renders the Member Portal layout with the
effective role set to `member` — so any surface gated by
`hasPermission(effectiveRole, …)` behaves as it would for a member.

- Added `member` entry to `CHAIR_ROLE_CONFIGS` with `homePath: '/portal'`
  and empty `navItems` (the portal uses its own top-nav layout, not
  the admin sidebar)
- `SWITCHABLE_CHAIR_ROLES` auto-derives from `Object.keys()`, so the
  option appears in the dropdown with no other wiring
- The **Admin** back-link in `MemberPortalLayout` now clears
  `viewAsRole` on click, so the user cleanly returns to their own
  surface (otherwise they'd land in the admin sidebar still
  impersonating `member` with an empty nav)

No schema changes. `src/lib/chairRoles.js` +
`src/components/layout/MemberPortalLayout.jsx`.

---

## v1.65.2 — 2026-04-18

### Fix: Vendors page readability — white-on-ivory leftovers
The Vendors page had more dark-theme leftovers. The "All Categories"
select rendered as white text on ivory (barely visible in the
screenshot). Same leftover on the search input, the AddVendor modal
form fields, the review textarea, and two hardcoded dark modal
backgrounds:

- **Page inputs** — search input + category select swapped to
  `text-foreground placeholder:text-muted-foreground`
- **AddVendorModal** — name/address/phone/website inputs, category
  select, and the type-ahead suggestions dropdown all migrated off
  `text-white` / `bg-[#1a2332]`
- **VendorDetailModal** — connect textarea
- **ReviewForm / ReviewCard** — review textareas
- **Modal shell** — hardcoded `bg-[#0f1724]` → `bg-card text-foreground`
  so modal contents inherit the cream theme

Fix only. `src/pages/portal/VendorsPage.jsx`.

---

## v1.65.1 — 2026-04-18

### Fix: SAP Industry field is now a dropdown
The SAP partner Add/Edit form had a freeform text input for Industry,
which meant SAPs could be categorized under "Financial Planning",
"financial planning", "FinPlan", or anything else an admin typed.
That broke category grouping in the Vendors directory because virtual
SAP entries couldn't match the canonical categories.

- **Dropdown** — same `VENDOR_CATEGORIES` list used by real vendors
  (Legal, Accounting, Catering, AV/Production, Printing, etc.)
- **Legacy preservation** — if an existing SAP has a non-canonical
  industry, the current value shows as "(legacy)" in the dropdown so
  saving without changing it won't clobber it; editing picks a
  canonical option going forward

Fix only. `src/pages/SAPPartnersPage.jsx`.

---

## v1.65.0 — 2026-04-18

### UX: Vendors directory groups by category in the "All" view
The "All Categories" view was a single flat list — mixing Legal,
Catering, AV/Production, etc. into one scroll. Now each category
renders as its own section with a header and count, in the canonical
`VENDOR_CATEGORIES` order:

- **Section header** — uppercase category name + "N vendors" count,
  separated by a thin border
- **Canonical order** — categories render in the order defined in
  `src/lib/vendorStore.js` (Legal → Accounting → Catering → …), with
  any unknown categories appended alphabetically
- **Sort preserved within each group** — SAP partners still float to
  the top of their category, then by rating, then by name
- **Single-category filter unchanged** — picking a specific category
  still renders the flat grid (no redundant header)

No schema changes. Client-side only (`src/pages/portal/VendorsPage.jsx`).

---

## v1.64.0 — 2026-04-17

### Feature: SAPs auto-surface in the member Vendors directory
Members no longer need admins to manually duplicate every SAP partner
as a vendor. The Vendors page now automatically merges every active
SAP from the chapter's SAP roster into the list:

- **Category** derives from the SAP's `industry` field — SAPs filter
  alongside real vendors using the existing category dropdown
- **Tier badge** — each SAP card shows a colored pill (Platinum /
  Gold / Silver / In-Kind) using the tier's theme color
- **Sort priority** — SAP partners (both virtual and real linked-by-
  `sap_id`) rank above non-SAP vendors
- **Read-only** — virtual SAP entries can't be edited, deleted, or
  reviewed from the vendor page (admins manage SAPs on the SAPs page;
  a small "Auto-listed from chapter SAP roster" caption tells members
  why). Review UI hidden with a helpful note.
- **De-duplication** — if a real vendor already links a SAP via
  `sap_id`, the virtual entry is skipped so nothing appears twice

No DB migration needed — this is entirely a display-time merge.

---

## v1.63.3 — 2026-04-17

### Fix: Forum Home tab readability + leftover white-on-cream
ForumHomePage had several leftover dark-theme styles invisible on the
new cream background:
- Active tab label was `text-white` on cream (e.g. "Parking Lot" tab
  title was nearly unreadable). Now `text-primary font-semibold`.
- Two text inputs in the Roles + Constitution editors had
  `text-white placeholder-white/30` on `bg-muted/30`. Swapped to
  `text-foreground placeholder:text-muted-foreground`.
- Agenda totals cell on a muted footer was `text-white font-bold`.
  Now `text-foreground`.

---

## v1.63.2 — 2026-04-17

### Year Arc cards: month in banner + multiple events per card
Two improvements to the Dashboard's Year Arc:

- **Month abbreviation now lives in the dark banner** alongside the
  strategic theme — e.g. `MOMENTUM · AUG`. Card body no longer
  needs to repeat the month.
- **Multiple events per month** all render inside the same card,
  stacked with a thin divider. Previously only one event per month
  was shown.

Card click behavior: single event → jump to event detail; multiple
events or none → jump to the full calendar.

---

## v1.63.1 — 2026-04-17

### Fix: Vendors page in member portal crashed (TDZ ReferenceError)
`VendorsPage.jsx` declared a `useCallback` whose dependency array
referenced `currentMember` BEFORE the `const currentMember = useMemo(...)`
declaration. JavaScript's temporal dead zone made this throw a
ReferenceError at render → page crash. Moved the `currentMember`
declaration above the callback. No behavior change.

---

## v1.63.0 — 2026-04-17

### Feature: Significant Life Partner (SLP) records on member profile
New `slps` table (migration 050) — one SLP per chapter member, linked
by `member_id`. Captured fields: name, relationship type
(spouse / partner / domestic partner / fiancé / other), date of birth,
anniversary, kids (free-text list), dietary restrictions, allergies, notes.

**Access model (RLS):**
- Member can read/insert/update/delete their own SLP record
- Chapter admin (super_admin / president / president_elect /
  president_elect_elect / chapter_executive_director /
  chapter_experience_coordinator / **learning_chair** /
  learning_chair_elect) can read/edit any SLP in their chapter
- Nobody else can see SLP data

**UI:** new SLP card on the member profile page (`/portal/profile`),
sitting beneath the main profile fields. Loads existing SLP on mount,
upserts on save.

**Coming next:** admin-side UI for chapter staff to view/edit SLPs from
member management. For now, member self-edit is the only UI; chapter
admins can edit via Supabase directly if needed.

### Migration to apply
`supabase/migrations/050_slps_table.sql`. Idempotent.

---

## v1.62.0 — 2026-04-17

### Feature: Member self-edit profile page + Year Arc upgrade
**Member Profile (`/portal/profile`)** — new self-edit page covering
first/last name, email, phone, company, industry, EO join date, and
bio. Backed by `chapter_members`. Migration 049 adds an RLS policy
letting a member update only their own row (chapter / role / status /
forum stay admin-controlled). The "Something changed" button on the
Profile Check-in card now sends members directly to this page (still
logs a `change_requested` ping so the chapter team has the trail).

**Year Arc cards** now show the full event date (e.g. "August 13, 2026"
instead of "Aug") and the speaker's name on row 2 (instead of the
truncated event title). Grid widened to 2/3/4/6 columns so the longer
labels actually fit. Cards without a confirmed event read "No event"
+ the full month name.

### Migration to apply
`supabase/migrations/049_member_self_edit.sql`. Idempotent.

### Coming next (PR 2)
SLP feature — separate `slps` table linked to chapter_members, with
RLS allowing members to edit their own + chapter admin (CED/CEC/
President/Learning Chair) to edit any in their chapter.

---

## v1.61.7 — 2026-04-17

### UX: Notifications moves from sidebar to a bell icon in the TopBar
Per request — bell icon top-right (always-accessible from any page),
removed from the sidebar Admin sub-section. Visible only to roles with
`canSendNotifications`. Same destination (`/admin/notifications`),
just one click closer.

---

## v1.61.6 — 2026-04-17

### Fix: SAP Portal dashboard readability
Multiple low-contrast text elements on the cream SAP Portal background:
- "Not yet forum trained" was `text-amber-400/80` — washed out. Now
  `text-warm` (on-palette terracotta).
- "Forum Trained" was `text-green-400` — off-palette bright. Now
  `text-community` (muted English green) matching the member portal's
  belonging accent.
- Partner name (e.g. "Silverhawk Financial") was plain muted — now
  `text-foreground/90 font-medium` so it reads as the heading it is.
- Card subtitles and "Next Event" label bumped from `/60`/`/70`
  opacity to full `text-muted-foreground` for AA contrast.

---

## v1.61.5 — 2026-04-17

### Tweak: Survey Results visibility — President yes, Super Admin no
Following up on v1.61.3. `canViewSurveyResults` is now
`['president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect']`.
Super-admin no longer has default access — they can still reach it by
impersonating a Learning Chair if they need the view for support.
Survey Results now also appears in the President's sidebar nav.

---

## v1.61.4 — 2026-04-17

### Fix: SAP Portal preview bar layout on mobile
The "Viewing as" preview bar at the top of the SAP Portal squeezed the
contact dropdown against the "Exit Preview" link on narrow screens —
the "E" of "Exit Preview" was getting clipped behind the dropdown.
Bar now stacks vertically on mobile (chip + dropdown on row 1, Exit
Preview on row 2) and stays inline at `sm` and above. Dropdown grows
to fill row width on mobile so long contact names fit cleanly.

---

## v1.61.3 — 2026-04-17

### Restructure: Survey Results is Learning Chair only, not an admin section item
Moved "Survey Results" out of the shared Admin sub-section in the
sidebar and into the Learning Chair's main nav. Permission tightened
to `['super_admin', 'learning_chair', 'learning_chair_elect']` — other
chair roles no longer see or access it. Route guard tightened to match.

### Fix: switching to Finance Chair role no longer crashes the app
Finance Chair's `homePath: '/finance'` had no matching route. When the
user role-switched in, ChairHome bounced to `/finance` → catch-all
bounced back to `/` → ChairHome bounced to `/finance` again → infinite
redirect loop, app crash.

Stubbed a `FinanceDashboard` at `/finance` (gated to `FINANCE_ROLES`).
Renders a "Dashboard coming soon" card with a link to the chapter
budget surface — keeps the role functional, signals what's planned.

(Note: `/president/budget` is still referenced from several chair nav
configs without a matching route — that's a separate latent bug worth
fixing in a follow-up.)

---

## v1.61.2 — 2026-04-17

### Fix: sidebar header shows chapter name in bold, not chair title
The sidebar header was showing the chair title ("Learning Chair") in
bold with chapter name as a subtitle — but the chair title is already
in the collapsible context block below, so it was being shown twice.

Now the sidebar top reads:
- OurChapter OS wordmark
- **Chapter name in bold** (e.g. "EO Arizona")
- Collapsible context with FY + Role

Super Admin platform view shows "Platform" with the SA chip instead of
a chapter name.

---

## v1.61.1 — 2026-04-17

### Revert: sidebar context no longer auto-collapses on selection
Previous v1.61.0 made the context block close automatically when the
user picked a new role or fiscal year. Reverted — the chevron is now
the single control for open/shut. User explicit > guessing.

---

## v1.61.0 — 2026-04-17

### Feature: SAPs relabel + SAP Chair role + Super Admin sidebar + minimal TopBar

**Relabel Partners → SAPs**. Sidebar nav, page titles, forum tab, tour
content all read "SAPs" now. Route `/partners` stays for bookmark
stability; internal permission names (`canViewPartners`) unchanged to
avoid churn. "Strategic Alliance Partners" in page headers shortened to
"SAPs" since that's what everyone actually calls them.

**New SAP Chair role.** Migration 048 adds `sap_chair` to
`profiles.role` + `member_invites.role` constraints and grants it
chapter-admin status in `is_admin()` / `is_chapter_admin()`. Chair config
has its own home (`/partners`) and nav (SAPs + Events + Year Arc).
Other chair roles retain read-only reference access to SAPs.

**Super Admin sidebar trimmed.** Nav is now just **Platform Dashboard**
and **Analytics** (new). The Admin and Board sub-sections are suppressed
entirely for super-admin — chapter-operational concerns belong on chair
surfaces. Super-admin accesses them via role-switching.

**Analytics stub.** New `/super-admin/analytics` page with a coming-soon
card listing planned metrics (chapter adoption, user engagement, feature
usage, AI cost, NPS aggregates). Dead nav-link avoided, intent is visible.

**TopBar simplified.** Just the chapter name in bold — role + FY + theme
+ budget all removed. Role/context info already lives in the collapsible
sidebar block, no duplication. On `/super-admin/*` shows the "OurChapter
OS" wordmark + "SUPER ADMIN" chip instead.

**Context block auto-collapses** on any role / fiscal year change.
User picks a new context, the switcher panel closes itself and nav
becomes visible again. Previously you had to tap chevron to close
after every selection.

**Chapter switcher removed from the sidebar.** Chapter name is shown
in the TopBar already, and super-admin switches chapters via the
Platform Dashboard (`/super-admin`). Collapsed summary line is now
just "FY {year} · {role}" — no triple-redundant chapter name.

### Migration to apply (Supabase SQL Editor)
Run `supabase/migrations/048_sap_chair_role.sql`. Idempotent.

---

## v1.60.8 — 2026-04-17

### Cleanup: remove redundant "Back to my role" button
Two UI elements were doing the same job — the role-switcher dropdown's
first (empty-value) option AND a separate "Back to [Role]" button
beneath it. Removed the button. Returning to your own role is now done
by picking the first entry in the dropdown. Also fixed the dropdown's
default-option label to use `getChairConfig()` so president-elect /
president-elect-elect see "President" (not "My Role") as their own
option, and the navigation falls through to the right homePath.

---

## v1.60.7 — 2026-04-17

### Fix: Super Admin TopBar is platform-level, not chapter-level
When a super-admin is on `/super-admin/*` (not impersonating a chair),
the TopBar now shows a clean platform header — "OurChapter OS" wordmark
on the left, "SUPER ADMIN" chip on the right — instead of the
chapter-scoped theme / president / budget, which aren't meaningful at
the platform level.

When the super-admin impersonates a chair role, the normal
chapter-context header returns automatically.

---

## v1.60.6 — 2026-04-17

### Fix: "Back to my role" button works for elect roles
The sidebar's "Back to X" button (visible when a role-switcher is
impersonating another chair) was using `CHAIR_ROLE_CONFIGS[profile.role]`
directly. That works for `president`, `chapter_executive_director`,
`chapter_experience_coordinator`, and `super_admin`, but FAILS for
`president_elect` and `president_elect_elect` because those are
aliases resolved via `getChairConfig()`, not first-class keys.

Result: elect-track presidents saw "Back to my role" and navigation
fell back to `/`. Now the button reads "Back to President" and routes
to `/president`, matching the non-elect behavior.

Only super-admin still reads "Back to Super Admin" — unchanged, and
only visible when a super-admin is impersonating.

---

## v1.60.5 — 2026-04-17

### Fix: sidebar context block always starts collapsed
Expansion state was being persisted in localStorage, so users who
tapped to expand once were stuck expanded forever — including after
impersonating a different chair role. That defeated the whole
"get it out of the way" intent.

Now:
- Always defaults to collapsed on page load (and across role switches)
- Tap the chevron to expand temporarily while you change context
- Next refresh / navigation → collapsed again
- Includes a one-time `localStorage.removeItem` so users previously
  stuck expanded get the new behavior immediately

---

## v1.60.4 — 2026-04-17

### Feature: Scenarios nav added to Chapter Experience + Chapter Executive Director sidebars
Both chapter-staff roles can now see and edit Scenarios. The underlying
permission (`canViewScenarios`) + route guard already granted access —
only the sidebar link was missing. Added `{ to: '/scenarios', label: 'Scenarios' }`
to both `chapter_experience_coordinator` and `chapter_executive_director`
nav configs in `chairRoles.js`. Edit access follows automatically
because ScenarioPage mutations go through the store and both roles pass
the `is_chapter_admin()` RLS check.

---

## v1.60.3 — 2026-04-17

### Fix: Scenario Planner anchored to Learning Chair budget, not chapter total
`ScenarioPage` was using `chapter.total_budget` (the $1.4M chapter-wide
figure) everywhere — intro copy, budget-remaining math, speaker-fee
ratio calculations. Swapped to `getChairBudget('learning')` — same
source the Dashboard and BudgetPage use. Now the planner evaluates
scenarios against the Learning Chair's actual allocation.

Same class of bug we fixed for BudgetPage in v1.54.8 — just didn't
catch this second instance at the time.

---

## v1.60.2 — 2026-04-17

### Fix: Platform Admin nav hidden from chair-role sidebars
A super-admin who had role-switched into a chair view saw a "Platform"
section with a "Platform Admin" nav link in the sidebar. That link is
now removed — Platform Admin belongs strictly to the Super Admin
surface. Super-admins return to it via the "Back to Super Admin" link
inside the collapsible context block, not via a persistent sidebar
item. Non-super-admin chair users were never affected (the link was
already gated to `isSuperAdmin`).

---

## v1.60.1 — 2026-04-17

### Fix: Dashboard Year Arc readable on mobile
The 12-month mini calendar used `grid-cols-12` at every breakpoint,
which on a 360px-wide phone gave each card ~30px — all labels were
truncating to "KICKO", "MOM", "RENE", etc. Now responsive:
- Mobile: 4 columns × 3 rows (each card ~80px, full labels fit)
- Tablet (≥sm): 6 columns × 2 rows
- Desktop (≥md): 12 columns × 1 row (original behavior)
Also bumped strategic-label font from 9px to 10px on smaller breakpoints
and added `gap-1.5` for a touch more breathing room.

---

## v1.60.0 — 2026-04-17

### Catch-up: several fixes shipped without a version bump
Five PRs merged since v1.59.0 without individual version tags. Rolled up
here for the changelog record. Going forward, every PR bumps the
version so the changelog stays honest.

- **Portal readability round 2** — `MemberCalendarPage` dark-gradient
  wrapper + 28 leftover `text-white` instances flipped to light theme;
  ForumHomePage form inputs; ProfileFreshnessCard "Something changed"
  button; SAP Portal "Account not linked" warning and "Viewing as"
  label given readable contrast; ForumHomePage constitution badges
  moved off amber to on-palette terracotta.
- **Data Management card** — Settings page Export/Reset buttons now
  stack vertically on mobile, side-by-side at ≥sm.
- **Collapsible context block** in sidebar — Chapter / Fiscal Year /
  Switch Role switchers collapse to a compact one-line summary by
  default (persists in localStorage). Recovers ~230px of sidebar
  real estate for nav items.
- **Compass nav item** labeled "(Member Portal)" parenthetically so
  it's self-explanatory.
- **Cross-chapter budget bleed fix** — `budget_items` +
  `contract_checklists` were fetched via `fetchAll()` (no chapter
  filter). Shanghai's dashboard showed `-$330K remaining of $0`
  because it was summing EO Arizona's budget. Now joined through
  `events` and filtered on `events.chapter_id`.

---

## v1.59.0 — 2026-04-17

### Portals rebrand: Member + SAP flip to light palette with distinct accents
Member Portal and SAP Partner Portal were still on the old dark navy
gradient. Both now use the same light Le Corbusier palette as the admin
surface, with distinct accent colors keeping them contextually separate:

- **Admin** — céruléen (blue-gray) primary
- **Member Portal** — new **community green** accent (`#1a5c3a`), signals belonging
- **SAP Partner Portal** — terracotta `warm` accent (`#c84b0c`), signals partnership

Each portal gets a thin colored strip under the header (top nav gets a
1px-tall accent bar in its color), plus a pill-shaped context chip in
the header reading "Member" or "Partner" so users instantly know which
surface they're on.

**Layout changes**
- `MemberPortalLayout` + `SAPPortalLayout`: dark navy gradient replaced
  with `bg-background text-foreground`; cards/headers use `bg-card`.
  Active nav state uses the portal's accent color.
- Both layouts now render the `BuiltByFooter` attribution strip like
  the admin surface.

**Bulk sweep**
- ~550 class replacements across portal + sap-portal interior pages:
  `text-white/XX` → `text-muted-foreground`/`text-foreground`,
  `bg-white/XX` → `bg-muted`, `border-white/XX` → `border-border`,
  and variants. Preserves bare `text-white` on colored buttons (where
  it's intentional foreground).
- `ReflectionsPage` left untouched — uses its own "paper" lifeline theme.

**Known follow-up**
- Some interior pages still reference `text-indigo-`/`text-amber-`
  accent colors directly. These render fine on light backgrounds but
  aren't on-palette; tracked for a polish pass.

---

## v1.58.0 — 2026-04-17

### Rebrand: strip EO branding, adopt Le Corbusier palette
Removes all "EO Arizona" / "Entrepreneurs' Organization" visual branding
and replaces the former brand palette (eo-blue / eo-pink / eo-coral /
eo-navy) with a restrained Le Corbusier "Polychromie Architecturale"
palette. Product now reads as a neutral third-party platform — not an
EO-sanctioned product — which better supports the "tool that chapters
choose to use" positioning.

**Color palette (`src/index.css`)**
- `--color-background`: `#f6f1e9` — warm ivory canvas
- `--color-card`: `#fffcf7` — cream white for raised surfaces
- `--color-foreground`: `#1a1714` — ink (warm black, not pure)
- `--color-muted-foreground`: `#857d74` — ink-muted
- `--color-primary`: `#4a6d8c` — céruléen pâle (architectural blue-gray)
- `--color-warm`: `#c84b0c` — ocre rouge (terracotta statement accent)
- `--color-destructive`: `#7d1e1e` — oxblood
- `--color-border`: `#dfd8cc` — warm pale
- Sidebar is now light (paper-dark) with ink text — major departure from
  the previous dark navy slab.

**Class rename**
- `eo-blue` → `primary`
- `eo-pink` → `destructive`
- `eo-coral` → `warm` (new custom token)
- `eo-navy` → `ink` (new custom token)
- `eo-white` → `card`
- 53 files updated in the sweep.

**Logos / wordmarks**
- New `Wordmark` component — neutral text treatment of "OurChapter OS"
  with primary-colored prefix. Scales to any size, no image asset.
- Deleted `src/assets/eo-az-gray.png`, `eo-circles-blue.png`,
  `eo-circles-white.png` (all unreferenced after wordmark swap).
- Login screen: cream background (no more dark gradient), wordmark +
  "A platform for chapter operations" subtitle.
- Sidebar, Member Portal header, SAP Portal header: wordmark replaces
  the EO logo image.
- Member Portal dashboard no longer renders the logo above the welcome
  line.

**What's still chapter-contextual** (intentionally not stripped)
- Seed data defaults (EO Arizona in mockData.js — that IS the first
  chapter's name, not branding)
- Copy like "How would you rate your experience with EO Arizona?" on
  SAP feedback — these should be dynamic to active chapter name; tracked
  for a follow-up PR

---

## v1.57.0 — 2026-04-17

### Major: Phase 1 onboarding polish — global chapter readiness
Removed demo-mode scaffolding, shipped chapter-level currency + timezone,
plus Built-by attribution, auto-magic-link on invite, and a real feedback
inbox. Platform ready for international chapter pilots.

**Removed**
- **Demo Mode** fully deleted (toggle, banner, `/demo` routes, persona
  switcher, Demo Users management, mock fixtures, `DemoLayout`, Mock Mode
  auth state). Narrative demo is a separate artifact we'll build
  externally; this removes ~1,000 lines of internal-only scaffolding that
  was cluttering the product surface.

**Added**
- **Migration 045** — `is_admin()` and `is_chapter_admin()` now include
  `super_admin`. Fixed a latent RLS bug that blocked super-admins from
  directly inserting into `member_invites` from the Chapter Config page.
- **Migration 046** — `chapters.currency` + `chapters.timezone` columns
  (defaults `USD` / `America/Phoenix`). Chapter Config page has dropdowns
  for both. `formatCurrency(amount, currency)` accepts an ISO code;
  Dashboard, TopBar, and BudgetPage pass the active chapter's currency.
- **Migration 047** — `platform_feedback` table. Every "Send Feedback" /
  "Report Bug" submission persists here. RLS: any authenticated user can
  insert; only super-admins can read/update the inbox.
- **Auto magic-link on invite** — Chapter Config page's Invite button
  now fires `signInWithOtp` after successfully allowlisting the email,
  so invitees receive a real magic link immediately instead of JSD
  sending a manual follow-up.
- **Built-by attribution** — new `src/lib/appBranding.js` with
  builder identity + URL. Rendered in a quiet footer on every
  authenticated page (`BuiltByFooter`), on the login screen, and as
  an "About the Builder" card in Settings. The Trojan-horse layer —
  every entrepreneur who touches this app sees who built it.
- **Floating Feedback button** now visible on desktop (was mobile-only).

---

## v1.56.0 — 2026-04-17

### Feature: Chapter-surface mock injection — Karl/Sarah can now walk the full app
Demo Mode v0.2 — clicking a chapter-tier persona ("Enter Full Chapter Surface")
now drops you into the real Learning Chair / President dashboard populated with
mock Phoenix data. Year Arc, Events, Speakers, Pipeline, Budget grid,
Scenarios, Venues all render from fixtures.

- `src/lib/mockStoreData.js` — full-shape fixtures for EO Phoenix: 5 venues,
  12 speakers, 11 events across the fiscal year, 11 pipeline entries, ~40
  budget items summing to the ~$330K figure Julie sees from her regional view,
  3 SAPs, 2 scenarios.
- Main store (`src/lib/store.js`) injects the mock data when
  `isMockMode && mockPersonaId.tier === 'chapter'`. All mutations wrap with
  `mockGuard` — clicking Save/Add/Delete fires an alert instead of persisting.
- Auth context: new `mockPersonaId` + `setMockPersonaId` state, backed by
  localStorage. Cleared on Mock Mode exit.
- `ChairHome` routes chapter-tier personas into DashboardPage (mock data
  renders); regional/global personas still land on /demo.
- `DemoLanding` syncs URL persona → auth context and exposes an
  "Enter Full Chapter Surface" button on chapter personas that also
  sets `viewAsRole` so the sidebar nav matches.
- `MockModeBanner`: new "← Back to Personas" link visible whenever you're
  on a non-/demo route in mock mode.
- `ProtectedRoute`: demo_user added to bypass list (safe — they're
  auth-locked into mock mode at the store level).

---

## v1.55.1 — 2026-04-17

### Fix: Demo Mode toggle now lands you on /demo
Flipping Demo Mode ON previously left you stranded on `/super-admin` with
no visible way to reach the persona switcher unless you typed `/demo` in the
address bar. Now:
- Flipping the toggle ON auto-navigates to `/demo`
- A "Go to Demo" button appears on the toggle card whenever Mock Mode is active

---

## v1.55.0 — 2026-04-17

### Feature: Demo Mode + Regional Learning Chair persona switcher (v0.1)
First cut of the demo surface for the Regional Learning Chair role. The full
story is in `docs/plans/` (to be added); the shippable bones live here.

- **Demo Mode toggle** on the Super Admin dashboard. Per-browser-session
  localStorage flag, gated on `role === 'super_admin'`. When enabled, a
  persistent red banner pins to the top of every layout.
- **Demo User role** (`demo_user`). A permanent account type for external
  stakeholders — locked into Mock Mode at the auth layer, can never read
  real chapter data regardless of URL. Migration 044 adds the role to the
  `profiles.role` + `member_invites.role` check constraints.
- **Super Admin → Demo Users** page — create and revoke demo accounts by
  email. Uses the existing `member_invites` allowlist + magic-link flow.
- **`/demo` surface** with a persona switcher and four clickable personas:
  - Marcus Delacroix — Global Learning Chair (placeholder view)
  - Julie Broad — Regional Learning Chair, US West (flagship view: 3
    chapter cards with NPS, budget health, standout quotes, private-fee
    callout, notify button)
  - Karl Bickmore — Chapter President, EO Phoenix
  - Sarah Chen — Chapter Learning Chair, EO Phoenix
- **Mock fixtures** (`src/lib/mockFixtures.js`) seed 3 US West chapters
  with deliberate health variance (healthy / mid / struggling), event
  feedback with NPS + takeaway + highlight quotes, and speakers with a
  `fee_private` flag so the "private speaker fee visible to regional
  chair only" demo beat works.
- **Read-only by design** in v0.1 — all mutation buttons trigger a
  "DEMO MODE — nothing persisted" alert. Click-through sandbox upgrade
  planned for v1.0.

---

## v1.54.9 — 2026-04-16

### Recovered orphaned work from a dead Claude session
Three commits were stranded on `claude/general-session-nDKyL` when the
session died mid-task. Cherry-picked onto main:

- **Fix: Dashboard pipeline/events cards clipped long stage labels** — added `min-w-0` to flex items so `truncate` can actually shrink labels below their intrinsic width (fixes "Researching"/"Negotiating" pushing siblings out of bounds).
- **Migration 042** — whitelist Karl Bickmore (President Elect, EO Arizona) in `member_invites` so he can sign in via magic link.
- **Migration 043** — backfill `member_invites` from `chapter_members` so every active member is on the auth allowlist (idempotent — safe to rerun). Renumbered from 044 to keep migrations contiguous.

---

## v1.54.8 — 2026-04-16

### Fix: Budget page math used chapter total instead of chair allocation
- `BudgetPage` was computing health, percent, unallocated, remaining, and over-allocation warnings against `chapter.total_budget` ($600K), not the Learning Chair's FY allocation ($450K). This made every figure on the page misleading for the chair (e.g. "Remaining" showed ~$269K instead of ~$119K).
- Switched the page to `getChairBudget('learning')` — same source the Dashboard already uses (matching the v1.54.6 fix).
- Header subtitle now reads "$X chair budget" instead of "$X total budget".

---

## v1.54.7 — 2026-04-16

### Fix: contract parser used an invalid Claude model ID
- `api/contracts/parse.js` was calling Anthropic with `claude-sonnet-4-6-20250627`, which is not a real model alias, so every contract upload returned a 400 from the API (surfaced to the browser as "Claude API error: 400")
- Changed to the valid alias `claude-sonnet-4-6`

---

## v1.54.6 — 2026-04-15

### Fix: chair budget lookup includes 'elect' status assignments
- `getChairBudget` and `totalChairAllocated` now include both 'active' and 'elect' role assignments — the learning chair for FY 2026-2027 has status 'elect', so budget was returning $0
- Reverted role key back to `'learning'` (matches DB, not `'learning_chair'`)

---

## v1.54.5 — 2026-04-15

### Set chapter and learning chair budgets
- Chapter total budget set to $600,000, learning chair allocation set to $450,000 for FY 2026-2027
- Mock data updated to match ($600K chapter budget)

---

## v1.54.4 — 2026-04-15

### Fix: Learning Chair budget used wrong role key
- `getChairBudget('learning')` → `getChairBudget('learning_chair')` — was never matching the role assignment, so budget always showed $0

---

## v1.54.3 — 2026-04-15

### Fix: Learning Chair dashboard budget shows chair allocation, not chapter total
- Removed fallback to `chapter.total_budget` — budget card now shows only the learning chair's allocated budget from the president's assignment

---

## v1.54.2 — 2026-04-15

### President Dashboard budget card shows percentage and total
- Budget Allocated card now displays allocated/total (e.g. "$450,000 / $600,000") with percentage allocated across chairs

---

## v1.54.0 — 2026-04-15

### Chapter Executive Director + Chapter Experience Coordinator roles fully built out
- **Dedicated nav configs** — CED and CEC land on the President Dashboard with a full sidebar: Year Arc, Speakers, Events, Partners, Venues, Chapter Budget, Settings
- **Role switching enabled** — both staff roles can now view-as any chair role (like super admin and president) for chapter-wide support
- **Permission gaps filled** — added to `canManageFYBudget`, `ENGAGEMENT_ROLES`, `FINANCE_ROLES`
- **Route bypass** — both roles pass all ProtectedRoute gates (can access every chapter admin route)
- **Tour tip welcome** for CED and CEC on the President Dashboard

---

## v1.53.2 — 2026-04-15

### Fix: speaker pipeline FK constraint error on new speaker add
- `addSpeaker` now awaits the speaker row insert before inserting the pipeline entry, preventing the race condition where the pipeline FK check fails because the speaker doesn't exist yet

---

## v1.53.0 — 2026-04-15

### Role-specific contextual tour tips
- **New TourTip component** shows a dismissible, role-tailored banner the first time a user visits a page
- **Per-role content** in `tourContent.js` — Learning Chair sees different guidance on `/partners` than a Finance Chair would. Covers ~13 routes with content for president, president_elect, learning_chair, engagement_chair, finance_chair, strategic_alliances, board_liaison, chapter_experience_coordinator, chapter_executive_director
- **LocalStorage-backed dismissal** keyed per user — one-time per tip, never shows again after "Got it"
- **Reset anytime** — new "Show tour tips" button in the sidebar brings them all back
- Super admins impersonating a chair see that chair's tips via `effectiveRole`

---

## v1.52.0 — 2026-04-12

### SAP Event Engagements — Attending vs Presenting
- **New `sap_event_engagements` table** — tracks each SAP partner's role at an event (attending or presenting) with full logistics fields for presenters
- **Admin event detail** — role selector (Attending/Presenting) per SAP, with expandable logistics fields: topic, description, time slot, AV needs, run of show, materials. Status badges (Invited/Confirmed/Declined)
- **SAP portal events page** — split into Speaking Engagements (with editable logistics and Confirm/Decline) and Invited Events (with RSVP). Partners fill in their side, chapter reviews
- **SAP portal dashboard** — distinguishes "Next Speaking Engagement" (with mic icon, indigo styling, topic preview) from regular event invitations
- Migration `040_sap_event_engagements.sql` with RLS for SAP contacts, admins, and authenticated users

---

## v1.51.0 — 2026-04-12

### SAP Partner Portal V2 — Premium Vendors, Leads, Feedback, Reviews
- **Premium vendor tier**: SAP partners surface in the Vendor Exchange as "Strategic Partners" with indigo badge, sorted above community vendors, same review/rating system
- **Connect requests**: Members can send connect requests to SAP partners from the Vendor Exchange with an optional message; SAP contacts see incoming leads in a new "Leads" page with status management (pending/contacted/closed)
- **Forum speaking history**: SAP contacts can log forums they've spoken at (name, date, topic); count appears on their vendor card in the Vendor Exchange
- **Chapter feedback**: SAP contacts can rate the chapter (1-5 stars) and provide recommendations; anonymous option routes feedback to the Strategic Alliances Chair only
- **Reviews page**: SAP contacts see all member reviews of their company (read-only, reviewer names anonymized as "EO Member")
- **Super admin preview**: "SAP Partner" in role switcher with secondary contact picker; impersonation banner in SAP portal shows who you're viewing as
- Migrations 036-039: vendor tier/sap_id columns, connect requests table, forum appearances table, chapter feedback table

---

## v1.50.0 — 2026-04-12

### SAP Partner Portal
- **New SAP Partner Portal** at `/sap-portal` — a dedicated portal for external SAP contacts to view their events, profile, resources, and announcements
- SAP contacts authenticate via magic link (same flow as members), with a new `sap_contact` role
- **Portal pages**: Dashboard (welcome + tier badge + next event), Events (RSVP + full chapter calendar), Profile (editable contact info + read-only partner details + colleagues), Resources (curated links), Announcements (chapter notifications)
- **Admin invite flow**: "Invite to Portal" button on each SAP contact in the Partners page — creates a whitelist entry so the contact can sign in
- **Auth plumbing**: `sap_contact_id` FK on profiles linked via signup trigger, `is_sap_contact()` RLS helper, scoped SELECT policies for contacts/partners/events
- Migration `035_sap_portal_auth.sql` — role constraints, FK columns, trigger update, RLS policies
- Mock data: emails on 3 SAP contacts, `sap_ids` on 3 events for dev testing

---

## v1.48.0 — 2026-04-11

### Multi-tenant RLS hardening + dynamic branding
With Chad green-lighting chapter-to-chapter licensing, this locks down the one blocker: cross-tenant data leaks via permissive SELECT policies.

- **30+ `using (true)` SELECT policies dropped and replaced** with chapter-scoped equivalents. Every tenant-owned table now enforces `chapter_id = user_chapter_id() OR is_super_admin()` at the RLS layer, not just at the client. Child tables without a direct `chapter_id` column use `EXISTS` subqueries against their parent (e.g., `forum_agenda_items` → `forum_agendas`, `navigator_broadcast_responses` → `navigator_broadcasts`). Global reference tables (`reflection_feelings`, `reflection_templates`) are unchanged — they're intentionally shared.
- **Dynamic chapter name in Learning Calendar.** Hardcoded "EO Arizona" replaced with `activeChapter.name` in the header and footer of `MemberCalendarPage`, making the calendar ready for any chapter.
- Migration 032: `032_multi_tenant_rls_hardening.sql` — idempotent drop-if-exists + create. Safe to re-run.

## v1.47.0 — 2026-04-11

### Profile Freshness ping
Also from the product review: profile data rots silently because members never think to tell us when their life changes. Now we ask.

- **Quarterly ping** on the member portal home. If the member has no profile check-in in the last 90 days, an amber "Profile check-in" card appears above the primary tiles: *"Has anything changed in your world since we last checked? New company, role, partner, kids, address, interests — anything we should know."* Shows the date of their last confirmation if they have one.
- **Two-path answer:**
  - **All good** — one tap, stamps a `no_change` check-in, card flips to an emerald "Thanks — we'll check back in a few months" state and stays out of the way for 90 days.
  - **Something changed** — expands a textarea, member describes the change in their own words, submit creates a `change_requested` check-in that queues for the admin team and the card flips to "Got it — someone will reach out to update your profile."
- **Admin queue** at the top of `/admin/members` (Member Management page). When there are pending change requests, an amber banner lists each one: member name, forum, submitted date, the member's own words about what changed, and a "Resolved" button to close the ticket once the record is updated.
- Migration 030: `profile_checkins` table with `kind` enum (`no_change` | `change_requested`) and `status` (`open` | `resolved`). RLS: admins see all, members see their own; self or admin can insert; admin-only update/delete. Note: `no_change` rows are auto-marked `resolved` on insert so they don't clutter the queue.

## v1.46.0 — 2026-04-11

### Navigator Broadcasts — one-tap check-ins
Chad Nikkel's idea from the product review: the Member Engagement Chair needs to fire one question to every active navigator and see aggregated answers, instead of chasing 1:1 threads that never get answered.

- **Chair compose page** at `/engagement/broadcasts`. Chair types a prompt (default "How's your connection going?") and picks response options (default Yes/No, fully customizable — add/remove/rename). One click sends it to every navigator whose status is `active`.
- **Aggregated response view** on each broadcast card: total responded vs. outstanding, a horizontal bar per option showing counts, and an expandable "See who responded" view grouped by answer, with the note each navigator left and an amber-pill list of who hasn't responded yet.
- **Navigator-only card on the member portal home.** When an active navigator logs in and there's an open broadcast they haven't answered, a blue "Navigator check-in" card appears above the primary tiles with the prompt and tappable option buttons. Optional expandable note field. After they pick one, the card flips to an emerald "Thanks — you answered X" state and lets them change their mind without a reload.
- **Close / reopen / delete** actions on each broadcast so the chair can cap a check-in once responses stop coming in (or revive one that was closed early).
- Migration 029: `navigator_broadcasts` (prompt + jsonb options + status) and `navigator_broadcast_responses` (unique per broadcast+navigator for change-your-mind upsert). Scoped by fiscal year. RLS: admins write broadcasts; navigators insert their own responses via `current_chapter_member_id()` check.

## v1.45.0 — 2026-04-11

### Forum Compass — non-moderator visibility fixes
Bugs caught during a live demo with Chad Nikkel (non-moderator view):
- **Members tab added.** The forum home showed "8 members" as a label but there was no tab to actually see who those members are. Added a Members tab that lists every active forum mate with Email/Call quick actions. The member-count line in the header is now a button that jumps to the tab.
- **Empty Agenda / Constitution / Calendar / Roles tabs for members whose forum had no row in `public.forums`.** Every forum-scoped table (`forum_agendas`, `forum_calendar_events`, `forum_constitutions`, etc.) references `forums.id` as a FK, and the client filtered by `effectiveForum?.id`. When a member's `chapter_members.forum` text had no matching `forums` row, that id was null and every tab silently rendered empty. Fixed with migration `028_backfill_forums_from_members.sql` — idempotent insert of a `forums` row for every distinct `(chapter_id, forum)` present in `chapter_members`.
- **Parking lot add/update/delete failed silently for members.** The handlers called `createParkingLotEntry` / `updateParkingLotEntry` / `deleteParkingLotEntry` but ignored the returned `error`, so any RLS rejection or DB failure closed the modal with no feedback. Errors now surface in a dismissible red banner at the top of the forum home (`pageError` state), with the underlying message included.

## v1.44.0 — 2026-04-10

### Reflections — Download as PDF
- **Download PDF** button in the reflection editor — exports the reflection you're viewing (including unsaved edits) as a printable, text-selectable PDF. Walks the template schema (single fields or grid rows × columns, MEPS, footers) and renders each field with label + value.
- **Download all** button on the reflections list — exports every reflection as a single multi-page PDF, newest first, with a cover page showing member name, forum, export date, and count.
- jsPDF loaded via dynamic import so the ~380KB library only hits the network when a user actually clicks download.

## v1.43.0 — 2026-04-10

### Digital Forum Constitution + Ratification
- **Constitution is now structured data, not a PDF.** Each forum has one constitution with a history of versions (draft → proposed → adopted → archived).
- **Moderator edits inline**: title, preamble, and numbered sections with heading + body. Reorder sections with up/down buttons, delete, add.
- **Propose to forum**: moderator clicks "Propose to forum" on a draft → status flips to `proposed` and every forum member sees a ratification banner with "I ratify this version" button.
- **Ratification roster**: live pill list of every forum member showing who has and hasn't signed yet ("X of Y ratified"). Requires unanimous ratification.
- **Adopt**: once all members have ratified, moderator sees "Adopt version" which flips it to `adopted` and archives the previous adopted version.
- **Amendments**: once adopted, moderators can click "Propose amendment" which clones the current adopted version into a new editable draft.
- Migration 027: `forum_constitutions`, `forum_constitution_versions` (jsonb `sections` array), `forum_constitution_ratifications` with unique (version_id, member_id) constraint.

## v1.42.2 — 2026-04-10

### Forum Agenda
- **Reorder agenda items** — up/down chevron buttons on each row in the agenda editor swap adjacent items' `sort_order`. Start/end times automatically recalculate.

## v1.42.1 — 2026-04-10

### Events
- **Fix: "invalid input syntax for type uuid" on event saves.** Mock SAP IDs (e.g. `sap-aptive`) are strings, not UUIDs. `updateEvent` now strips non-UUID values from `sap_ids`, `candidate_speaker_ids`, and `sap_contact_ids` before writing to the database.

## v1.41.3 — 2026-04-10

### Events
- **Fix: FK violation on event updates.** Events linked to a venue that only existed locally (never persisted to DB) caused every subsequent update to fail. `updateEvent` now detects FK errors and auto-retries with the orphaned reference nulled out.

## v1.41.2 — 2026-04-10

### Venues
- **Fix: new venues now persist to the database.** The form sent fields (`fb_notes`, `fb_estimated_cost`, `fb_vendor`, `parking_notes`, `setup_notes`) that didn't exist as DB columns — PostgREST rejected the insert silently. Migration 026 adds the missing columns.
- "Theater / Concert Hall" venue type now accepted by the DB constraint (was missing from the check).
- `staff_rating` constraint relaxed to allow 0 (no rating selected).

## v1.41.1 — 2026-04-10

### Event SAP Fix
- Event Detail SAP dropdown now reads from `sapStore` partners (the full company-level partner list) instead of the legacy `saps` from the main store, which only had person-level records. All active SAP companies now appear in the dropdown.

## v1.39.3 — 2026-04-10

### Event SAP Contacts
- **Two-dropdown SAP linking** on the Event Detail page — first pick the partner company, then choose the specific contact/speaker from that company.
- Linked SAPs now show a "Speaker / contact" dropdown with that partner's contacts. Selecting a contact shows their email and phone inline.
- "Link without choosing a contact" option for SAPs where the speaker is TBD.
- Migration 025: adds `sap_contact_ids` jsonb column to events for per-SAP contact tracking.

## v1.39.1 — 2026-04-10

### Speakers
- **Multi-event assignment** — speakers can now be assigned to multiple events (up to all 10). The single dropdown is replaced with checkboxes showing all events in the fiscal year. Primary speaker status (★) is indicated per event.

## v1.39.0 — 2026-04-10

### Member Vendor Exchange
- **New `/portal/vendors` page** — members can browse, add, rate (1-5 stars), and review any vendor in the Arizona metro area.
- **20 curated categories**: Legal, Accounting, Catering, AV/Production, Printing, IT/Technology, Marketing, Real Estate, Insurance, Financial Planning, HR/Staffing, Construction, Consulting, Travel, Health/Wellness, Automotive, Photography/Video, Signage, Coaching, Other.
- **Fuzzy type-ahead** when adding a vendor — searches existing vendors by name to prevent duplicates.
- **Vendor cards** show average rating, review count, and category badge. Detail modal shows contact info, reviews with upvote/downvote, and inline editing.
- **Migration 024**: `vendors` and `vendor_reviews` tables with RLS (members manage own reviews, admins manage all).
- **`vendorStore.js`** — new store following the context + optimistic writes + Supabase hydration pattern.

## v1.38.1 — 2026-04-10

### Role Switcher Cleanup
- Elect roles (President Elect, President Elect-Elect, Learning Chair Elect) removed from the Switch Role dropdown — they're board positions in Settings, not separate app surfaces.
- The fiscal year selector determines context: FY 2026-2027 = President Elect's year, FY 2027-2028 = President Elect-Elect's year.
- Elect roles alias to their parent surface — a user with `president_elect` profile role sees the President dashboard.
- Switcher now shows only: President, Finance Chair, Learning Chair, Engagement Chair.

## v1.38.0 — 2026-04-10

### Mentors (Engagement Chair)
- New **Mentors** page (`/engagement/mentors`) — appoint chapter members as mentors for any member at any tenure (not just first-year like Navigators). Same UI pattern: status pills (active/paused/retired), bio, capacity hint, retire/restore/delete actions.
- New `mentors` and `mentor_pairings` tables (migration 024) mirroring the navigator schema, with matching RLS policies.
- Mentor CRUD in `engagementStore.js` — `addMentor`, `updateMentor`, `retireMentor`, `restoreMentor`, `deleteMentor`, plus `activePairingsForMentor` helper.
- Mentors nav item added to the Engagement Chair sidebar.

## v1.37.0 — 2026-04-10

### Compass Rebrand + Portal Redesign
- **Member Portal is now Compass.** Sidebar link renamed, header updated, welcome subtitle changed to "Your Compass."
- **Top nav simplified** to 5 items: Home, Forum, Calendar, Vendors, Notifications. Survey and Suggestion|Report Bug moved out of top nav.
- **Home page redesigned** with 4 destination cards: **Forum** (your forum home), **Learning** (chapter events + Executive Education), **Vendors** (rate and review any vendor in Arizona), **My EO** (interest groups, international travel — links to EO Global).
- Survey demoted to a slim banner below the cards ("Help us plan better events").
- **Footer added** to Compass home with Suggestion | Report Bug link + version number.
- **Forum tabs restructured**: new order is Parking Lot (promoted to first), Tools, Agenda (new stub), Calendar (forum-only, chapter events removed), Constitution, Partners, Roles, History.

## v1.36.0 — 2026-04-10

### Forum Home (new portal section)
- New **My Forum** page in the member portal (`/portal/forum`) — a shared workspace for every forum member with seven tabs:
  - **Roles** — assign/view forum roles per fiscal year (Moderator, Moderator Elect, Moderator Elect-Elect, Timer, Technology, Retreat Planner, Social). Moderator pipeline mirrors the president pipeline. Moderators can assign; members can view.
  - **Calendar** — per-forum event calendar (meetings, retreats, SAP visits, socials) with chapter calendar events overlaid in blue so forums don't double-book.
  - **Parking Lot** — placeholder linking to Reflections (standalone lift-out coming next).
  - **Tools** — placeholder for forum tools (Lifeline, Reflections templates, coaching worksheets).
  - **Constitution** — upload/view the forum's operating document.
  - **Partners** — SAP partner directory with per-member "Interested?" toggle and anonymous 5-star ratings + notes for the SAP Chair.
  - **History** — moderator lineage, past members archive with founding-member flags and year ranges.
- New data model (migration 018): `forum_role_assignments`, `forum_documents`, `forum_calendar_events`, `sap_forum_interest`, `sap_forum_ratings`, `forum_history_members`. `forums` table gets `founded_year`.
- New `forumStore.js` with full CRUD for all forum entities.
- Moderator controls (add/edit/delete) gated by role — moderators and admins see edit controls; members see read-only views.

## v1.35.0 — 2026-04-10

### Elect Roles & Partners Access
- **President Elect, President Elect-Elect, Learning Chair Elect** all have their own app surfaces with role switching.
- **Partners** nav item now visible to: Super Admin, President (all levels), Learning Chair (all levels), Executive Director, Experience Coordinator.
- Partners permission separated from Venues (`canViewPartners` vs `canViewVenues`).
- All president-level roles can switch into any chair view.
- Role switcher dropdown label dynamically reflects the user's actual role title.

## v1.34.2 — 2026-04-10

### Theme
- **Theme description** — presidents can explain what their theme means and how chairs should bring it to life (new `theme_description` field, migration 022).
- **ⓘ info icon** next to the theme name on Dashboard, Year Arc, Member Calendar, and President Dashboard. Click to see the full description in a modal.
- Theme field in Settings now shows for president, president_elect, and president_elect_elect roles.

## v1.34.1 — 2026-04-10

### Role Switcher
- President is now available as a switchable role in the dropdown (Super Admin can switch to President view).
- Roles in the Switch Role dropdown are sorted alphabetically by title.
- User's own role is excluded from the dropdown to avoid redundancy.

## v1.34.0 — 2026-04-10

### President Role
- **President as first-class app role** with its own dashboard — shows theme, budget allocation summary, all board/chair assignments for the selected fiscal year.
- Presidents can **switch into any chair's view** via the sidebar role switcher (same pattern as Super Admin).
- **Finance Chair** stubbed as a first-class role with its own surface.
- **`fiscal_year_budgets`** and **`fiscal_year_budget_lines`** tables (migration 021) — FY-level budget with per-chair line items, owned by the President.
- **Theme now derives from FY-scoped president assignment** — no more president-elect fallback. When viewing FY 2025–2026, shows Chad's "Dive In"; FY 2026–2027 shows Karl's "Every Day".
- Settings page accessible to President role.

## v1.33.0 — 2026-04-10

### Speaker Library + Pipeline Split
- **Speaker Library** — persistent, cross-year collection of all speakers. New "Library" tab on the Speakers page shows every speaker ever researched, with "Add to Pipeline" action.
- **Speaker Pipeline** — now fiscal-year-scoped. Pipeline stage, fit score, estimated/actual fees, contracts, W-9s, and notes are tracked per fiscal year via the new `speaker_pipeline` table (migration 020).
- Same speaker can appear in multiple years' pipelines — researched one year, picked up the next.
- Dashboard pipeline activity and Scenario planner now read from the year-scoped pipeline.
- Event candidate selection uses pipeline speakers for the current FY.
- Adding a speaker creates both a library entry and a pipeline entry for the active fiscal year.

## v1.32.3 — 2026-04-10

### Fiscal Year
- Scenarios are now fiscal-year-scoped (migration 019) — each year gets its own what-if planning.
- Speakers and venues remain cross-year (persistent).

## v1.32.2 — 2026-04-10

### Settings
- Settings link now visible in Super Admin's own nav (not just when viewing as Learning Chair).

## v1.32.1 — 2026-04-10

### Settings & Permissions
- Settings page (Board Positions & Assignments) restricted to Super Admin, Executive Director, and Experience Coordinator — no longer visible to Learning Chair or other individual chairs.
- Staff roles (Executive Director, Experience Coordinator, Executive Assistant) no longer show fiscal year fields — they're ongoing positions without year scoping.

## v1.32.0 — 2026-04-10

### Fiscal Year Infrastructure
- **Fiscal year selector** in admin sidebar — switch between current FY (2025–2026), next FY, and two years out. All admin roles can see it.
- **Year-scoped data**: events, chair reports, member scorecards, and navigator pairings are now filtered by the selected fiscal year.
- **President/theme context**: dashboard and calendar show the president name and theme for the selected fiscal year (from role assignments), not hardcoded values.
- **Database migration** (018): adds `fiscal_year` column to events, chair_reports, member_scorecards, and navigator_pairings; backfills existing data as "2025-2026".
- **Centralized fiscal year utilities** (`src/lib/fiscalYear.js`) replace ad-hoc FY calculations throughout the codebase.
- Replaced all hardcoded "FY 2026–2027" strings with dynamic values from the fiscal year context.

## v1.31.2 — 2026-04-10

### Portal
- Simplified header to show only the chapter logo — removed "Learning Chair / Member Portal" text to reflect the broader scope of the portal.

## v1.31.1 — 2026-04-10

### Reflections
- All forum mates can now edit any parking lot entry (scores, name, author) — not just the original author. "None of us are admins over anybody else." RLS updated to match (migration 017).
- Edit controls (inline score dropdowns, edit/delete buttons) persist after author reassignment.

## v1.31.0 — 2026-04-10

### SAP Partners
- **New SAP Partners page** — tier-grouped directory (Platinum/Gold/Silver/In-Kind) with expandable partner cards, contact management, forum-trained tracking, and list/tier view toggle
- SAP store with full CRUD for partners and contacts, optimistic writes, Supabase hydration
- Migration `015_sap_partners.sql` — evolves `saps` table to company-level records with tiers, adds `sap_contacts` table with RLS
- "Partners" nav item in Learning Chair sidebar

---

## v1.30.0 — 2026-04-10

### Reflections
- Parking lot entries now show author name (resolved from `author_member_id` → chapter members). Your own entries show "You."
- New **filter by forum mate** dropdown at the top of the parking lot — view everyone's items or just one person's
- Edit modal now includes an **author picker** so you can reassign entries to the correct forum mate (for items entered on someone else's behalf)

## v1.29.3 — 2026-04-08

### Reflections
- Parking lot Importance and Urgency scores are now inline-editable for the author of each entry — change the dropdown and it saves immediately. Combined score updates to match.

## v1.29.2 — 2026-04-08

### Reflections
- Parking lot items can now be added directly without first creating a reflection — "Add item" button on the parking lot view (in both empty state and list header)
- Dialog copy adapts: "Declare to parking lot" when coming from a reflection, "Add to parking lot" when standalone

## v1.29.1 — 2026-04-08

### Member Portal
- Sidebar "Member Portal" link now goes to the portal home (`/portal`) instead of the calendar

## v1.29.0 — 2026-04-08

### Member Engagement Chair (new role + module)
- New `engagement_chair` role and `canManageEngagement` permission (DB migration 013)
- New per-chair-role command center registry (`src/lib/chairRoles.js`) — each chair role gets its own sidebar title, landing page, and nav items. Adding a new chair role surface is a registry entry + routes; no Sidebar refactor.
- Sidebar dynamically reconfigures based on the user's effective role. The hardcoded "Learning Chair" title is gone — it now reflects whichever chair you're logged in as.
- **View-as switcher** (super admin only) in the sidebar header — impersonate any chair role to see the surface that role sees. Light impersonation: layout/nav swaps, underlying permissions still you.
- Login/root redirect (`/`) now sends each user to their chair role's `homePath` — Learning Chair to `/`, Engagement Chair to `/engagement`.
- New routes: `/engagement` (dashboard), `/engagement/navigators`, `/engagement/pairings`, `/engagement/library`
- **Navigators page** — appoint chapter members as Navigators with bio + capacity hint. Status pills (active/paused/retired), retire/restore/delete actions, soft over-capacity warning.
- **Compass spine + Navigator data model** (DB migration 012): `navigators`, `navigator_pairings`, `navigator_resources`, `navigator_sessions`, `compass_items`. The `compass_items` table is a single per-member personalized signal table that any chair module will write into — the architectural spine for the future personalized "Compass" home view.
- Conversation Library seeded with 10 starter resources — 2 honest FAQs and 7 "Ways to Get Value from EO" entries, contributed by tenured members and Sue Hesse.
- Stub pages for Pairings and Conversation Library (read-only for now).

## v1.28.1 — 2026-04-08

### Reflections
- Wired `/portal/reflections` route so the dashboard tile actually opens the module

## v1.28.0 — 2026-04-08

### Reflections (new module)
- New **Reflections** module in the Member Portal — private, per-forum journaling with three templates:
  - **Modern** — single deep dive with feelings pills, headline, context, significance, three "why is that important?" prompts, and a closing self-insight
  - **Hesse Classic** — MEPS one-word check-in, life-area grid (Professional / Personal-Family × Headline / Emotions / Significance), EQ challenge, IQ topics, and an update field
  - **EO Standard** — the classic 5% worksheet (Work / Family / Personal / Next 30–60 days × Feelings / Headline / Significance) with a group-exploration footer
- **Feelings library** seeded from the NVC inventory and the Hesse 5 Core Emotions (with intensity metadata). Members can add new feelings, which grow the global library.
- **Parking lot** — per-forum shared list of items declared from reflections. Author-named, scored 1–10 on importance and urgency, sorted by combined score. Author-only edit/delete. Parking lot entries are visible to forum-mates only; reflections themselves remain strictly private.
- **Clear all** wipes a member's reflections in their current forum; parking lot entries survive.
- Dashboard tile added to the Member Portal home.
- Empty states for members without a forum assignment — polite invitation to reach out to the Forum Chair.

## v1.27.1 — 2026-04-07

### Member Portal
- Added EO Core Values display to Member Portal Dashboard footer (Trust and Respect, Thirst for Learning, Think Big Be Bold, Together We Grow)

---

## v1.08.0 — 2026-03-13

### Core Platform
- Dashboard with budget overview, upcoming events, speaker pipeline, and Year Arc mini-view
- Year Arc Calendar with fiscal month layout, strategic phases, and event management
- Speaker pipeline with fit scoring, fee tracking, and candidate shortlisting
- Event management with speaker/venue linking and strategic category mapping
- Venue pipeline (Kanban + table views) with drag-and-drop stage management
- Venue Auto-Lookup via Claude AI + Google Places API (serverless function)
- Budget tracker with line items, speaker fee rollups, and remaining balance
- Scenario Planner for modeling speaker swap combinations and budget impact
- Settings page with chapter configuration and data export

### Authentication & Roles
- Supabase Magic Link authentication (passwordless)
- Invite-only whitelist via `member_invites` table
- Six roles: learning_chair, chapter_experience_coordinator, chapter_executive_director, committee_member, board_liaison, member
- Role-based permissions and nav visibility
- Auto role assignment from whitelist on first sign-in

### Member Portal
- Member-facing dashboard with upcoming events and quick links
- Member calendar with rolling 2-month detail window (future events show title only)
- Post-event survey engine with configurable questions and rating scales

### Admin Tools
- Member management with single add and bulk CSV/TSV import (~220 members)
- Survey results viewer
- Notifications page (placeholder)

### Branding & UI
- EO Arizona logo in sidebar and login page
- EO brand colors (Primary Blue, Navy, Pink, Coral)
- Consistent lucide icon usage across all pages
- Responsive design with mobile hamburger menu
- App versioning with sidebar footer display
