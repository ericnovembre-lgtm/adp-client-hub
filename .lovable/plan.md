

## Fix: Tasks Due Today Trend Calculation

The bug is on line 59: the previous-period task query uses `lastMonthStart` to `lastMonthEnd` (the entire previous month), making the comparison meaningless against a single day.

### Change

**`src/hooks/useDashboardStats.ts`** — Lines 32-36 and 58-59:

1. Add a `sameDayLastMonth` date using `subMonths(now, 1)`, then compute its `startOfDay` and `endOfDay`.
2. Replace the tasks previous-period query (line 59) to filter `due_date` between `startOfDay(sameDayLastMonth)` and `endOfDay(sameDayLastMonth)` instead of the full previous month range.
3. Remove the now-unused `lastMonthStart` variable (it's not used by any other query).

The other 3 stat cards (leads, deals, revenue) already use correct comparable periods (all-time now vs all-time as of last month end), so no changes needed there.

### Specific code diff

**Date setup** — add after line 32:
```ts
const sameDayLastMonth = subMonths(now, 1);
const sameDayLastMonthStart = startOfDay(sameDayLastMonth).toISOString();
const sameDayLastMonthEnd = endOfDay(sameDayLastMonth).toISOString();
```

**Task previous query** (line 58-59) — replace with:
```ts
// Tasks due on the same calendar day last month
supabase.from("tasks").select("id", { count: "exact", head: true })
  .gte("due_date", sameDayLastMonthStart)
  .lte("due_date", sameDayLastMonthEnd)
  .neq("status", "completed"),
```

Remove the unused `lastMonthStart` variable (line 33). `lastMonthEnd` is still used by leads/deals/revenue queries.

No visual changes — only the trend percentage on the "Tasks Due Today" card will now show a meaningful comparison.

