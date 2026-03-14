

## Plan: Link Contacts to Companies via Foreign Key

### 1. Database Migration
Add `company_id` column to contacts table. Keep existing `company` text column.

```sql
ALTER TABLE public.contacts ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
```

### 2. Type Updates

**`src/types/database.ts`** — Add `company_id?: string | null` to Contact interface.

### 3. New Component: `CompanyCombobox`

Create `src/components/CompanyCombobox.tsx` — a combobox that:
- Queries companies table with debounced search (using `useCompanies` hook)
- Shows matching companies in a dropdown (Popover + Command pattern from shadcn)
- When a company is selected: returns `{ company_id, company_name }`
- Allows free-text entry for companies not in the database (sets `company_id = null`, `company = typed text`)
- Accepts initial value props for edit mode

### 4. Update ContactFormDialog (in `ContactsPage.tsx`)

- Add `company_id` to form schema (optional string)
- Replace the plain `company` text `<Input>` with `<CompanyCombobox>`
- On company selection: set both `company` (display name) and `company_id` (UUID or null)
- Include `company_id` in the create/update payload

### 5. Update ContactDetailSheet

- If `contact.company_id` exists, render company name as a link (`<a>` or `useNavigate`) to `/companies`
- If only `contact.company` text exists (no `company_id`), show plain text as before

### 6. Update CompaniesPage — Linked Contacts Section

- Add a detail view (or expandable section on the company card) that queries `contacts` where `company_id = company.id`
- Show a simple list of linked contact names in the company card's content area
- Create a small `useLinkedContacts(companyId)` hook or inline query

### Files Changed
- Migration SQL (new)
- `src/types/database.ts` (1 line added)
- `src/components/CompanyCombobox.tsx` (new file)
- `src/pages/ContactsPage.tsx` (form dialog updated)
- `src/components/ContactDetailSheet.tsx` (company link)
- `src/pages/CompaniesPage.tsx` (linked contacts count/list on cards)

