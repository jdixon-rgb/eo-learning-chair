# OurChapter OS — Session Handoff (2026-04-18)

**Repo:** `jdixon-rgb/eo-learning-chair` · **Current main:** v1.66.3 · **Open PRs:** none

This document hands off context from a long Claude Code session so the next session can pick up cold. Read this first, then confirm with the user before taking action.

---

## Project one-liner

**OurChapter OS** at `app.ourchapteros.com` — multi-tenant SaaS for EO chapters. Built by JSD (John-Scott Dixon) as a Trojan horse for his consulting business **Aidan Taylor App Works**. Single codebase, `chapter_id` partitioning via RLS. Stack: React 19 + Vite 7 + Tailwind v4 + Supabase.

---

## Non-negotiable user mandates

1. **Bump version + add CHANGELOG entry for every PR.** Version source: `src/lib/version.js`. SemVer. Current: `1.66.3`.
2. **Never push to main directly.** Always feature/fix branch → PR → merge (squash).
3. **Ask before merging.** User explicitly says "yes" / "merge" before each merge.
4. **Keep text between tool calls ≤25 words, final responses ≤100 words.** User values brevity.
5. **No emojis anywhere** (code, commits, PRs, docs) unless explicitly requested.
6. **Le Corbusier palette** — ivory (`#f6f1e9`), céruléen (`#4a6d8c`), ocre rouge (`#c84b0c`), english green (`#1a5c3a`), oxblood (`#7d1e1e`), ink (`#1a1714`). No dark-theme leftovers (`text-white` on `bg-muted/30` = invisible on cream).
7. **Builder attribution** — "Built by an EO member for EO members · Aidan Taylor App Works" (website not live yet, so unlinked). Never add solicitation taglines (EO bylaws).

---

## What shipped today (v1.64.0 → v1.66.3)

| Version | Summary |
|---|---|
| v1.64.0 | SAPs auto-surface in member Vendors directory with tier badges |
| v1.65.0 | Vendors directory groups by category in the "All" view |
| v1.65.1 | SAP Industry is a dropdown matching `VENDOR_CATEGORIES` (legacy values preserved as "(legacy)") |
| v1.65.2 | Vendors page readability — `text-white` leftovers + dark Modal bg swept |
| v1.66.0 | "View as Member" option added to role switcher |
| v1.66.1 | `ChapterSwitcher` restored to sidebar context block (super-admin was stuck in EO Shanghai) |
| v1.66.2 | Members nav item scoped to chapter staff only (CED + CEC + super_admin). Chairs no longer see it. |
| v1.66.3 | `budget_items` + `contract_checklists` fetch now scoped to active FY — fixes Dashboard Speaker Fees showing $138k while Budget page showed $108k (correct = $108k) |

---

## Pending items (flagged but not yet worked)

1. **Mobile member edit/add is difficult** — user flagged; needs a screenshot or field-by-field inspection. Can't test UI directly.
2. **"Blink area" past status** on the member page — user mentioned this but I never got clarification on what/where. Ask.
3. **Admin-side SLP UI** — chapter staff currently edit SLPs via Supabase directly. Need a UI for CED/CEC/President/LC to edit any SLP in their chapter (RLS is already in place via migration 050).
4. **`/president/budget` route broken** — referenced in `president` + `finance_chair` + `chapter_executive_director` + `chapter_experience_coordinator` chair configs but no route exists. Latent crash if anyone clicks "Chapter Budget" nav. Low-risk stub needed.
5. **Chair Chat** — per-message Stripe billing, Claude translation with "Translated from Mandarin" markers. Regional funding model discussed. Big feature, ask before starting.
6. **Narrative demo** — Restoration HQ / Fly Cuisine style. User will build this externally; not our work.

---

## Current auth / role structure

**Roles** (from `src/lib/permissions.js`):
- `super_admin` — platform-only surface (Platform Dashboard + Analytics)
- `president`, `president_elect`, `president_elect_elect` → share President surface (aliased in `src/lib/chairRoles.js`)
- `learning_chair`, `learning_chair_elect` → Learning Chair surface
- `sap_chair` — new; homePath `/partners`
- `engagement_chair` — Navigators / Mentors / Pairings / Conversation Library
- `finance_chair` — dashboard is a stub (`src/pages/finance/FinanceDashboard.jsx`)
- `chapter_executive_director`, `chapter_experience_coordinator` — chapter staff
- `board_liaison`, `committee_member` — fallback to Learning Chair config
- `member` — just added (v1.66.0) as a role-switcher target; uses `MemberPortalLayout`
- `sap_contact` — external; uses `SAPPortalLayout`

