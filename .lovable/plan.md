

## Seed Knockout Rules + Update Utility

### 1. Seed Data (via insert tool)

Insert all 145 rows into `knockout_rules`:
- 94 prohibited industries
- 41 low_probability industries
- 10 bluefield industries

Using the exact INSERT statements provided. Will split into 3 batches (one per tier) to stay within limits.

### 2. Replace `src/lib/knockoutCheck.ts`

Replace the current utility with the user's provided version that uses:
- Fuzzy keyword matching (splits industry names into keywords, checks against combined search text)
- New `KnockoutResult` interface: `{ isKnockout, tier, matchedRules[], message }`
- Human-readable messages with emoji indicators per tier
- Fetches all rules client-side and filters in JS

### 3. Update `src/hooks/useKnockoutRules.ts`

Adjust the `useCheckKnockout` hook to match the new return type from `checkIndustryKnockout`. The `KnockoutRule` type import will be removed since the new utility doesn't export it — the hook will use the rules query's own typing instead.

### Files Modified

| File | Action |
|------|--------|
| `knockout_rules` table | Seed 145 rows via insert tool |
| `src/lib/knockoutCheck.ts` | Replace with new fuzzy-match utility |
| `src/hooks/useKnockoutRules.ts` | Update imports/types for new interface |

No UI or page changes.

