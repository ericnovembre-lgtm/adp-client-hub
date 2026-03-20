

## Add KPI Summary Stats Bar to Reports Page

### What we're building
A horizontal stats bar between the header/filter section and the report modules, showing 4-5 key KPIs: Total Revenue (closed-won), Win Rate, Total Deals, Open Pipeline Value, and Average Days to Close.

### Implementation

**1. New hook: `useReportsSummaryKPIs` in `src/hooks/useReportsData.ts`**
- Single query fetching all deals within the current date range
- Computes: total closed-won revenue, win rate (won / (won + lost)), total deal count, open pipeline value (sum of non-closed deals), avg days to close
- Respects the existing `ReportsFilters` type and `getDateBounds` helper

**2. KPI bar UI in `src/pages/ReportsPage.tsx`**
- Insert a row of 5 small `Card` components in a responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) between the header (line 132) and the report modules grid (line 134)
- Each card shows: icon, label, formatted value (currency for revenue/pipeline, percentage for win rate, number for count/days)
- Skeleton loading state while data loads
- Uses existing Card, Skeleton components and lucide icons (DollarSign, TrendingUp, Target, Clock, Layers)

### Technical details
- Reuses `getDateBounds(filters)` for date filtering
- Single Supabase query on `deals` table (select stage, value, created_at, closed_at)
- Computed client-side from the result set — no new tables or migrations needed
- Currency formatting with `Intl.NumberFormat`

