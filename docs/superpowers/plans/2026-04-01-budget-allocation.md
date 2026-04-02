# Per-Event Budget Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-up budget tracking with a spreadsheet-style per-event allocation grid, add contracted amounts, update categories, and surface budget guardrails.

**Architecture:** Evolve existing `budget_items` table: rename `estimated_amount` → `budget_amount`, add `contracted_amount`, update category enum (drop `marketing`, add `dinner`). Budget page becomes an editable spreadsheet grid. Event detail budget tab becomes structured category rows with three-value editing.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, Supabase (PostgreSQL), existing store pattern with optimistic updates.

**Spec:** `docs/superpowers/specs/2026-04-01-budget-allocation-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/010_budget_three_values.sql` | Create | Schema migration |
| `src/lib/constants.js` | Modify (lines 79-87) | Update BUDGET_CATEGORIES |
| `src/lib/mockData.js` | Modify (lines 634-687) | Rename estimated→budget, add contracted |
| `src/lib/store.js` | Modify (lines 256-273, 437-439) | Rename fields, add contracted, update computed values |
| `src/pages/BudgetPage.jsx` | Rewrite | Spreadsheet grid |
| `src/pages/EventDetailPage.jsx` | Modify (lines 53-55, 449-530) | Structured category rows with three values |
| `src/components/layout/Topbar.jsx` | Modify (lines 8, 16-17, 46) | Rename totalEstimated → totalBudgeted |
| `src/pages/DashboardPage.jsx` | Modify (lines 21, 25-26, 42-44, 238-255) | Rename totalEstimated → totalBudgeted |
| `src/pages/ScenarioPage.jsx` | Modify (lines 74-76, 88-93) | Rename estimated_amount → budget_amount |

---

### Task 1: Schema Migration

**Files:**
- Create: `supabase/migrations/010_budget_three_values.sql`

- [ ] **Step 1: Create migration file**

```sql
-- ============================================================
-- EO Learning Chair -- Budget Three-Value Model
-- Run AFTER 009_speaker_documents.sql
-- Renames estimated_amount → budget_amount, adds contracted_amount,
-- updates category enum (drop marketing, add dinner)
-- ============================================================

-- Migrate any existing 'marketing' items to 'other' BEFORE updating constraint
UPDATE public.budget_items SET category = 'other' WHERE category = 'marketing';

-- Rename estimated_amount → budget_amount
ALTER TABLE public.budget_items RENAME COLUMN estimated_amount TO budget_amount;

-- Add contracted_amount
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS contracted_amount integer DEFAULT 0;

-- Update category check constraint: drop marketing, add dinner
ALTER TABLE public.budget_items DROP CONSTRAINT IF EXISTS budget_items_category_check;
ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_category_check
  CHECK (category IN ('speaker_fee', 'food_beverage', 'venue_rental', 'av_production', 'travel', 'dinner', 'other'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/010_budget_three_values.sql
git commit -m "feat: add budget three-value migration (budget/contracted/actual)"
```

---

### Task 2: Update Constants

**Files:**
- Modify: `src/lib/constants.js` (lines 79-87)

- [ ] **Step 1: Replace BUDGET_CATEGORIES**

