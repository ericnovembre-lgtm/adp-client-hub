

## Add Lead411 Growth Signals Integration

### Overview
Create a Lead411 edge function for detecting growth intent signals (funding, hiring, exec hires, expansions, revenue growth), a GrowthSignalsPanel component, and add it as a new "Growth Signals" tab on the AI Discovery page.

### 1. Edge Function: `supabase/functions/lead411-intent/index.ts`
- Same CORS/auth pattern as crm-agent (imports, corsHeaders, Bearer token auth via getUser)
- Reads `LEAD411_API_KEY` from env; returns signup instructions if missing
- API base: `https://api.lead411.com/v1`, auth via `Authorization: Bearer` header

**Three modes:**
1. **`search_companies`** — POST `/search/company` with industry, location, headcount filters. Returns company profiles.
2. **`get_triggers`** — POST `/search/triggers` filtered by trigger_types (recently_funded, hiring_growth, new_locations, new_executive_hires, revenue_growth, ipo_release, hiring_plans). Returns timestamped trigger events with company details.
3. **`search_contacts`** — POST `/search/contact` filtered by company, title, department. Returns verified emails, direct dials, linkedin URLs.

Returns `{ mode, success, data, count, triggers_found?, error? }`.

### 2. Config: `supabase/config.toml`
```toml
[functions.lead411-intent]
verify_jwt = false
```

### 3. Component: `src/components/GrowthSignalsPanel.tsx`
- Filter inputs: trigger type multi-select (checkboxes for recently_funded, hiring_growth, new_locations, new_executive_hires, revenue_growth), industry, location, headcount min/max
- "Find Growing Companies" button calling lead411-intent with mode `get_triggers`
- Results table: Company, Trigger, Date, Details, Headcount, Actions
- Actions per row: "Save to CRM" (inserts lead via supabase) and "Enrich Contact" (calls lead411-intent with mode `search_contacts`)
- Summary badge at top: "X companies with active triggers found"

### 4. AI Discovery Page: `src/pages/AIDiscoveryPage.tsx`
- Import GrowthSignalsPanel
- Add new tab "Growth Signals" with a TrendingUp icon after the existing tabs

### 5. Settings Page: `src/pages/SettingsPage.tsx`
- Add Lead411 settings card with connection status, test button (invokes `search_companies` with a small query), and setup instructions
- Add `lead411_api_key_configured?: boolean` to `useUserSettings.ts`

### 6. Secret
Prompt user for `LEAD411_API_KEY`.

### Files Changed
- `supabase/functions/lead411-intent/index.ts` — new
- `supabase/config.toml` — add function entry
- `src/components/GrowthSignalsPanel.tsx` — new
- `src/pages/AIDiscoveryPage.tsx` — add Growth Signals tab
- `src/pages/SettingsPage.tsx` — add Lead411 settings card
- `src/hooks/useUserSettings.ts` — add lead411_api_key_configured

