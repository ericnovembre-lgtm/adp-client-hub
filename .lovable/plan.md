

## Renewal Tracker Agent

### Overview
Create an edge function that scans leads for competitor PEO relationships and tracks renewal timing, plus a dashboard component and new page/route.

### 1. Edge Function: `supabase/functions/renewal-tracker/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS headers, Anthropic API (`claude-sonnet-4-20250514`), auth via Bearer token + `getUser()`
- Hardcoded `RENEWAL_DATES` map for 9 competitors
- **Scan mode**: Query leads where `trigger_type = 'competitor_peo_renewal'` OR `trigger_event` ilike any competitor name. Calculate days until next renewal for each, categorize (urgent/approaching/upcoming/future). Send categorized list to Anthropic with the competitive analysis system prompt. Auto-create tasks for urgent leads (check for existing open tasks first).
- **Single mode**: Query specific lead, identify competitor, generate personalized displacement email via Anthropic.
- Returns `{ analysis, urgent_count, approaching_count, upcoming_count, leads[] }`

Config: add `[functions.renewal-tracker] verify_jwt = false` to `supabase/config.toml`

### 2. Component: `src/components/RenewalDashboard.tsx`

- Summary cards row: Urgent (red), Approaching (orange), Upcoming (yellow) with counts
- "Run Scan" button with loading state
- Table listing leads grouped by category: company name, competitor, days until renewal, category badge
- Each row has a "Draft Displacement Email" button that calls the function in `single` mode and displays the result in a dialog or expandable section
- Analysis text displayed in a Card below the summary

### 3. Page: `src/pages/RenewalsPage.tsx`

Simple wrapper rendering `<RenewalDashboard />`

### 4. Navigation & Routing

- Add `{ title: "Renewals", path: "/renewals", icon: RefreshCw }` to `AppSidebar.tsx` nav items (after Quote Readiness)
- Add `/renewals` route in `App.tsx` with `ProtectedPage` wrapper

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/renewal-tracker/index.ts` — new edge function
- `src/components/RenewalDashboard.tsx` — new component
- `src/pages/RenewalsPage.tsx` — new page
- `src/components/AppSidebar.tsx` — add nav item
- `src/App.tsx` — add route

