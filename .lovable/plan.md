

## Add Manual "Enrich Lead" Button to Lead Detail Sheet

### Approach
Create a new `enrich-lead` edge function that takes a single lead ID, calls Apollo to fetch headcount/website/contact info, and updates the lead. Add an "Enrich Lead" button to LeadDetailSheet that appears when the lead is missing key enrichment data (no headcount or no decision_maker_email).

### Changes

**1. New edge function: `supabase/functions/enrich-lead/index.ts`**
- Accepts `{ lead_id }` via POST
- Fetches the lead from DB
- Calls Apollo `organizations/enrich` (by company name + state) for headcount, website, industry
- Calls Apollo `mixed_people/search` for decision maker contact info
- Updates the lead record with enriched fields (only fills nulls, doesn't overwrite existing data)
- Logs an activity: "Lead enriched via Apollo: added headcount, contact info..."
- Returns the updated fields
- Gracefully returns error if `APOLLO_API_KEY` is not configured

**2. `src/components/LeadDetailSheet.tsx`**
- Add an "Enrich Lead" button in the action buttons section
- Show it when lead is missing `headcount` OR `decision_maker_email` (i.e., not yet enriched)
- Button calls the `enrich-lead` edge function via `supabase.functions.invoke()`
- Shows loading state during enrichment, success toast with what was found, and triggers `onLeadUpdated` to refresh data
- Hide the button if Apollo key isn't configured (detected from error response)

**3. `supabase/config.toml`** — add `verify_jwt = false` for the new function

