

## Plan: Data Hooks and Types

### What we'll create

1. **`src/types/database.ts`** — TypeScript interfaces for all 7 entities (User, Contact, Company, Deal, Task, Activity, Lead) matching the DB schema.

2. **`src/hooks/useContacts.ts`** (and similarly for Companies, Deals, Tasks, Activities, Leads) — Each file exports:
   - `use[Entity]s({ page, limit })` — paginated list query using `.range()`, returns `{ data, total, page, limit, totalPages, isLoading, error }`
   - `use[Entity](id)` — single record query
   - `useCreate[Entity]()` — insert mutation with cache invalidation
   - `useUpdate[Entity]()` — update mutation with cache invalidation
   - `useDelete[Entity]()` — delete mutation with cache invalidation

3. **Update `QueryClient` in `src/App.tsx`** — Set default `staleTime: 30_000`, `refetchOnWindowFocus: true`, `retry: 1`.

### Key decisions

- **No new Supabase client file.** The auto-generated `src/integrations/supabase/client.ts` already exists and must not be duplicated. All hooks will import from `@/integrations/supabase/client`.
- Types will be standalone interfaces (not re-exports of the auto-generated types) for cleaner DX, but will match the schema exactly.
- 6 hook files total (Users table excluded from CRUD hooks since it's managed via auth; we can add `useCurrentUser` if needed).
- Pagination uses Supabase `.range(from, to)` with a count query via `{ count: 'exact' }`.

### Files created/modified

| File | Action |
|------|--------|
| `src/types/database.ts` | Create — 7 interfaces |
| `src/hooks/useContacts.ts` | Create — 5 hooks |
| `src/hooks/useCompanies.ts` | Create — 5 hooks |
| `src/hooks/useDeals.ts` | Create — 5 hooks |
| `src/hooks/useTasks.ts` | Create — 5 hooks |
| `src/hooks/useActivities.ts` | Create — 5 hooks |
| `src/hooks/useLeads.ts` | Create — 5 hooks |
| `src/App.tsx` | Modify — QueryClient defaults |

