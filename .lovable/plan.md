

## Call Prep Agent

### Overview
Add a Call Prep feature that generates a pre-call briefing for any lead or contact, using the same Anthropic-powered pattern as the Deal Coach.

### Changes

**1. Edge Function: `supabase/functions/call-prep/index.ts`**
- Same pattern as `deal-coach/index.ts` (serve, createClient, corsHeaders, Anthropic API, `claude-sonnet-4-20250514`)
- Accepts `POST { lead_id?, contact_id?, company_name? }`
- Authenticates via `getUser()`
- Queries: lead or contact data, related deals (for contacts), last 10 activities, open tasks, knockout_rules for industry check
- Sends context to Anthropic with the specified 7-section system prompt (Company Snapshot, Decision Maker, Why They Need ADP, Talking Points, Objections, CTA, Industry Eligibility)
- Returns `{ briefing: string, industry_status: string }`

**2. Config: `supabase/config.toml`**
- Add `[functions.call-prep]` with `verify_jwt = false`

**3. Component: `src/components/CallPrepPanel.tsx`**
- Props: `lead_id?: string`, `contact_id?: string`
- "Prep My Call" button that invokes `call-prep` edge function
- Displays briefing in a Card with industry eligibility badge (colored like knockout tiers: green/clear, blue/bluefield, orange/low_probability, red/prohibited)
- Loading spinner while generating
- Refresh button after initial result

**4. Update: `src/components/LeadDetailSheet.tsx`**
- Add a "Prep Call" button in the action buttons section (alongside Draft Email, Convert to Deal, Enrich Lead)
- Toggle visibility of `CallPrepPanel` below, passing `lead_id`

### Technical Details
- No database changes needed
- Uses existing `ANTHROPIC_API_KEY` secret
- Knockout rules queried server-side for industry eligibility assessment
- Edge function uses service role key for cross-table queries, scoped by user_id