**Role-switcher:** super_admin / president / chapter staff can `setViewAsRole(role)`. `effectiveRole` drives all nav + gating. `profile.role` stays authoritative for route access (ProtectedRoute checks it, with a bypass list for super_admin/president/staff).

**Permission gates** live in `FEATURE_PERMISSIONS` (`src/lib/permissions.js`). Each has a list of allowed roles. `canManageMembers` was just scoped to staff-only in v1.66.2.

---

## Critical files / patterns

**State:**
- `src/lib/store.js` — chapter-scoped event/speaker/venue/budget_item store. **Events fetch is scoped to chapter_id + fiscal_year. Budget_items fetch now is too (v1.66.3).**
- `src/lib/chapter.jsx` — active chapter context. Super-admins load all chapters; regular users see only their own.
- `src/lib/fiscalYearContext.jsx` — active FY context.
- `src/lib/boardStore.js` — board positions, chair budget allocations, chapter_members.
- `src/lib/vendorStore.js` — vendors + reviews. Exports `VENDOR_CATEGORIES` (canonical list).
- `src/lib/sapStore.js` — SAP partners + contacts + connect requests.
- `src/lib/auth.jsx` — session, profile, viewAsRole, effectiveRole, canSwitchRoles.

**Layouts:**
- `src/components/layout/AppLayout.jsx` — admin/chair surface (sidebar)
- `src/components/layout/Sidebar.jsx` — collapsible context block (ChapterSwitcher + FYSwitcher + Role switcher). Always defaults collapsed on load.
- `src/components/layout/TopBar.jsx` — minimal: chapter name bold + notifications bell
- `src/components/layout/MemberPortalLayout.jsx` — member surface (top nav, community-green accent). Has "Admin" back-link that clears `viewAsRole` on click.
- `src/components/layout/SAPPortalLayout.jsx` — external SAP partner surface.

**Routes:** `src/App.jsx`. Each route wrapped in `ProtectedRoute allowedRoles={...}`.

---

## Git conventions

- Branch naming: `feat/short-name`, `fix/short-name`. Never `claude/*` unless the initial task brief said so.
- Commit message: first line is a conventional-commit style summary (`feat:`, `fix:`), then a paragraph explaining the *why*, then the version bump line.
- Commits end with the `https://claude.ai/code/session_...` trailer that the harness injects automatically.
- PR description always has a **Summary** section and a **Test plan** checklist.
- After every merge: `git checkout main && git pull origin main && git branch -D feat/...`.

---

## Recent gotchas / anti-patterns

- **TDZ ReferenceError** — `useCallback` with a dep that's a `useMemo` declared LATER in the component. Hoist the `useMemo` above the `useCallback`. Example: `VendorsPage.jsx` v1.63.1.
- **Cross-FY / cross-chapter data bleed** — always scope fetches to both `chapter_id` and `fiscal_year` where applicable. Latest example: v1.66.3.
- **Merge conflicts on `version.js` + `CHANGELOG.md`** happen whenever two branches are in flight. Resolution pattern: keep the higher version number, inline both CHANGELOG entries in descending-version order, drop placeholder "*(in flight on sibling PR)*" notes once the sibling lands.
- **Dark-theme leftovers** — `text-white` on `bg-muted/30` and hardcoded `bg-[#0f1724]` / `bg-[#1a2332]` are invisible on cream. Sweep the file when you encounter one.

---

## How to start the next session

1. `git checkout main && git pull origin main`
2. Confirm `src/lib/version.js` shows `1.66.3`
3. Read this handoff + the top of `CHANGELOG.md` (latest 3–4 entries)
4. Ask the user which pending item to tackle next, **don't assume.**

---

## Open questions for the user

- Which pending item first?
- Any new feedback from the latest deploy?
- Does the Budget Allocation dashboard widget now match the Budget page (v1.66.3 verification)?
