

# Add Source Badge Column to Leads Table

## Changes

### `src/pages/LeadsPage.tsx`

1. **Add "Source" table header** after the "Company Name" column (line ~791), before "Decision Maker":
   ```
   <TableHead>Source</TableHead>
   ```

2. **Add source badge cell** in the table row (after company name cell, line ~843):
   ```tsx
   <TableCell>
     <Badge variant="outline" className={sourceConfig.className}>
       {sourceConfig.label}
     </Badge>
   </TableCell>
   ```
   Source badge styling:
   - `auto_discovery` → purple badge, "AI Discovery"
   - `csv_import` → indigo badge, "CSV Import"  
   - `null`/empty → gray badge, "Manual"

3. **Update skeleton and empty-state `colSpan`** from 12 to 13 to account for the new column.

No backend or schema changes needed.

