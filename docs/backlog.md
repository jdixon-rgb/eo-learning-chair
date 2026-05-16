# Backlog — EO Learn Share (OurChapter OS)

> Everything that came up, didn't make the current release, isn't dead. Sorted by status.
> See the [Capture and track a project backlog](https://github.com/Aidan-Taylor-Marketing/playbook/blob/main/content/playbooks/capture-and-track-a-project-backlog.mdx) playbook for the discipline.

**Naming note:** the user refers to this project as **EO Learn Share**. The internal product name in `docs/HANDOFF.md` is **OurChapter OS**; the repo is `eo-learning-chair`. All three names point at the same codebase at `app.ourchapteros.com`.

**Seeded from:** `docs/HANDOFF.md` "Pending items (flagged but not yet worked)" section, dated 2026-04-18. Items below preserve the original framing from that handoff; new items should be added per the per-item shape in the Playbook.

---

## Phase 2 candidates

> Substantial features that came up but weren't built. Source for the next planning conversation.

- **[2026-04-18] Admin-side SLP UI.** Source: handoff doc item 3. Notes: chapter staff currently edit SLPs via Supabase directly. Need a UI for CED/CEC/President/LC to edit any SLP in their chapter. RLS is already in place via migration 050 — this is UI work on top of an existing schema, not a new feature from scratch.
- **[2026-04-18] Chair Chat.** Source: handoff doc item 5. Notes: per-message Stripe billing, Claude translation with "Translated from Mandarin" markers. Regional funding model discussed. **Big feature** — flagged as "ask before starting." Probably a Phase 2 conversation rather than a slip-it-in change.

---

## Awaiting client decision

> Parked pending clarification or a decision. Each entry has an "ask by" date.

- **[2026-04-18] Mobile member edit/add UX issues.** Source: handoff doc item 1. Notes: user flagged this is difficult on mobile but didn't provide specifics. Needs a screenshot or field-by-field inspection — can't test UI directly. **Ask by:** next planning conversation. Until then, blocked on user input.
- **[2026-04-18] "Blink area" past status on the member page.** Source: handoff doc item 2. Notes: user mentioned this but never clarified what or where. **Ask by:** next planning conversation. Until clarified, can't action.

---

## Internal ideas

> Engineering or product ideas surfaced internally but not yet raised with the user. Technical hygiene also belongs here.

- **[2026-04-18] `/president/budget` route broken.** Source: handoff doc item 4. Notes: referenced in `president` + `finance_chair` + `chapter_executive_director` + `chapter_experience_coordinator` chair configs, but no route exists. Latent crash if anyone clicks "Chapter Budget" nav. **Low-risk stub needed** — small ticket, fix when convenient.

---

## Killed

> Items explicitly decided against, with a date and reason.

- **[2026-04-18] Narrative demo (Restoration HQ / Fly Cuisine style) for OurChapter OS.** Source: handoff doc item 6. Reason: user will build this externally; not our work on this codebase.
