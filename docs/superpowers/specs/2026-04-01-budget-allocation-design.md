# Per-Event Budget Allocation System

**Date:** 2026-04-01
**Status:** Approved

## Problem

The budget system tracks costs bottom-up (add line items, they sum up) but has no top-down allocation concept. Users can't set "Event X gets $35K" and then see guardrails when committing money. The previous year's workflow was a Google Sheet with one row per event and cost columns — scannable, editable, and immediately clear. The app should replicate that mental model.

## Design Decisions

- **Option A chosen:** Evolve existing `budget_items` table (one row per event + category) rather than adding a separate allocations table. Matches the one-number-per-cell spreadsheet model.
- **Three-value model:** Budget (planned) → Contracted (committed) → Actual (paid). Two useful deltas: budget vs contracted (guardrail while booking), contracted vs actual (post-event reconciliation).
- **Guardrails are soft:** Visual warnings, not hard blocks. Nobody is prevented from going over budget.
- **Categories aligned to actual usage:** Drop `marketing`, add `dinner`. Final set of 7 categories.

## 1. Schema Changes

### Migration: Update `budget_items`

```sql
-- Rename estimated_amount → budget_amount
ALTER TABLE public.budget_items RENAME COLUMN estimated_amount TO budget_amount;

-- Add contracted_amount
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS contracted_amount integer DEFAULT 0;

-- Migrate any existing 'marketing' items to 'other' BEFORE updating constraint
UPDATE public.budget_items SET category = 'other' WHERE category = 'marketing';

-- Update category check constraint: drop marketing, add dinner
ALTER TABLE public.budget_items DROP CONSTRAINT IF EXISTS budget_items_category_check;
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_category_check
  CHECK (category IN ('speaker_fee', 'food_beverage', 'venue_rental', 'av_production', 'travel', 'dinner', 'other'));

NOTIFY pgrst, 'reload schema';
```

### Updated Constants

```javascript
export const BUDGET_CATEGORIES = [
  { id: 'speaker_fee', label: 'Speaker Fee', color: '#3d46f2' },
  { id: 'food_beverage', label: 'Food & Beverage', color: '#ff346e' },
  { id: 'venue_rental', label: 'Venue Rental', color: '#fa653c' },
  { id: 'av_production', label: 'AV Production', color: '#8b5cf6' },
  { id: 'travel', label: 'Travel', color: '#22c55e' },
  { id: 'dinner', label: 'Dinner', color: '#f59e0b' },
  { id: 'other', label: 'Other', color: '#a3a3c2' },
]
```

### Store Changes

- Rename `estimated_amount` references to `budget_amount` throughout `store.js`
- Add `contracted_amount` to CRUD operations
- Update computed values:
  - `totalBudgeted` = sum of all `budget_amount`
  - `totalContracted` = sum of all `contracted_amount`
  - `totalActual` = sum of all `actual_amount`
  - `budgetRemaining` = `chapter.total_budget - totalBudgeted`

### Mock Data

- Update `mockBudgetItems` to use `budget_amount` instead of `estimated_amount`
- Add `contracted_amount` values (can default to 0)
- Migrate any `marketing` category items to `other`

## 2. Budget Page — Spreadsheet Grid

Replace the current dual-panel (By Category / By Event) layout with a single editable spreadsheet-style grid.

### Grid Layout

| Month | Event | Speaker | Venue Fee | F&B | A/V | Speaker Fee | Travel | Dinner | Other | Total |
|-------|-------|---------|-----------|-----|-----|-------------|--------|--------|-------|-------|
| Aug   | The Lucky Years | Dr. David Agus | $2,000 | $47,041 | $6,370 | $25,000 | $3,000 | $0 | $2,866 | $86,278 |
| Sep   | Hyper Sales Growth | Morne Smit | $1,760 | $3,994 | $1,500 | $9,000 | $0 | $0 | $135 | $16,389 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Totals** | | | **$X** | **$X** | **$X** | **$X** | **$X** | **$X** | **$X** | **$X** |

### Behavior

