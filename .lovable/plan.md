

## Plan: Change deals value column from INTEGER to NUMERIC(12,2)

### Changes

**1. Database migration**
- `ALTER TABLE public.deals ALTER COLUMN value TYPE numeric(12,2);`

**2. `src/pages/DealsPage.tsx`** (3 edits)
- Line 63: Update `fmtCurrency` to use `toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })`
- Line 230: Add `step="0.01"` to the value Input
- Line 376: Update kanban card `toLocaleString()` call with same fraction digit options

**3. `src/components/DealDetailSheet.tsx`** (1 edit)
- Line 85: Update `toLocaleString()` with `minimumFractionDigits: 0, maximumFractionDigits: 2`

**4. `src/pages/ReportsPage.tsx`** (1 edit)
- Line 170: Update tooltip formatter with same fraction digit options

No changes needed to `src/types/database.ts` — TypeScript `number` already handles decimals.

