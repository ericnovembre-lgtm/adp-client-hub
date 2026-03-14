

## Plan: Add Bulk Actions, Company Detail Sheet, and Integration

### Part A — Bulk Actions on CompaniesPage

Add multi-select checkbox support to each company card and a floating bulk action bar (matching LeadsPage pattern):

**In `src/pages/CompaniesPage.tsx`:**
- Add state: `selectedIds` (Set), `bulkDeleteOpen`, `bulkActionPending`
- Add helpers: `toggleSelect`, `toggleSelectAll`, `allVisibleSelected`, `someSelected`
- Clear selection on page change
- Add a "Select All" checkbox in the header bar area
- Add a checkbox overlay on each company card (top-left corner)
- Add bulk action bar (appears when `someSelected`): "Export Selected" and "Delete Selected" buttons + "Clear" button
- Wire `handleBulkDelete` (Promise.all of deleteCompany calls) with confirmation dialog
- Wire `handleBulkExport` using `exportToCSV` on selected items

### Part B — CompanyDetailSheet

**Create `src/components/CompanyDetailSheet.tsx`:**
- Sheet slide-over panel (440px wide, matching LeadDetailSheet)
- Props: `company`, `open`, `onOpenChange`, `onCompanyUpdated`
- Header: company name with edit/save/cancel buttons (same pattern as LeadDetailSheet)
- Uses `InfoRow` and `EditRow` helper components (same pattern)
- Fields displayed: name, industry, employees, revenue, website, phone, address
- Inline editing: toggle edit mode, update via `useUpdateCompany`, toast on success/failure
- **Linked Contacts section**: query contacts where `company_id = company.id` OR `company ILIKE company.name`
- **Linked Deals section**: query deals where `company_id = company.id`
- **Activity section**: placeholder "No activity yet" (no company_id column on activities table yet)

### Part C — Integration

**In `src/pages/CompaniesPage.tsx`:**
- Add state: `detailCompany` for the sheet
- Clicking a company card (not the dropdown) opens `CompanyDetailSheet`
- Keep existing edit/delete dropdown on each card
- Import and render `CompanyDetailSheet`

### Files Changed
- `src/components/CompanyDetailSheet.tsx` (new)
- `src/pages/CompaniesPage.tsx` (bulk actions + detail sheet integration)

