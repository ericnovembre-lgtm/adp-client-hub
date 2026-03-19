

## Crunchbase Intel via RapidAPI Free Tier

### Overview
Replace the planned direct Crunchbase API integration with a RapidAPI-proxied version that uses the free Basic plan (500 req/month). The function only queries Crunchbase when a funding signal has already been detected by another provider (Apollo, etc.), conserving the free tier.

### Changes

#### 1. Edge Function: `supabase/functions/crunchbase-intel/index.ts` (new)
- Same CORS/auth pattern as `enrich-lead` (Deno.serve, Bearer token, getUser check)
- Reads `RAPIDAPI_KEY` from env; returns setup instructions if missing
- Uses `RAPIDAPI_HOST = crunchbase-crunchbase-v1.p.rapidapi.com`
- Three modes:

  **`search_companies`** — GET `odm-organizations?name={name}` with RapidAPI headers. Extracts company profile + embedded funding data (total_funding_usd, last_funding_type, num_funding_rounds, etc.)

  **`check_funding`** — The primary mode. Accepts `company_name`, `domain`, and optional `enrichment_hints` (apollo funding tags, trigger events). Runs `shouldQueryCrunchbase()` logic first; if no funding signals detected, returns `{ skipped: true, reason }`. If signals present, queries ODM Organizations endpoint, extracts funding data, categorizes into tiers (pre_seed/seed/early_stage/growth/late_stage), and flags `recently_funded` (within 6 months).

  **`lookup_company`** — GET `odm-organizations?name={name}`, find best match by domain/name, return full profile with funding data.

- Returns: `{ mode, success, data, count, skipped?, skip_reason?, funding_tier?, recently_funded? }`
- Helper functions: `isRecentlyFunded()`, `categorizeFunding()`, `shouldQueryCrunchbase()`

#### 2. Config: `supabase/config.toml`
Add:
```toml
[functions.crunchbase-intel]
verify_jwt = false
```

#### 3. Secret: `RAPIDAPI_KEY`
Prompt user for their RapidAPI key with setup instructions (sign up at rapidapi.com, subscribe to Crunchbase Basic free plan, copy X-RapidAPI-Key).

#### 4. Settings Page: `src/pages/SettingsPage.tsx`
- Add `rapidapiKeyConfigured` / `testingRapidapi` state
- Add `rapidapi_key_configured` to UserSettings interface
- Add a "Crunchbase (RapidAPI)" card after the Klue card with:
  - Connection status badge
  - "Free: 500 requests/month" note
  - Test Connection button (invokes `crunchbase-intel` with `{ mode: "lookup_company", company_name: "ADP" }`)
  - Setup instructions text

#### 5. UserSettings: `src/hooks/useUserSettings.ts`
- Add `rapidapi_key_configured?: boolean` to the interface

### Files Changed
- `supabase/functions/crunchbase-intel/index.ts` — new
- `supabase/config.toml` — add function entry
- `src/pages/SettingsPage.tsx` — add RapidAPI/Crunchbase settings card
- `src/hooks/useUserSettings.ts` — add `rapidapi_key_configured` field

