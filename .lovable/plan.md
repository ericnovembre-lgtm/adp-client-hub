

## Add Bulk "Convert to Deals" Action

### Current State
The Leads page already has bulk actions: status updates (including "Dismissed"), export, and delete. Multi-select with checkboxes and a floating toolbar are fully implemented. The missing piece is **bulk conversion to deals**.

### What to Add
A "Convert to Deals" button in the existing bulk action bar that converts all selected leads simultaneously, creating Company + Contact + Deal records for each, with territory and knockout checks.

### Implementation

**File: `src/pages/LeadsPage.tsx`**

1. Add a `handleBulkConvert` function that:
   - Filters selected leads to only those that are in-territory (headcount 2–20 or null) and not already converted/dismissed
   - Skips prohibited-industry leads (based on knockout rules)
   - For each eligible lead, runs the same conversion logic as `handleConvert`: creates Company, Contact, Deal, updates lead status to "converted", logs activity
   - Shows a summary toast: "X converted, Y skipped (out of territory or prohibited)"

2. Add a confirmation `AlertDialog` for bulk convert showing:
   - Count of leads that will be converted
   - Count of leads that will be skipped (with reasons)

3. Add the "Convert to Deals" button in the bulk action bar (lines 624-653), between "Update Status" and "Export Selected":
   ```
   <Button variant="outline" size="sm" onClick={openBulkConvert}>
     <ArrowRightLeft className="h-4 w-4 mr-1" />Convert to Deals
   </Button>
   ```

### Files changed
- `src/pages/LeadsPage.tsx` — add bulk convert dialog, handler, and button

