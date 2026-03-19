

## Waterfall Enrichment Engine

### Overview
Create a master enrichment edge function that chains 5 data providers in sequence to maximize lead data completeness. Add "Deep Enrich" button to LeadDetailSheet and "Bulk Enrich" button to LeadsPage.

**Important note:** The plan references "PDL" (People Data Labs) in Step 4, but PDL was replaced with Snov.io. Step 4 will use `snov-enrichment` instead of `pdl-enrichment`.

### 1. Edge Function: `supabase/functions/waterfall-enrich/index.ts`

Same auth pattern as `enrich-lead`. Uses service role client for DB operations.

**Flow:**
1. Read lead from DB, identify missing fields
2. **Apollo** (Step 1) — call `enrich-lead` function internally (re-use existing logic inline since edge functions can't call each other easily). Try org enrichment + people search.
3. **Hunter.io** (Step 2) — if email still missing and we have name+domain, call `hunter-email` via fetch to the edge function URL. Use `email_finder` then `email_verifier`.
4. **Snov.io** (Step 3) — if still missing email/phone/profile data and lead score >= 40, call `snov-enrichment` with `check_gaps` mode.
5. **Crunchbase** (Step 4) — call `crunchbase-intel` with `lookup_company` if funding signals detected. Update trigger_type/trigger_event if funding found in last 12 months.
6. **Lead411** (Step 5) — if `LEAD411_API_KEY` is set, call `lead411-intent` with `get_triggers`. Update trigger if more recent/specific.
7. Update lead (only fill blanks unless `force_refresh`).
8. Recalculate score inline (headcount 2-20 = 30pts, ADP industry = 25pts, verified email = 15pts, real trigger = 20pts, contact completeness = 10pts). Upsert to `lead_scores`.
9. Log activity with sources used and fields enriched.

Each provider call is a fetch to the edge function URL with the user's auth token forwarded. Each step is wrapped in try/catch — failures skip gracefully.

**Returns** the detailed enrichment result object with `sources_tried`, `sources_succeeded`, `fields_before/after`, `enrichment_details` per provider, `score_change`, and `trigger_updated`.

### 2. Config: `supabase/config.toml`
```toml
[functions.waterfall-enrich]
verify_jwt = false
```

### 3. LeadDetailSheet: "Deep Enrich" button
- Add `isDeepEnriching` state and `deepEnrichResult` state
- Replace the existing "Enrich Lead" button with "Deep Enrich" that calls `waterfall-enrich`
- Show a progress card during enrichment with provider status updates (polling or just a spinner with "Running waterfall enrichment...")
- After completion, show a summary card: sources used, fields found, score change
- Invalidate queries on completion

### 4. LeadsPage: "Bulk Enrich" button
- Add a "Bulk Enrich" button in the toolbar (next to existing bulk action buttons)
- When clicked, filters leads with status "new" that are missing email or headcount
- Processes sequentially with a progress dialog: "Enriching X of Y... [CompanyName]"
- Shows summary on completion: total enriched, fields found, failures

### Files Changed
- `supabase/functions/waterfall-enrich/index.ts` — new (main orchestrator)
- `supabase/config.toml` — add waterfall-enrich entry
- `src/components/LeadDetailSheet.tsx` — replace Enrich button with Deep Enrich + results display
- `src/pages/LeadsPage.tsx` — add Bulk Enrich button + progress dialog

