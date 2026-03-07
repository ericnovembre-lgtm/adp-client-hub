

## Add Bulk Actions to Leads Page

### What changes

Add multi-select capability to the leads table with a bulk action toolbar for batch status updates, batch deletion, and CSV export of selected leads.

### UI behavior

1. **Checkbox column** — Add a checkbox to each table row plus a "select all" checkbox in the header (selects visible page only).
2. **Bulk action bar** — When 1+ leads are selected, show a floating toolbar above the table with:
   - Selected count indicator (e.g., "3 selected")
   - **Update Status** dropdown (new, contacted, qualified, dismissed) — applies chosen status to all selected leads
   - **Export Selected** button — exports only selected leads to CSV
   - **Delete Selected** button — opens confirmation dialog, then batch-deletes
   - **Clear Selection** button
3. **Selection state** resets on page change or after bulk operations complete.

### Technical approach

All changes are in `src/pages/LeadsPage.tsx` (no new files needed):

- Add `selectedIds: Set<string>` state
- Add `Checkbox` import from shadcn/ui
- Insert checkbox `<TableHead>` and `<TableCell>` in the table
- "Select all" toggles all visible `filteredLeads` IDs
- Bulk status update: loop `Promise.all` over `updateLead.mutateAsync` for each selected ID, log one activity per lead
- Bulk delete: `Promise.all` over `deleteLead.mutateAsync`, with AlertDialog confirmation showing count
- Bulk export: filter `filteredLeads` by `selectedIds`, pass to existing `exportToCSV`
- Clear selection on page change (`useEffect` on `page`), after bulk ops complete
- Disable bulk actions while mutations are pending; show `Loader2` spinner

No database changes required.

