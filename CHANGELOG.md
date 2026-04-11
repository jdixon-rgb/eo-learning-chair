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
