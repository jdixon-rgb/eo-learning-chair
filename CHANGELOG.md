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
