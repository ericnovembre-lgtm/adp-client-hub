

## Contacts Page Implementation

### File to modify

| File | Action |
|------|--------|
| `src/pages/ContactsPage.tsx` | Rewrite — full CRUD page |

### Implementation

Follow the same pattern as `LeadsPage.tsx` — single file with inline components:

**Schema**: Zod with `first_name` (required), `last_name` (required), `email` (optional, valid email if provided via `.email().optional().or(z.literal(""))`), `phone`, `company`, `job_title`, `status` (select), `source`, `notes` (textarea).

**State**: `page`, `search`, `dialogOpen`, `editingContact`, `deleteId`

**Hooks**: `useContacts({ page, limit: 25 })`, `useCreateContact()`, `useUpdateContact()`, `useDeleteContact()`

**Components**:
1. **ContactFormDialog** — Dialog with form fields, reused for add/edit
2. **Main layout**:
   - Header: title + "Add Contact" button + search Input
   - Table: Name (first+last), Email (mailto link), Phone, Company, Job Title, Status (Badge), Created (formatted `Jan 15, 2026` via `date-fns format`), Actions (Edit/Delete buttons)
   - Client-side search filter on first_name, last_name, email, company
   - Skeleton rows while loading
   - Pagination: Previous/Next + "Page X of Y"

**Status badges**: lead=blue, prospect=yellow, customer=green, inactive=gray (same color pattern as Leads page)

**Delete**: AlertDialog confirmation before calling `useDeleteContact`

**Toasts**: sonner toast on success/error for all mutations