Replace lines 79-87 in `src/lib/constants.js`:

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

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.js
git commit -m "feat: update budget categories — add dinner, drop marketing"
```

---

### Task 3: Update Mock Data

**Files:**
- Modify: `src/lib/mockData.js` (lines 634-687)

- [ ] **Step 1: Rename estimated_amount → budget_amount in all mockBudgetItems**

Replace every `estimated_amount:` with `budget_amount:` and add `contracted_amount: 0` to each item. The full replacement for lines 634-687:

```javascript
export const mockBudgetItems = [
  // August — Salim Ismail (AI Kickoff)
  { id: uuid(), event_id: 'evt-aug', category: 'speaker_fee', description: 'Salim Ismail keynote', budget_amount: 40000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-aug', category: 'food_beverage', description: 'Kickoff dinner', budget_amount: 15000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-aug', category: 'venue_rental', description: 'Ballroom rental', budget_amount: 5000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-aug', category: 'av_production', description: 'AV + screens', budget_amount: 5000, contracted_amount: 0, actual_amount: null },

  // September — Brad Montague
  { id: uuid(), event_id: 'evt-sep', category: 'speaker_fee', description: 'Brad Montague keynote', budget_amount: 15000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-sep', category: 'food_beverage', description: 'Dinner', budget_amount: 10000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-sep', category: 'venue_rental', description: 'Heard Museum', budget_amount: 4000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-sep', category: 'av_production', description: 'AV', budget_amount: 3000, contracted_amount: 0, actual_amount: null },

  // October — Jim Abbott
  { id: uuid(), event_id: 'evt-oct', category: 'speaker_fee', description: 'Jim Abbott keynote', budget_amount: 25000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-oct', category: 'food_beverage', description: 'Catering at field', budget_amount: 12000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-oct', category: 'venue_rental', description: 'Spring Training Field', budget_amount: 3000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-oct', category: 'av_production', description: 'Outdoor AV setup', budget_amount: 5000, contracted_amount: 0, actual_amount: null },

  // November — Priya Parker
  { id: uuid(), event_id: 'evt-nov', category: 'speaker_fee', description: 'Priya Parker keynote', budget_amount: 32000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-nov', category: 'food_beverage', description: 'Dinner at DBG', budget_amount: 12000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-nov', category: 'venue_rental', description: 'Ullman Terrace', budget_amount: 6000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-nov', category: 'av_production', description: 'AV', budget_amount: 4000, contracted_amount: 0, actual_amount: null },

  // January 7 — Jeffersonian Dinner
  { id: uuid(), event_id: 'evt-jeff', category: 'food_beverage', description: 'Jeffersonian dinner for 64', budget_amount: 8000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-jeff', category: 'venue_rental', description: 'Next Level', budget_amount: 3000, contracted_amount: 0, actual_amount: null },

  // January — Dr. Paul Davies + Wesley Huff
  { id: uuid(), event_id: 'evt-jan', category: 'speaker_fee', description: 'Dr. Paul Davies', budget_amount: 15000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-jan', category: 'speaker_fee', description: 'Wesley Huff', budget_amount: 10000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-jan', category: 'food_beverage', description: 'Dinner', budget_amount: 12000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-jan', category: 'venue_rental', description: 'The Dorrance DOME', budget_amount: 5000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-jan', category: 'av_production', description: 'AV', budget_amount: 3000, contracted_amount: 0, actual_amount: null },

  // February — Dr. Gary Chapman
  { id: uuid(), event_id: 'evt-feb', category: 'speaker_fee', description: 'Dr. Gary Chapman keynote', budget_amount: 15000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-feb', category: 'food_beverage', description: 'Rose Ceremony dinner', budget_amount: 12000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-feb', category: 'venue_rental', description: 'The Wrigley Mansion', budget_amount: 7000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-feb', category: 'av_production', description: 'AV', budget_amount: 3500, contracted_amount: 0, actual_amount: null },

  // April — Indre Viskontas
  { id: uuid(), event_id: 'evt-apr', category: 'speaker_fee', description: 'Indre Viskontas lecture-performance', budget_amount: 15000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-apr', category: 'food_beverage', description: 'Dinner', budget_amount: 10000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-apr', category: 'venue_rental', description: 'Music venue', budget_amount: 5000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-apr', category: 'av_production', description: 'AV (venue has built-in)', budget_amount: 2000, contracted_amount: 0, actual_amount: null },

  // May — Gratitude Gala
  { id: uuid(), event_id: 'evt-may', category: 'food_beverage', description: 'Gala dinner', budget_amount: 20000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-may', category: 'venue_rental', description: 'Gala venue TBD', budget_amount: 8000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-may', category: 'av_production', description: 'AV + lighting', budget_amount: 5000, contracted_amount: 0, actual_amount: null },
  { id: uuid(), event_id: 'evt-may', category: 'other', description: 'Awards, recognition, decor', budget_amount: 5000, contracted_amount: 0, actual_amount: null },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mockData.js
git commit -m "feat: update mock budget items with budget_amount and contracted_amount"
```

---

### Task 4: Update Store

**Files:**
- Modify: `src/lib/store.js` (lines 256-273, 437-439, 441-507)

- [ ] **Step 1: Update addBudgetItem default shape**

In `src/lib/store.js`, find the `addBudgetItem` callback (line ~256). No changes needed to the function itself — it accepts any shape. But update the computed values.

- [ ] **Step 2: Update computed values (lines 437-439)**

Replace:

```javascript
  const totalBudgetUsed = budgetItems.reduce((sum, item) => sum + (item.actual_amount || item.estimated_amount || 0), 0)
  const totalEstimated = budgetItems.reduce((sum, item) => sum + (item.estimated_amount || 0), 0)
  const budgetRemaining = chapter.total_budget - totalEstimated
```

With:

```javascript
  const totalBudgeted = budgetItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0)
  const totalContracted = budgetItems.reduce((sum, item) => sum + (item.contracted_amount || 0), 0)
  const totalActualSpent = budgetItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
  const budgetRemaining = chapter.total_budget - totalBudgeted
```

- [ ] **Step 3: Update the context value export (lines 441-507)**

In the `value` object, replace:

```javascript
    totalBudgetUsed,
    totalEstimated,
    budgetRemaining,
```

With:

```javascript
    totalBudgeted,
    totalContracted,
    totalActualSpent,
    budgetRemaining,
```

- [ ] **Step 4: Add upsertBudgetItem callback**

Add this new callback after `deleteBudgetItem` (around line 273). The spreadsheet grid needs to auto-create rows when a user types into an empty cell:

```javascript
  const upsertBudgetItem = useCallback((eventId, category, field, value) => {
    const existing = budgetItems.find(b => b.event_id === eventId && b.category === category)
    if (existing) {
      updateBudgetItem(existing.id, { [field]: value })
    } else {
      addBudgetItem({ event_id: eventId, category, description: '', budget_amount: 0, contracted_amount: 0, actual_amount: null, [field]: value })
    }
  }, [budgetItems, updateBudgetItem, addBudgetItem])
```

Add `upsertBudgetItem` to the context value object in the "Budget ops" section:

```javascript
    // Budget ops
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    upsertBudgetItem,
```

- [ ] **Step 5: Verify build compiles**

```bash
npx vite build 2>&1 | tail -5
```

Expected: Build succeeds (consumer pages will have warnings about `totalEstimated` being undefined, but won't crash since they use `|| 0` patterns).

- [ ] **Step 6: Commit**

```bash
git add src/lib/store.js
git commit -m "feat: update store with budget_amount, contracted_amount, upsertBudgetItem"
```

---

### Task 5: Update Topbar

**Files:**
- Modify: `src/components/layout/Topbar.jsx` (lines 8, 16-17, 46)

- [ ] **Step 1: Update Topbar to use new store values**

In `src/components/layout/Topbar.jsx`, line 8, replace:

```javascript
  const { chapter, totalEstimated, budgetRemaining } = useStore()
```

With:

```javascript
  const { chapter, totalBudgeted, budgetRemaining } = useStore()
```

Line 16-17, replace:

```javascript
  const budgetPercent = learningBudget > 0 ? ((totalEstimated / learningBudget) * 100).toFixed(0) : 0
  const remaining = learningBudget - totalEstimated
```

With:

```javascript
  const budgetPercent = learningBudget > 0 ? ((totalBudgeted / learningBudget) * 100).toFixed(0) : 0
  const remaining = learningBudget - totalBudgeted
```

Line 46, replace:

```javascript
            <span className="hidden sm:inline">{formatCurrency(totalEstimated)} / </span>
```

With:

```javascript
            <span className="hidden sm:inline">{formatCurrency(totalBudgeted)} / </span>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Topbar.jsx
git commit -m "fix: topbar uses totalBudgeted instead of totalEstimated"
```

---

### Task 6: Update DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.jsx` (lines 21, 25-26, 42-44, 238-255)

- [ ] **Step 1: Update DashboardPage budget references**

Read `src/pages/DashboardPage.jsx` and replace all occurrences of `totalEstimated` with `totalBudgeted` and `estimated_amount` with `budget_amount`.

Specifically:

Line 21 — in the destructuring from `useStore()`, replace `totalEstimated` with `totalBudgeted`.

Lines 25-26 — replace:
```javascript
  const remaining = learningBudget - totalEstimated
```
With:
```javascript
  const remaining = learningBudget - totalBudgeted
```

Lines 42-44 — replace:
```javascript
  const budgetPercent = learningBudget > 0 ? (totalEstimated / learningBudget) * 100 : 0
```
With:
```javascript
  const budgetPercent = learningBudget > 0 ? (totalBudgeted / learningBudget) * 100 : 0
```

In the budget allocation section (around lines 238-255), replace any `estimated_amount` references with `budget_amount` in the reduce calculations.

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "fix: dashboard uses totalBudgeted and budget_amount"
```

---

### Task 7: Update ScenarioPage

**Files:**
- Modify: `src/pages/ScenarioPage.jsx` (lines 74-76, 88-93)

- [ ] **Step 1: Update ScenarioPage budget field references**

Read `src/pages/ScenarioPage.jsx` and replace all `estimated_amount` references with `budget_amount`.

Line ~75 — replace:
```javascript
      const eventNonSpeakerCost = eventLineItems.reduce((sum, b) => sum + (b.estimated_amount || 0), 0)
```
With:
```javascript
      const eventNonSpeakerCost = eventLineItems.reduce((sum, b) => sum + (b.budget_amount || 0), 0)
```

Line ~89 — replace:
```javascript
    const nonSpeakerCosts = budgetItems.filter(b => b.category !== 'speaker_fee').reduce((sum, b) => sum + (b.estimated_amount || 0), 0)
```
With:
```javascript
    const nonSpeakerCosts = budgetItems.filter(b => b.category !== 'speaker_fee').reduce((sum, b) => sum + (b.budget_amount || 0), 0)
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ScenarioPage.jsx
git commit -m "fix: scenario page uses budget_amount instead of estimated_amount"
```

---

### Task 8: Rewrite BudgetPage — Spreadsheet Grid

**Files:**
- Rewrite: `src/pages/BudgetPage.jsx`

- [ ] **Step 1: Rewrite BudgetPage.jsx**

Replace the entire file with a spreadsheet-style grid. The new component:

```jsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { BUDGET_CATEGORIES, FISCAL_MONTHS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DollarSign, AlertTriangle } from 'lucide-react'

const VIEW_MODES = [
  { id: 'budget_amount', label: 'Budget' },
  { id: 'contracted_amount', label: 'Contracted' },
  { id: 'actual_amount', label: 'Actual' },
]

function EditableCell({ value, onChange, warn, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(value || '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const num = draft === '' ? 0 : parseInt(draft, 10)
    if (!isNaN(num) && num !== (value || 0)) {
      onChange(num)
    }
  }

  if (editing) {
    return (
      <input
        type="number"
        className="w-full h-7 px-1.5 text-xs text-right bg-white border border-eo-blue rounded focus:outline-none focus:ring-1 focus:ring-eo-blue"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
      />
    )
  }

  return (
    <div
      className={`h-7 px-1.5 text-xs text-right flex items-center justify-end cursor-pointer rounded hover:bg-accent/50 transition-colors ${warn ? 'bg-red-50 text-eo-pink font-medium' : ''} ${className}`}
      onClick={startEdit}
    >
      {value ? formatCurrency(value) : '—'}
    </div>
  )
}

export default function BudgetPage() {
  const navigate = useNavigate()
  const { chapter, events, speakers, budgetItems, totalBudgeted, budgetRemaining, upsertBudgetItem } = useStore()
  const [viewMode, setViewMode] = useState('budget_amount')

  const budgetPercent = chapter.total_budget > 0 ? (totalBudgeted / chapter.total_budget) * 100 : 0
  const budgetHealth = budgetPercent > 90 ? 'critical' : budgetPercent > 75 ? 'warning' : 'healthy'

  // Sort events by month_index (fiscal year order)
  const sortedEvents = [...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99))

  // Get value for a cell
  const getCellValue = useCallback((eventId, categoryId) => {
    const item = budgetItems.find(b => b.event_id === eventId && b.category === categoryId)
    return item ? (item[viewMode] || 0) : 0
  }, [budgetItems, viewMode])

  // Get budget value for warning comparison
  const getBudgetValue = useCallback((eventId, categoryId) => {
    const item = budgetItems.find(b => b.event_id === eventId && b.category === categoryId)
    return item ? (item.budget_amount || 0) : 0
  }, [budgetItems])

  // Get event row total
  const getEventTotal = useCallback((eventId) => {
    return budgetItems
      .filter(b => b.event_id === eventId)
      .reduce((sum, b) => sum + (b[viewMode] || 0), 0)
  }, [budgetItems, viewMode])

  // Get column total
  const getColumnTotal = useCallback((categoryId) => {
    return budgetItems
      .filter(b => b.category === categoryId)
      .reduce((sum, b) => sum + (b[viewMode] || 0), 0)
  }, [budgetItems, viewMode])

  // Grand total
  const grandTotal = budgetItems.reduce((sum, b) => sum + (b[viewMode] || 0), 0)

  // Warnings
  const warnings = []
  const eventsWithoutBudget = events.filter(e => !budgetItems.some(b => b.event_id === e.id))
  if (eventsWithoutBudget.length > 0) {
    warnings.push(`${eventsWithoutBudget.length} event(s) have no budget allocated.`)
  }
  if (budgetHealth === 'critical') {
    warnings.push(`Budget is ${budgetPercent.toFixed(0)}% allocated — only ${formatCurrency(budgetRemaining)} remaining.`)
  }
  const unallocated = chapter.total_budget - totalBudgeted
  if (unallocated < 0) {
    warnings.push(`Over-allocated by ${formatCurrency(Math.abs(unallocated))} — total event budgets exceed chapter budget.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatCurrency(chapter.total_budget)} total budget &middot; FY 2026–2027
        </p>
      </div>

      {/* Budget Health Bar */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Budget Health</h3>
          <Badge variant={budgetHealth === 'critical' ? 'destructive' : budgetHealth === 'warning' ? 'coral' : 'success'}>
            {budgetHealth === 'critical' ? 'Critical' : budgetHealth === 'warning' ? 'Warning' : 'Healthy'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1">
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetHealth === 'critical' ? 'bg-eo-pink' : budgetHealth === 'warning' ? 'bg-eo-coral' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold w-14 text-right">{budgetPercent.toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Budgeted</p>
            <p className="text-lg font-bold">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unallocated</p>
            <p className={`text-lg font-bold ${unallocated < 0 ? 'text-eo-pink' : 'text-green-600'}`}>
              {formatCurrency(unallocated)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={`text-lg font-bold ${budgetRemaining < 50000 ? 'text-eo-pink' : 'text-green-600'}`}>
              {formatCurrency(budgetRemaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-eo-coral/30 bg-orange-50 p-4 space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-eo-coral shrink-0 mt-0.5" />
              <span className="text-eo-navy">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* View Switcher + Grid */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-3 border-b">
          <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
          {VIEW_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === mode.id
                  ? 'bg-eo-blue text-white'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Spreadsheet grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground w-16">Month</th>
                <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground min-w-[140px]">Event</th>
                <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground min-w-[100px]">Speaker</th>
                {BUDGET_CATEGORIES.map(cat => (
                  <th key={cat.id} className="text-right py-2.5 px-1.5 font-semibold text-muted-foreground min-w-[90px]">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.label}
                    </div>
                  </th>
                ))}
                <th className="text-right py-2.5 px-3 font-semibold min-w-[90px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map(event => {
                const month = event.month_index != null ? FISCAL_MONTHS[event.month_index] : null
                const speaker = speakers.find(s => s.id === event.speaker_id)
                const eventTotal = getEventTotal(event.id)

                return (
                  <tr key={event.id} className="border-b last:border-0 hover:bg-accent/20">
                    <td className="py-1.5 px-3 text-muted-foreground font-medium">
                      {month?.shortName || '—'}
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="text-left font-medium text-eo-blue hover:underline truncate max-w-[140px] block cursor-pointer"
                      >
                        {event.title}
                      </button>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[100px]">
                      {speaker?.name || '—'}
                    </td>
                    {BUDGET_CATEGORIES.map(cat => {
                      const cellValue = getCellValue(event.id, cat.id)
                      const budgetValue = getBudgetValue(event.id, cat.id)
                      const isOverBudget = viewMode === 'contracted_amount' && cellValue > budgetValue && budgetValue > 0

                      return (
                        <td key={cat.id} className="py-1.5 px-1">
                          <EditableCell
                            value={cellValue}
                            onChange={val => upsertBudgetItem(event.id, cat.id, viewMode, val)}
                            warn={isOverBudget}
                          />
                        </td>
                      )
                    })}
                    <td className="py-1.5 px-3 text-right font-semibold">
                      {eventTotal > 0 ? formatCurrency(eventTotal) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td colSpan={3} className="py-2.5 px-3">Totals</td>
                {BUDGET_CATEGORIES.map(cat => (
                  <td key={cat.id} className="py-2.5 px-1.5 text-right">
                    {formatCurrency(getColumnTotal(cat.id))}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right text-sm">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/BudgetPage.jsx
git commit -m "feat: rewrite budget page as editable spreadsheet grid with three-value model"
```

---

### Task 9: Rewrite EventDetailPage Budget Tab

**Files:**
- Modify: `src/pages/EventDetailPage.jsx` (lines 53-55, 449-530)

- [ ] **Step 1: Update budget total calculations (lines 53-55)**

Replace:

```javascript
  const eventBudget = budgetItems.filter(b => b.event_id === id)
  const totalBudget = eventBudget.reduce((s, b) => s + (b.estimated_amount || 0), 0)
  const totalActual = eventBudget.reduce((s, b) => s + (b.actual_amount || 0), 0)
```

With:

```javascript
  const eventBudget = budgetItems.filter(b => b.event_id === id)
  const totalBudget = eventBudget.reduce((s, b) => s + (b.budget_amount || 0), 0)
  const totalContracted = eventBudget.reduce((s, b) => s + (b.contracted_amount || 0), 0)
  const totalActual = eventBudget.reduce((s, b) => s + (b.actual_amount || 0), 0)
  const budgetDelta = totalBudget - totalContracted
  const budgetHealthPct = totalBudget > 0 ? (totalContracted / totalBudget) * 100 : 0
```

- [ ] **Step 2: Update the Budget tab label**

Find the tab trigger that shows budget (around line 151). Update its label to show color-coded amount:

Replace the budget tab trigger text. Find:
```javascript
Budget ({formatCurrency(totalBudget)})
```

Replace with:
```javascript
Budget (<span className={totalContracted > totalBudget && totalBudget > 0 ? 'text-eo-pink' : ''}>{formatCurrency(totalBudget)}</span>)
```

- [ ] **Step 3: Replace the Budget TabsContent (lines 449-530)**

Replace the entire `<TabsContent value="budget">` block with structured category rows:

```jsx
        <TabsContent value="budget">
          <div className="mt-4 space-y-4">
            {/* Budget Summary Bar */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contracted</p>
                  <p className={`text-lg font-bold ${totalContracted > totalBudget && totalBudget > 0 ? 'text-eo-pink' : ''}`}>
                    {formatCurrency(totalContracted)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-lg font-bold">{formatCurrency(totalActual)}</p>
                </div>
              </div>
              {totalBudget > 0 && (
                <>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetHealthPct > 100 ? 'bg-eo-pink' : budgetHealthPct > 75 ? 'bg-eo-coral' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budgetHealthPct, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${budgetDelta < 0 ? 'text-eo-pink font-medium' : 'text-muted-foreground'}`}>
                    {budgetDelta >= 0 ? `${formatCurrency(budgetDelta)} remaining` : `${formatCurrency(Math.abs(budgetDelta))} over budget`}
                  </p>
                </>
              )}
            </div>

            {/* Category Rows */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Budget by Category</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-semibold text-foreground">
                    <th className="pb-2 text-left">Category</th>
                    <th className="pb-2 text-right">Budget</th>
                    <th className="pb-2 text-right">Contracted</th>
                    <th className="pb-2 text-right">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {BUDGET_CATEGORIES.map(cat => {
                    const item = eventBudget.find(b => b.category === cat.id)
                    const budgetAmt = item?.budget_amount || 0
                    const contractedAmt = item?.contracted_amount || 0
                    const actualAmt = item?.actual_amount || 0
                    const isOverBudget = contractedAmt > budgetAmt && budgetAmt > 0

                    return (
                      <tr key={cat.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm">{cat.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28 ml-auto"
                            type="number"
                            value={budgetAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : 0
                              if (item) {
                                updateBudgetItem(item.id, { budget_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: val, contracted_amount: 0, actual_amount: null })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className={`h-8 text-xs text-right w-28 ml-auto ${isOverBudget ? 'border-eo-pink text-eo-pink' : ''}`}
                            type="number"
                            value={contractedAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : 0
                              if (item) {
                                updateBudgetItem(item.id, { contracted_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: 0, contracted_amount: val, actual_amount: null })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            className="h-8 text-xs text-right w-28 ml-auto"
                            type="number"
                            value={actualAmt || ''}
                            onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null
                              if (item) {
                                updateBudgetItem(item.id, { actual_amount: val })
                              } else {
                                addBudgetItem({ event_id: id, category: cat.id, description: '', budget_amount: 0, contracted_amount: 0, actual_amount: val })
                              }
                            }}
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold text-sm">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{formatCurrency(totalBudget)}</td>
                    <td className={`py-2 text-right ${totalContracted > totalBudget && totalBudget > 0 ? 'text-eo-pink' : ''}`}>
                      {formatCurrency(totalContracted)}
                    </td>
                    <td className="py-2 text-right">{formatCurrency(totalActual)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>
```

- [ ] **Step 4: Remove the "Add Line Item" button import if no longer needed**

The `Plus` icon import can stay (it's used elsewhere in EventDetailPage). The `addBudgetItem` is still used in the category rows. No cleanup needed.

- [ ] **Step 5: Verify build compiles**

```bash
npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/EventDetailPage.jsx
git commit -m "feat: event budget tab with structured category rows and three-value model"
```

---

### Task 10: Final Build Verification and Version Bump

**Files:**
- Modify: `src/lib/version.js`

- [ ] **Step 1: Verify full build**

```bash
npx vite build 2>&1 | tail -10
```

Expected: Clean build with no errors.

- [ ] **Step 2: Bump version**

Update `src/lib/version.js`:

```javascript
export const APP_VERSION = "1.26.0"
```

- [ ] **Step 3: Final commit**

```bash
git add src/lib/version.js
git commit -m "chore: bump version to 1.26.0 for budget allocation feature"
```

- [ ] **Step 4: Merge to main and push**

```bash
git push origin claude/happy-cannon
cd /Users/john-scottdixon/Projects/React/eo-learning-chair
git checkout main && git pull origin main
git merge claude/happy-cannon
# Resolve version.js conflict if needed — take higher version
git push origin main
```

- [ ] **Step 5: Provide migration SQL to user**

Print the migration SQL for the user to run in Supabase SQL Editor before testing.
