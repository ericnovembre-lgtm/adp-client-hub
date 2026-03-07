

## Fix: Dashboard Trend Calculations

### Problem
The current queries compare **all-time totals** vs **up-to-last-month totals**, so trends always show growth. The fix is to compare **this month** vs **last month** for accurate month-over-month trends, while also exposing all-time totals separately.

### Changes (single file: `src/hooks/useDashboardStats.ts`)

1. **Update `StatItem` interface** — add `allTime: number` field.

2. **Rename `_thisMonthStart` / `_thisMonthEnd`** — remove underscore prefixes to use them.

3. **Add 3 new all-time queries** to the `Promise.all`:
   - All leads (status != dismissed, no date filter)
   - All active deals (no date filter)
   - All closed_won revenue (no date filter)

4. **Fix existing month-filtered queries**:
   - `leadsNow`: add `.gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd)`
   - `leadsPrev`: change to `.gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd)`
   - `dealsNow`: add `.gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd)`
   - `dealsPrev`: change to `.gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd)`
   - `revenueNow`: add `.gte("created_at", thisMonthStart).lte("created_at", thisMonthEnd)`
   - `revenuePrev`: change to `.gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd)`
   - Tasks queries stay unchanged.

5. **Update return object** — each stat gets `allTime` from the new unfiltered queries; `value` now reflects this-month count for trend accuracy. Tasks keep `allTime` same as `value` (tasks due today is inherently point-in-time).

No other files modified.

