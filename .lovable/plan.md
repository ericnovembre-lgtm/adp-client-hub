

## Yelp Local Business Discovery

Four deliverables: edge function, discovery tab component, AIDiscoveryPage tab addition, and Settings API key section.

### 1. Edge Function: `supabase/functions/yelp-discovery/index.ts`

Create as specified with the user's code. One fix needed: the `user_settings` upsert at the end overwrites existing settings — will use a read-merge-write pattern instead (read current settings, spread new yelp fields on top).

Update `supabase/config.toml` to add `[functions.yelp-discovery]` with `verify_jwt = false`.

### 2. New Component: `src/components/discovery/YelpDiscoveryTab.tsx`

Following the `IntentDiscoveryTab` pattern:

- **Location input**: text field, default "Los Angeles, CA"
- **Category checkboxes**: grouped by industry (Healthcare, Construction & Trades, Food & Beverage, Personal Care, Automotive, Professional) — 6 collapsible groups
- **Filters**: Min Reviews slider (10-200, default 20), Min Rating select (3.0/3.5/4.0/4.5), Min PEO Score slider (20-80, default 40), Sort by select
- **"Find Local Businesses" button** with MapPin icon
- **Orange info banner** explaining the feature
- **Results table**: Business Name, Category, City, State, Reviews, Rating, Phone, Est. Headcount, PEO Score (color-coded badge with tooltip showing reasons)
- **Summary card** with found/qualified/saved/skipped counts

### 3. Update `src/pages/AIDiscoveryPage.tsx`

Add a fourth tab trigger "Local Businesses" with MapPin icon, rendering `<YelpDiscoveryTab />`. Import MapPin from lucide-react and the new component.

### 4. Update `src/pages/SettingsPage.tsx`

After the Apollo API Key section (line ~770), add a Yelp Fusion API Key section with:
- Password input + Connected/Not configured badge (same pattern as Apollo)
- Helper text with pricing info
- "Test Connection" button invoking `yelp-discovery` with `{ test_connection: true }`
- State: `yelpKeyConfigured`, `testingYelp`

### 5. Update `src/hooks/useUserSettings.ts`

Add `yelp_api_key_configured` to the `UserSettings` interface.

### 6. Secret: `YELP_API_KEY`

Will use the `add_secret` tool to request the API key from the user before proceeding.

### Files

| File | Action |
|------|--------|
| `supabase/functions/yelp-discovery/index.ts` | Create |
| `supabase/config.toml` | Add function entry |
| `src/components/discovery/YelpDiscoveryTab.tsx` | Create |
| `src/pages/AIDiscoveryPage.tsx` | Add 4th tab |
| `src/pages/SettingsPage.tsx` | Add Yelp key section |
| `src/hooks/useUserSettings.ts` | Add yelp fields |

