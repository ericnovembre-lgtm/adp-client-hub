

## Registry Discovery (New Businesses) Implementation

The registry-discovery feature does not exist yet. Here's the plan:

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/registry-discovery/index.ts` | Create — OpenCorporates API edge function |
| `src/components/discovery/RegistryDiscoveryTab.tsx` | Create — "New Businesses" tab component |
| `src/pages/AIDiscoveryPage.tsx` | Add 4th tab "New Businesses" with Building2 icon |
| `src/pages/SettingsPage.tsx` | Add OpenCorporates API key section after Census section (~line 885) |
| `src/hooks/useUserSettings.ts` | Add `opencorporates_api_key_configured` field |

### 1. Edge Function: `registry-discovery`
Create as specified in the prompt. Uses OpenCorporates API to search recently incorporated businesses by state/jurisdiction. Includes `inferIndustryFromName` heuristic, duplicate checking, and activity logging. Will fix the settings upsert to use read-merge-write pattern (same fix applied to yelp-discovery). Add `[functions.registry-discovery]` with `verify_jwt = false` to `supabase/config.toml`.

### 2. RegistryDiscoveryTab Component
Following the IntentDiscoveryTab/YelpDiscoveryTab pattern:
- **State checkboxes**: Top 10 states by new business filings (CA, TX, FL, NY, GA, NC, IL, OH, PA, VA) + "Other" dropdown
- **Timeframe dropdown**: Last 3/6/12 months (default: 6)
- **Industry keyword checkboxes**: 12 PEO-friendly categories
- **Green info banner** with Building2 icon explaining the feature
- **"Discover New Businesses" button** with Building2 icon
- **Results table**: Company Name, State, Incorporation Date, Company Type, Inferred Industry, Status
- **Summary card**: Found X, saved Y, skipped Z duplicates

### 3. AIDiscoveryPage Tab Addition
Add a 4th tab trigger "New Businesses" with Building2 icon between Intent-Based and Local Businesses tabs. Renders `<RegistryDiscoveryTab />`.

### 4. Settings: OpenCorporates API Key
After the Census API Key card (~line 885), add a new Card with:
- Password input + Connected/Not configured badges
- Helper text with pricing info
- "Test Connection" button invoking `registry-discovery`

### 5. Secret
Will use `add_secret` tool to request `OPENCORPORATES_API_KEY`.

