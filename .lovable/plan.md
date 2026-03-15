

## Plan: CSV Import Dialog

### 1. Install papaparse
Papaparse is not currently in the project. Add `papaparse` and `@types/papaparse` as dependencies.

### 2. Create `src/components/CSVImportDialog.tsx` (~250 lines)

A multi-step dialog component with props: `entityType`, `open`, `onOpenChange`, `onImportComplete`.

**Step 1 — File Upload:**
- Drag-and-drop zone + file picker, accepts `.csv` only
- Parse file with `Papa.parse` (header: true)
- Store parsed headers and rows in state

**Step 2 — Preview & Map:**
- Show first 5 rows in a table
- For each CSV column header, render a `Select` dropdown to map to a database field (or "Skip")
- Auto-map: match CSV header to field label/key case-insensitively
- Field definitions per entity type:

```text
leads:    company_name*, decision_maker_name, decision_maker_email,
          decision_maker_phone, decision_maker_title, headcount,
          industry, website, state, trigger_event, source

contacts: first_name*, last_name*, email, phone, company,
          job_title, status, source, notes

companies: name*, industry, website, employees, revenue, address, phone
```

**Step 3 — Import:**
- "Start Import" button
- Progress bar (shadcn `Progress` component)
- Insert in batches of 10 via `supabase.from(table).insert(batch)`
- Validation: skip rows missing required fields, trim all string values
- For leads: query existing `company_name` values first, warn about duplicates but still import
- Track success/failed/skipped counts, display summary
- On complete: invalidate React Query cache via `useQueryClient().invalidateQueries()`, call `onImportComplete()`

**Dialog styling:** Match `DraftEmailDialog` — `max-w-2xl max-h-[90vh] overflow-y-auto`

### 3. Add "Import CSV" button to 3 pages

Each page gets:
- `import { Upload } from "lucide-react"` 
- `const [importOpen, setImportOpen] = useState(false)` state
- A `<Button variant="outline">` with Upload icon, placed before the Export CSV button
- `<CSVImportDialog>` rendered at bottom

**Files modified:**
- `src/pages/LeadsPage.tsx` — add import button + dialog state + render
- `src/pages/ContactsPage.tsx` — same
- `src/pages/CompaniesPage.tsx` — same

### Files changed
- `package.json` — add `papaparse`, `@types/papaparse`
- `src/components/CSVImportDialog.tsx` — new (~250 lines)
- `src/pages/LeadsPage.tsx` — add import button + dialog
- `src/pages/ContactsPage.tsx` — add import button + dialog
- `src/pages/CompaniesPage.tsx` — add import button + dialog

