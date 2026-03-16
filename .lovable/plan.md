

# Add Lead Status Filter Dropdown

## Changes

### `src/pages/LeadsPage.tsx`

1. **Add state**: `const [statusFilter, setStatusFilter] = useState("all");`
2. **Extend filter logic** in the `leads` useMemo (after the source filter block, ~line 298): filter by `statusFilter` when not `"all"`
3. **Add `statusFilter` to useMemo deps** (line ~300)
4. **Add a Select dropdown** in the header bar after the source filter (~line 710):
   - All Statuses
   - New
   - Contacted
   - Qualified
   - Converted
   - Dismissed
5. **Reset page** on status filter change: `setPage(1)`

No backend changes needed -- filtering is client-side on existing data.

