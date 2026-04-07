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
