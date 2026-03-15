

## Intent Discovery — Apollo.io Integration

This adds a second discovery mode to the AI Discovery page that calls Apollo.io's API to find real companies with buyer intent signals for PEO services.

### What Changes

**New Edge Function** — `supabase/functions/intent-discovery/index.ts`
- Calls Apollo's Mixed People Search API with PEO-related keyword tags and decision-maker title filters
- Filters results to 2-20 headcount territory
- Deduplicates against existing leads
- Inserts new leads with source `"apollo_intent"` and logs activities
- Requires `APOLLO_API_KEY` secret (user must provide)

**Updated AI Discovery Page** — `src/pages/AIDiscoveryPage.tsx`
- Add Tabs component at the top: "AI Generated" (existing) and "Intent-Based" (new)
- Intent-Based tab contains:
  - Blue info banner explaining this uses real Apollo data
  - Checkboxes for 8 PEO intent topics (pre-checked)
  - Existing state/industry filters
  - Headcount range locked to 2-20
  - "Discover Leads" button calling `intent-discovery`
  - Results summary + table showing discovered leads
- Existing Manual Discovery and Scheduler cards move under the "AI Generated" tab

**Updated Settings Page** — `src/pages/SettingsPage.tsx`
- Add "Apollo API Key" password input in the AI Configuration section
- Helper text with instructions to get the key from app.apollo.io
- "Test Connection" button that invokes intent-discovery with minimal params
- Connected/Not configured status badge
- Key stored in `user_settings` JSON (the edge function reads from `APOLLO_API_KEY` env secret)

**Secret Setup** — `APOLLO_API_KEY`
- Use the `add_secret` tool to prompt the user to enter their Apollo API key
- Edge function checks for this secret and returns a clear error if missing

**Config** — `supabase/config.toml`
- Add `[functions.intent-discovery]` with `verify_jwt = false`

**UserSettings hook** — add `apollo_api_key_configured` boolean field

### Technical Details

- The edge function uses Apollo's `POST /v1/mixed_people/search` endpoint with `q_organization_keyword_tags`, `person_titles`, `person_seniorities`, and `organization_num_employees_ranges` filters
- Territory enforcement happens both in the API query params and as a post-filter
- The `user_settings` upsert in the edge function will merge with existing settings (read-then-write pattern already used by scheduled-discovery)
- Tab state defaults to "AI Generated" since Apollo key may not be configured yet

### Files

| File | Action |
|------|--------|
| `supabase/functions/intent-discovery/index.ts` | Create — new edge function |
| `supabase/config.toml` | Add intent-discovery function config |
| `src/pages/AIDiscoveryPage.tsx` | Add tabs, intent-based discovery UI |
| `src/pages/SettingsPage.tsx` | Add Apollo API key input + test button |
| `src/hooks/useUserSettings.ts` | Add `apollo_api_key_configured` field |

