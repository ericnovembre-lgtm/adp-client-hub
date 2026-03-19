

## Competitor Detection Engine

### Overview
Add competitor detection that runs automatically after waterfall enrichment. Detects the prospect's current payroll/HR/PEO provider by scanning enrichment data against a registry of known competitors. Displays results as a color-coded badge on the lead detail page.

### 1. Database Migration — Add 6 columns to `leads` table

```sql
ALTER TABLE leads ADD COLUMN current_provider text;
ALTER TABLE leads ADD COLUMN provider_type text;
ALTER TABLE leads ADD COLUMN provider_confidence text;
ALTER TABLE leads ADD COLUMN competitor_detected_at timestamptz;
ALTER TABLE leads ADD COLUMN competitor_source text;
ALTER TABLE leads ADD COLUMN displacement_difficulty text;
```

### 2. Edge Function: Update `waterfall-enrich/index.ts`

Add competitor detection as **Step 6.5** (after Lead411, before lead update):

- Define `COMPETITOR_REGISTRY` constant with all 15 competitors, their aliases, types, priorities, displacement difficulty, and Klue card counts
- Add `detectCompetitor()` function that:
  1. Collects all text from enrichment results (company description, technologies, job postings, trigger events, notes)
  2. Normalizes to lowercase and scans for alias matches
  3. Picks highest-priority match (by priority tier, then Klue card count)
  4. Sets confidence: "Confirmed" (tech stack/job posting), "Likely" (description/profiles), "Possible" (news/loose mentions)
  5. Also detects "DIY/None" patterns: "manual payroll", "spreadsheet payroll", "excel payroll"
  6. Falls back to "Unknown" if nothing detected
- Write `current_provider`, `provider_type`, `provider_confidence`, `competitor_detected_at`, `competitor_source`, `displacement_difficulty` to the lead update
- Add competitor detection details to the enrichment result response
- Update `TRACKED_FIELDS` to include the new fields in field counting
- Include competitor info in the activity log

### 3. Component: `src/components/CompetitorBadge.tsx` (new)

A clickable badge component:
- Props: `currentProvider`, `providerType`, `displacementDifficulty`, `providerConfidence`, `onOpenBattlecard`
- Color coding by displacement difficulty: green (Easy), yellow (Medium), red (Hard)
- "No Provider — Hot Lead" green badge for DIY/None
- Gray badge for Unknown
- Clicking opens the battlecard panel pre-filled with the detected competitor

### 4. Update `src/components/LeadDetailSheet.tsx`

- Import and render `CompetitorBadge` in the status/badges area (next to existing status badge)
- When badge is clicked, auto-open the battlecard panel with the detected competitor pre-selected
- Show competitor info in the enrichment results card

### 5. Update `src/types/database.ts`

Add the 6 new fields to the `Lead` interface.

### Files Changed
- `supabase/functions/waterfall-enrich/index.ts` — add competitor detection logic
- `src/components/CompetitorBadge.tsx` — new component
- `src/components/LeadDetailSheet.tsx` — add competitor badge display
- `src/types/database.ts` — update Lead interface
- Migration: add 6 columns to leads table

