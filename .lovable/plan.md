

## Leads Page Implementation

### Files to modify

| File | Action |
|------|--------|
| `src/pages/LeadsPage.tsx` | Rewrite — full CRUD page |

### Implementation

Single file `LeadsPage.tsx` containing all components inline:

**State**: `page` (number), `search` (string), `dialogOpen` (boolean), `editingLead` (Lead | null), `convertDialogLead` (Lead | null), `deleteId` (string | null)

**Hooks used**: `useLeads({ page, limit: 25 })`, `useCreateLead()`, `useUpdateLead()`, `useDeleteLead()`, `useCreateCompany()`, `useCreateContact()`, `useCreateDeal()`, `useCreateActivity()`

**Components within the file**:

1. **LeadFormDialog** — Dialog with zod-validated form (react-hook-form + @hookform/resolvers/zod). Fields: company_name (required), decision_maker_name/email/phone/title, headcount (number), industry, website, state, trigger_event (textarea), status (select). Reused for both add and edit.

2. **LeadActionsDropdown** — DropdownMenu per row with actions:
   - Mark Contacted / Qualify / Dismiss — calls `updateLead` + `createActivity` with appropriate type/description
   - Convert to Deal — opens confirmation dialog, then sequentially: createCompany → createContact (with company ref) → createDeal (linked to contact + company, title = "[Company] - ADP TotalSource", stage='qualified') → updateLead(status='converted') → createActivity(type='conversion')
   - Edit — opens form dialog with pre-filled values
   - Delete — AlertDialog confirmation → deleteLead

3. **Main layout**:
   - Header: title + "Add Lead" button + search Input
   - Table with columns: Company Name, Decision Maker (name + title), Headcount, Industry, State, Trigger Event (truncated 50 chars), Status (Badge with color map), Actions
   - Client-side search filter on `company_name` and `decision_maker_name`
   - Skeleton rows while loading
   - Pagination: Previous/Next buttons + "Page X of Y" text

**Status badge colors**: new=blue (`bg-blue-100 text-blue-800`), contacted=yellow, qualified=green, converted=purple, dismissed=gray

**Toast notifications** via `sonner`'s `toast` for success/error on all mutations.

