

## Rename knockout utility files for clarity

### What changes
Two file renames with import updates across 4 files:

| Old path | New path |
|---|---|
| `src/lib/knockoutLocal.ts` | `src/lib/checkKnockoutFromRules.ts` |
| `src/lib/knockoutCheck.ts` | `src/lib/checkKnockoutFromDB.ts` |

### Import updates

**`src/lib/knockoutLocal.ts` → `src/lib/checkKnockoutFromRules.ts`** (3 importers):
- `src/pages/LeadsPage.tsx` — line 32
- `src/components/LeadDetailSheet.tsx` — line 7
- `src/components/EligibilityBadge.tsx` — line 4

**`src/lib/knockoutCheck.ts` → `src/lib/checkKnockoutFromDB.ts`** (1 importer):
- `src/hooks/useKnockoutRules.ts` — line 3

### Approach
1. Create the two new files with identical content from the originals.
2. Update all 4 import paths.
3. Delete the two old files.

No function names, types, or logic changed.

