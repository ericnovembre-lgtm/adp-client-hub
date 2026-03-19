

# Post-Import Enrichment Pipeline Plan

## Summary
Enhance CSVImportDialog with a Step 4 enrichment phase for leads. Create a separate EnrichmentProgress component. After CSV leads import, users can trigger waterfall enrichment with progress tracking, batch safety limits, and activity logging.

## New File: `src/components/EnrichmentProgress.tsx`

Standalone component handling the enrichment flow:
- **Props**: `leadIds: string[]`, `onComplete: (summary) => void`, `onSkip: () => void`
- **Pre-enrichment view**: Shows count summary (imported / have email / need enrichment), auto-enrich toggle (persisted in localStorage `csv_import_auto_enrich`), batch warning if >20 leads
- **During enrichment**: Scrollable list with per-lead status (pending/enriching/success/failed/skipped). Calls `supabase.functions.invoke("waterfall-enrich", { body: { lead_id } })` sequentially with 1s delay between calls
- **Post-enrichment summary**: Enriched/failed/skipped counts, competitor breakdown, score grade distribution, "Done" button
- **Batch safety**: If >20 need enrichment, show warning with "Enrich First 20" / "Enrich All" / "Skip" options
- Fetches lead data (company_name, decision_maker_email) on mount to determine which need enrichment
- After completion, logs a single summary activity to the `activities` table

## Modified File: `src/components/CSVImportDialog.tsx`

Minimal changes to existing file:

1. **Step type**: `1 | 2 | 3` → `1 | 2 | 3 | 4`
2. **New state**: `importedLeadIds: string[]` to track inserted lead IDs
3. **Import loop** (lines 215-224): Capture returned IDs from `.insert().select("id")` into `importedLeadIds`
4. **Step 3 "Done" button**: For `entityType === "leads"` with successful imports, change to "Continue to Enrichment" → sets step to 4. For contacts/companies, keep existing close behavior
5. **Step 4 render**: Conditionally render `<EnrichmentProgress>` when `step === 4`, passing `importedLeadIds`, with `onComplete` and `onSkip` both closing the dialog
6. **Reset function**: Clear `importedLeadIds` too
7. **Import**: Add `EnrichmentProgress` and `Switch` imports

## Technical Details

- The waterfall-enrich function already returns enrichment results including score, grade, competitor info, and sources_succeeded — parse these for the per-lead result display
- Rate limiting via `await new Promise(r => setTimeout(r, 1000))` between sequential calls
- localStorage key `csv_import_auto_enrich` stores boolean preference
- Activity log uses existing pattern from `logActivity.ts` but inserts directly for the batch summary

