

# Add Source Filter to Leads Page

## What
Add a dropdown filter next to the existing "My Territory" filter button that lets users filter leads by source (e.g., `auto_discovery`, `csv_import`, `manual`, or all).

## Changes

### `src/pages/LeadsPage.tsx`
1. Add a `sourceFilter` state variable (default: `"all"`)
2. Extend the `leads` memo (line ~286) to also filter by source when not `"all"`
3. Add a Select dropdown in the header bar (after the territory filter button, ~line 698) with options:
   - All Sources
   - Auto Discovery (`auto_discovery`)
   - CSV Import (`csv_import`)  
   - Manual (leads where `source` is null or empty)
4. Reset page to 1 when source filter changes

### UI placement
The source filter will be a compact `<Select>` component placed between the territory toggle and the action buttons, consistent with existing filter styling.

### No backend changes needed
Source data already exists on the `leads` table. Filtering is client-side on the already-fetched page of results, matching the existing territory filter pattern.