- **Rows:** Events sorted by `month_index` (fiscal year: Aug → May)
- **Month, Event, Speaker columns:** Read-only, pulled from events/speakers data
- **Category columns:** Editable inline — click cell to edit, blur to save
- **Total column:** Computed sum of all categories for that row (read-only)
- **Footer row:** Column totals (read-only)
- **Auto-create:** When a user types a value into a cell for an event+category combo that doesn't have a `budget_items` row yet, auto-create one

### View Switcher

Toggle at top of grid: **Budget** | **Contracted** | **Actual**

- Switches which dollar field is displayed/edited in all cells
- Default view: Budget
- Visual indicator showing which view is active

### Budget Health Summary

Above the grid:
- Total Budget: `chapter.total_budget`
- Total Allocated: sum of all budget amounts
- Unallocated: total budget minus allocated
- Health bar (same color coding as current: green/amber/red)

## 3. Event Detail Page — Budget Tab

### Budget Summary Bar (top of tab)

Three columns side by side:

| Budget | Contracted | Actual |
|--------|------------|--------|
| $35,000 | $28,500 | — |

- Progress bar beneath: contracted / budget ratio
- Color: green (under 75%), amber (75-100%), red (over 100%)
- Label: "$6,500 remaining" or "$2,000 over budget"

### Category Rows

Replace free-form line item table with structured category rows:

| Category | Budget | Contracted | Actual |
|----------|--------|------------|--------|
| Speaker Fee | $15,000 | $15,000 | — |
| F&B | $10,000 | $8,500 | — |
| Venue Rental | $5,000 | $5,000 | — |
| AV Production | $3,000 | — | — |
| Travel | $1,500 | — | — |
| Dinner | — | — | — |
| Other | $500 | — | — |
| **Total** | **$35,000** | **$28,500** | **—** |

- All three columns are editable inline
- Contracted cell turns amber if it approaches budget (>75%), red if it exceeds budget
- Dash (—) shown for $0 / empty values for cleaner look
- Row auto-created in DB when user enters a value

### Auto-populated Hints

- When a speaker is assigned: Speaker Fee budget cell shows a hint/placeholder from the speaker's fee range (not auto-written)
- When a venue is assigned: Venue Rental budget cell shows a hint from `venues.base_rental_cost`

## 4. Guardrails

### Event Detail Page

- **Inline cell warning:** When contracted > budget for a category, the contracted cell gets a red border and tooltip "Over budget by $X"
- **Tab label:** "Budget ($35K)" — number turns red if total contracted > total budget
- **Summary bar:** Progress bar goes red, label changes to "Over budget by $X"

### Budget Page Grid

- **Cell highlighting:** Cells where contracted > budget for that event+category get a red background tint
- **Column totals:** Red text if total contracted exceeds total budget for that category
- **Unallocated warning:** If sum of all event budgets exceeds `chapter.total_budget`, show a warning banner

### Venue Page

- No changes. Venue costs are informational; guardrails live on the event where money is committed.

## 5. Files Affected

### New/Modified Files

| File | Change |
|------|--------|
| `supabase/migrations/010_budget_three_values.sql` | Schema migration |
| `src/lib/constants.js` | Update BUDGET_CATEGORIES |
| `src/lib/store.js` | Rename estimated→budget, add contracted, update computed values |
| `src/lib/mockData.js` | Update mock budget items |
| `src/pages/BudgetPage.jsx` | Complete rewrite to spreadsheet grid |
| `src/pages/EventDetailPage.jsx` | Update Budget tab with category rows + summary bar |
| `src/components/layout/Topbar.jsx` | Update budget display if it references estimated |

### Files to Check for `estimated_amount` References

- `src/pages/ScenarioPage.jsx` — update to use `budget_amount`
- `src/pages/DashboardPage.jsx` — if it shows budget info
- `src/pages/CoordinatorPage.jsx` — if it references budget
- Any component importing from store that uses `totalEstimated`

## 6. Out of Scope

- Hard budget caps (preventing over-budget entries)
- Approval workflows for over-budget items
- Per-category budget targets at the chapter level
- Notes field per line item (description field is sufficient)
- Venue page integration
