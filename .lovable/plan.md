

## Dashboard Page Implementation

### Overview
Replace the placeholder `DashboardPage.tsx` with a full dashboard featuring stat cards, activity feed, top leads, and a deals pipeline chart.

### Data Fetching Strategy
Use the existing hooks (`useDeals`, `useLeads`, `useTasks`, `useActivities`) plus direct Supabase queries for aggregations (counts, sums, month-over-month comparisons). Create a single `useDashboardStats` hook that runs parallel queries for:
- Leads count (status != 'dismissed') + last month comparison
- Active deals count (stage not in closed_won/closed_lost) + last month comparison  
- Won deals revenue sum + last month comparison
- Tasks due today count + last month comparison

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useDashboardStats.ts` | Create — aggregation queries for 4 stat cards with month-over-month trends |
| `src/pages/DashboardPage.tsx` | Rewrite — full dashboard layout |

### Component Structure

**DashboardPage.tsx** will contain:

1. **StatCard** — reusable card component showing label, value, trend arrow (green/red), and percentage change. Uses `Card` from shadcn.

2. **Stats Row** — 4 `StatCard`s in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).

3. **Two-Column Section** (`grid-cols-1 lg:grid-cols-2`):
   - **Recent Activity** — fetch latest 10 activities, show type icon (Phone/Mail/Calendar/FileText based on type), description, and relative time using `date-fns formatDistanceToNow`.
   - **Top Leads** — fetch latest 10 leads (status != 'dismissed'), show company name, decision maker, headcount, status badge. Rows clickable via `useLocation` from wouter to navigate to `/leads`.

4. **Pipeline Chart** — `BarChart` from Recharts showing deal counts per stage. Uses `ChartContainer` from the existing `chart.tsx` component.

5. **Loading States** — `Skeleton` components for each section while data loads.

### useDashboardStats Hook
Runs 8 parallel Supabase queries (4 current counts + 4 previous month counts) using `useQuery`. Returns stat objects with `value`, `previousValue`, `trend` (percentage), and `isPositive` (boolean).

### Technical Notes
- Currency formatting via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
- "Today" filter: `due_date >= startOfDay AND due_date <= endOfDay` using `date-fns`
- Month boundaries via `date-fns` `startOfMonth`, `endOfMonth`, `subMonths`
- Activity type icons mapped: call→Phone, email→Mail, meeting→Calendar, note→FileText, default→Activity

