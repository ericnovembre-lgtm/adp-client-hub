

## Plan: Add Inline Editing to DealDetailSheet and ContactDetailSheet

### Shared Pattern (from LeadDetailSheet)
- `InfoRow` / `EditRow` helper components
- `isEditing` state + `editData` partial state
- Pencil/X/Save icon buttons in header
- `useEffect` to reset editing on close
- `set()` helper for field updates

### Part A — `src/components/DealDetailSheet.tsx`

Rewrite to match LeadDetailSheet pattern:

- **New imports**: `useState`, `useEffect`, `useUpdateDeal`, `useContacts`, `useCompanies`, `SearchableSelect`, `Input`, `Textarea`, `Select`, `Button`, `Calendar`, `Popover`, `toast`, `logActivity`, icons (`Pencil`, `X`, `Save`, `Loader2`, `Building2`, `User`, `FileText`, `GripVertical`)
- **Props**: Add optional `onDealUpdated?: () => void` callback
- **Header**: Edit mode shows `Input` for title; view mode shows `SheetTitle` + Pencil button. Edit mode shows X + Save buttons with loading spinner.
- **Editable fields**:
  - Stage → `Select` with `DEAL_STAGES` array
  - Value → `Input type="number" step="0.01"`
  - Contact → `SearchableSelect` using `useContacts()` data
  - Company → `SearchableSelect` using `useCompanies()` data
  - Expected Close Date → Shadcn `Calendar` in a `Popover`
  - Notes → `Textarea`
- **Save handler**: Call `useUpdateDeal().mutateAsync()`. If stage changed from original `deal.stage`, call `logActivity("stage_change", ...)`. Show toast on success/error.
- **InfoRow/EditRow**: Copy from LeadDetailSheet (identical pattern)

### Part B — `src/components/ContactDetailSheet.tsx`

Rewrite to match LeadDetailSheet pattern:

- **New imports**: `useState`, `useEffect`, `useUpdateContact`, `useCompanies`, `SearchableSelect`, `Input`, `Textarea`, `Select`, `Button`, `toast`, icons (`Pencil`, `X`, `Save`, `Loader2`, `User`)
- **Props**: Add optional `onContactUpdated?: () => void` callback
- **Header**: Edit mode shows two `Input` fields for first/last name; view mode shows `SheetTitle` + Pencil button.
- **Editable fields**:
  - First Name → `Input`
  - Last Name → `Input`
  - Email → `Input type="email"`
  - Phone → `Input`
  - Company → `SearchableSelect` using `useCompanies()` (sets both `company` name and `company_id`)
  - Job Title → `Input`
  - Status → `Select` with options: lead, prospect, customer, inactive
  - Notes → `Textarea`
- **Save handler**: Call `useUpdateContact().mutateAsync()`. Show toast on success/error.

### Files changed
- `src/components/DealDetailSheet.tsx` — full rewrite (~180 lines)
- `src/components/ContactDetailSheet.tsx` — full rewrite (~160 lines)

No database changes needed. No new dependencies.

