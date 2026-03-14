

## Plan: Add AI Pitch Summary Column to Leads Table

### Changes

**`src/pages/LeadsPage.tsx`** — 4 edits:

1. **Add table header** (after line 665, Trigger Event): Add `<TableHead className="hidden xl:table-cell">AI Pitch</TableHead>`

2. **Add table cell** (after line 714, trigger event cell): Add a new cell showing `lead.ai_pitch_summary` truncated to ~80 chars with a tooltip showing the full text, hidden on smaller screens (`hidden xl:table-cell`)

3. **Update skeleton column count** (line 675): Change `length: 10` to `length: 11`

4. **Update empty state colSpan** (line 684): Change `colSpan={10}` to `colSpan={11}`

5. **Add to CSV export** (around line 428): Add `{ header: "AI Pitch Summary", accessor: (r) => r.ai_pitch_summary }` to the export columns

The column will show a truncated preview with a tooltip for the full pitch text, consistent with the existing trigger event column pattern.

