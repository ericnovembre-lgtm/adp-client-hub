

## Fix: Custom date range validation in ReportsPage

### Approach
Use option 2 (disable invalid dates) combined with auto-swap. Disable dates in the "From" calendar after `customTo`, and dates in the "To" calendar before `customFrom`. Also auto-swap if somehow an invalid combination occurs. For the missing bound case, `getDateBounds` in `useReportsData.ts` already defaults `to` to `new Date()` — just need to handle missing `from` similarly.

### Changes in `src/pages/ReportsPage.tsx`

1. **Replace `onSelect={setCustomFrom}`** (line 101) with a handler that auto-swaps if needed:
   ```tsx
   onSelect={(d) => {
     if (d && customTo && d > customTo) {
       setCustomFrom(customTo);
       setCustomTo(d);
     } else {
       setCustomFrom(d);
     }
   }}
   ```
   Add `disabled` prop: `disabled={(date) => customTo ? date > customTo : false}` — actually skip disabling since we auto-swap. Disabling is better UX though. Let's do both: disable + auto-swap as safety net.

2. **Replace `onSelect={setCustomTo}`** (line 113) with similar handler + disable:
   ```tsx
   onSelect={(d) => {
     if (d && customFrom && d < customFrom) {
       setCustomTo(customFrom);
       setCustomFrom(d);
     } else {
       setCustomTo(d);
     }
   }}
   disabled={(date) => !!customFrom && date < customFrom}
   ```

3. **From calendar** — disable dates after customTo:
   ```tsx
   disabled={(date) => !!customTo && date > customTo}
   ```

### Changes in `src/hooks/useReportsData.ts`

4. **Line 18** in `getDateBounds`: handle missing `from` when range is custom — default to 30 days back:
   ```tsx
   from = filters.from ?? startOfDay(subDays(to, 30));
   ```
   This is already roughly what happens (falls through to `Number("custom")` which is NaN). Fix by adding explicit check:
   ```tsx
   if (filters.range === "custom") {
     from = filters.from ?? startOfDay(subDays(to, 30));
   } else {
     from = startOfDay(subDays(to, Number(filters.range)));
   }
   ```

### Files changed
- `src/pages/ReportsPage.tsx` — date pickers get `disabled` + auto-swap `onSelect`
- `src/hooks/useReportsData.ts` — safer fallback for missing custom bounds

