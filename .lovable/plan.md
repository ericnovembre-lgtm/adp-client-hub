

# Update PRIME Wage Requirement to $65K Only

## Summary
Remove the $75K high-cost metro wage requirement from the PRIME underwriting rules across all files. The wage requirement is now a flat $65K nationwide.

## Files to Update

### 1. `src/lib/adpBenefitsKnowledge.ts`
- **Line 110**: Change wage guideline from "$65,000 nationally; $75,000 in high-cost metro areas (NYC, Washington DC, San Francisco Bay Area)" to "$65,000 average wage requirement"
- **Line 115**: Update fast-pass exception range from "$58K-$64K" to reflect new threshold
- **Line 193** (summary): Change "$65K avg wage ($75K in NYC/DC/SF)" to "$65K avg wage"

### 2. `src/lib/adpProductKnowledge.ts`
- **Line 574**: Change `'PRIME (2+ EEs, $65-75K wage)'` to `'PRIME (2+ EEs, $65K avg wage)'`

### 3. `supabase/functions/ai-chat/index.ts`
- **Line 113**: Change "$65-75K avg wage" to "$65K avg wage"
- **Line 120**: Update PRIME eligibility description to remove the $75K reference

### 4. `supabase/functions/crm-agent/index.ts`
- **Line 256**: Change "avg wage $65-75K required" to "avg wage $65K required"

