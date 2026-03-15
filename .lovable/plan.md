

## Improve Registry Discovery Result Volume

### Current State
The edge function already does **not** filter by industry keywords at the API level — OpenCorporates doesn't support industry filtering. All recently incorporated companies are fetched, and `inferIndustryFromName()` classifies them post-hoc. The `industry_keywords` parameter from the UI is only used for a simple name-match (`matchedIndustry`) but does **not** exclude any companies.

The real volume bottleneck is the `per_page: 30` default limit per state. With 3 states, that's max 90 companies before deduplication.

### Changes

**1. `supabase/functions/registry-discovery/index.ts`**
- Increase default `per_page` from 30 to 100 (OpenCorporates max)
- Remove `industry_keywords` from the request body params (not used for API filtering)
- Keep `inferIndustryFromName()` for post-processing classification — it already handles all companies
- Add the user-selected keywords as an additional classification pass: if `inferIndustryFromName` returns null, check against the user's keyword list as a fallback

**2. `src/components/discovery/RegistryDiscoveryTab.tsx`**
- Rename "Industry Keywords" section to "Industry Classification" with helper text: "Tag discovered leads by industry (does not limit results)"
- Change default `per_page` sent to the function from 30 to 100
- Add a "Results per state" selector (30 / 50 / 100) so users can control volume
- Show industry-classified vs unclassified counts in the results summary

