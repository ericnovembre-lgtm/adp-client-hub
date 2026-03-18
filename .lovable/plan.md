

# Replace Benefits Knowledge Base with Structured Data + Update AI Prompts

## Summary
Replace the existing string-based `adpBenefitsKnowledge.ts` with the user's structured TypeScript object format, including the restored `$75K high-cost metro` wage rule. Then append the detailed benefits knowledge paragraph to both AI system prompts.

## Changes

### 1. Rewrite `src/lib/adpBenefitsKnowledge.ts`
- Replace the entire file with the user's structured object export containing: `BENEFITS_KNOWLEDGE_VERSION`, `ADP_BENEFITS_KNOWLEDGE` (object with `prime`, `standardQuoting`, `stateCarriers`, `tsNotAvailable`, `dental`, `quotingRequirements` sections)
- Wage rule: `$65K standard`, `$75K high-cost metro (NYC, DC, SF)`
- Remove the old `BENEFITS_KNOWLEDGE_SUMMARY` string export (replaced by the structured object)

### 2. Update `supabase/functions/ai-chat/index.ts`
- Replace line 134 (`BENEFITS DEEP DIVE: ...`) with the full benefits knowledge paragraph provided by the user (PRIME rules, standard groups, state carrier map, TS unavailable states, dental rules, benefits version tag)
- This is additive — no existing content is removed, only the single reference line is replaced with the expanded text

### 3. Update `supabase/functions/scheduled-discovery/index.ts`
- Replace line 81 (`BENEFITS DEEP DIVE: ...`) with the same full benefits knowledge paragraph
- Same additive approach

### 4. Revert wage references in other files
Since we're restoring $75K metro, update the previously modified files:
- **`src/lib/adpProductKnowledge.ts`**: Change `'PRIME (2+ EEs, $65K avg wage)'` back to `'PRIME (2+ EEs, $65-75K wage)'`
- **`supabase/functions/crm-agent/index.ts`**: Change `"avg wage $65K required"` back to `"avg wage $65-75K required"`
- **`supabase/functions/ai-chat/index.ts`** lines 113/120: Restore `$65-75K` references in the existing benefits summary section

### Note
The existing OE2026 rates, competitor intelligence, and healthcare benchmarks sections in the ai-chat prompt remain untouched. Only the BENEFITS DEEP DIVE reference line is replaced with expanded content.

