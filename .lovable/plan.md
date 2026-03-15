

## Add `closed_at` column to deals for accurate revenue reporting

### 1. Database migration
Add nullable `closed_at` column to the deals table.

### 2. Update Deal type
Add `closed_at: string | null` to `src/types/database.ts` Deal interface.

### 3. Auto-set `closed_at` on stage changes

Three locations where stage changes happen:

- **DealsPage.tsx `onSubmit`** (line ~132): When creating/editing via form dialog, check if new stage is `closed_won`/`closed_lost` — set `closed_at = now()`. If moving away from closed, set `closed_at = null`.
- **DealsPage.tsx `moveDeal`** (line ~290): Kanban drag-and-drop stage change — same logic.
- **DealDetailSheet.tsx `handleSave`** (line ~107): Inline edit stage change — same logic.

### 4. Update `useMonthlyRevenue` in `useReportsData.ts`
- Select `closed_at` in addition to `value` and `expected_close_date`
- Bucket by `closed_at ?? expected_close_date` (fallback for historical data)
- Filter using a broader date range approach since `closed_at` may not exist on old records

### 5. Show `closed_at` in DealDetailSheet
After the "Expected Close" info row, add a read-only `InfoRow` showing "Closed on: Mar 14, 2026" when the deal has a `closed_at` value and stage is `closed_won` or `closed_lost`.

### Files changed
- DB migration (new `closed_at` column)
- `src/types/database.ts`
- `src/pages/DealsPage.tsx`
- `src/components/DealDetailSheet.tsx`
- `src/hooks/useReportsData.ts`

