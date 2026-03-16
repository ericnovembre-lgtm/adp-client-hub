

# Add Bulk Actions to Deals and Tasks Pages

## Overview

Leads and Contacts already have bulk actions (multi-select, bulk delete, export, status update). This plan adds the same pattern to **Deals** (list view) and **Tasks**.

## Deals Page — `src/pages/DealsPage.tsx`

**ListView component changes:**
- Add `selectedIds` state (Set) and selection handlers
- Add checkbox column to the table (header = select all, rows = individual select)
- Add floating bulk action toolbar when selections exist:
  - **Update Stage** — dropdown with all deal stages
  - **Export Selected** — CSV export of selected deals
  - **Delete Selected** — with confirmation dialog
  - **Clear** — deselect all
- Bulk stage update: `Promise.all` of `updateDeal.mutateAsync` calls
- Bulk delete: `Promise.all` of `deleteDeal.mutateAsync` calls
- Bulk export: filter deals by selected IDs, call `exportToCSV`

**Note:** Bulk actions only appear in List view (not Kanban), matching the table-based pattern from Leads/Contacts.

**New imports needed:** `Checkbox`, `X`, `DropdownMenu` components (most already imported), `useUpdateDeal`

## Tasks Page — `src/pages/TasksPage.tsx`

**TaskGroup component changes:**
- Accept `selectedIds` and `onSelect` props
- Add checkbox next to each task row (replacing the completion toggle checkbox position — move completion toggle to a separate control)
- Actually: keep the existing completion checkbox, add a *selection* checkbox to the left of it

**TasksPage main changes:**
- Add `selectedIds` state
- Add floating bulk action toolbar when selections exist:
  - **Update Status** — dropdown: Pending, In Progress, Completed
  - **Update Priority** — dropdown: Low, Medium, High, Urgent
  - **Export Selected** — CSV export
  - **Delete Selected** — with confirmation dialog
  - **Clear** — deselect all
- Bulk handlers using `Promise.all` with existing mutation hooks

**New imports:** `Download`, `X`, `DropdownMenu` components

## Files Changed

| File | Change |
|------|--------|
| `src/pages/DealsPage.tsx` | Add selection state, checkbox column, bulk toolbar, bulk handlers to ListView |
| `src/pages/TasksPage.tsx` | Add selection state, selection checkboxes in TaskGroup, bulk toolbar, bulk handlers |

