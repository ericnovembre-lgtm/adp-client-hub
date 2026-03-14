

## Plan: Server-side Search with Debouncing for Leads, Contacts, and Companies

### Changes

**1. Hooks — add `search` parameter to queries**

- **`src/hooks/useLeads.ts`**: Accept `search` string. When non-empty, add `.or('company_name.ilike.%${search}%,decision_maker_name.ilike.%${search}%')` before `.range()`. Include `search` in `queryKey`.

- **`src/hooks/useContacts.ts`**: Same pattern with `.or('first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%')`.

- **`src/hooks/useCompanies.ts`**: Same pattern with `.or('name.ilike.%${search}%,industry.ilike.%${search}%')`.

**2. Pages — debounce search, remove client-side filtering**

All three pages get the same pattern:
- Add `debouncedSearch` state + `useEffect` with 300ms `setTimeout`/`clearTimeout`.
- Pass `search: debouncedSearch` to the hook.
- Reset `page` to 1 when `debouncedSearch` changes.
- Remove `useMemo` client-side filter; use `data?.data ?? []` directly.

**Specific files:**
- **`src/pages/LeadsPage.tsx`**: Remove `filteredLeads` useMemo (lines 257-266). Replace all `filteredLeads` references with `data?.data ?? []`. Add debounce + page reset effects.
- **`src/pages/ContactsPage.tsx`**: Remove `filtered` useMemo (lines 187-197). Replace references with `data?.data ?? []`. Add debounce + page reset.
- **`src/pages/CompaniesPage.tsx`**: Remove `filtered` useMemo (lines 140-148). Replace references with `data?.data ?? []`. Add debounce + page reset.

No UI layout or other functionality changes.

