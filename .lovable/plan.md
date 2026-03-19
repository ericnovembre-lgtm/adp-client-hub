

## Add Signals Count Badge to Dashboard

### Approach
Query leads with a non-null `trigger_event` updated in the last 7 days, count them, and display as a clickable card between the Territory Coverage and the two-column section. Clicking navigates to `/signals`.

### Changes

**`src/hooks/useDashboardStats.ts`** — Add `useSignalsCount` hook:
- Query `leads` table where `trigger_event` is not null and `created_at` >= 7 days ago
- Use `count: "exact", head: true` for efficiency
- Return `{ count, isLoading }`

**`src/pages/DashboardPage.tsx`**:
- Import `Radio` from lucide-react (signal icon) and the new `useSignalsCount` hook
- Add a new clickable card after the Territory Coverage section showing:
  - Radio icon in a colored circle
  - "High-Confidence Signals" label
  - Count badge with the number
  - "Last 7 days" subtitle
  - `onClick={() => navigate("/signals")}`

### Files Changed
- `src/hooks/useDashboardStats.ts` — add `useSignalsCount` export
- `src/pages/DashboardPage.tsx` — add signals card widget

