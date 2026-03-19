

## Create Crunchbase Intel Edge Function

### Overview
New edge function at `supabase/functions/crunchbase-intel/index.ts` that proxies three Crunchbase API v4 endpoints for funding data, company search, and company lookup. Follows the same auth/CORS pattern as `crm-agent`.

### Edge Function: `supabase/functions/crunchbase-intel/index.ts`

- Imports: `serve` from deno std, `createClient` from supabase-js (same versions as crm-agent)
- CORS headers: identical to crm-agent
- Auth: Bearer token → `getUser()` check
- Reads `CRUNCHBASE_API_KEY` from env; returns descriptive error if missing

Three modes as specified:

1. **search_companies** — POST to `/searches/organizations?user_key={key}` with field_ids for identifier, description, location, categories, employees, founding, website, funding_total, last_funding_type, last_funding_at. Builds query predicates dynamically (employee range, location, optional industry/funding filters). Returns array of extracted company objects.

2. **search_funding** — POST to `/searches/funding_rounds?user_key={key}` with field_ids for identifier, funded_organization_identifier, money_raised, announced_on, investment_type, num_investors. Defaults `funded_after` to 6 months ago. Returns array of funding round objects sorted by date desc.

3. **lookup_company** — GET to `/entities/organizations/{permalink}?user_key={key}&field_ids=...` where permalink is derived from company_name (lowercased, spaces to hyphens). Returns single company detail object.

All modes return `{ mode, success, data, count, error? }`.

### Config
Add to `supabase/config.toml`:
```toml
[functions.crunchbase-intel]
verify_jwt = false
```

### Secret
Will prompt user for `CRUNCHBASE_API_KEY` (not currently in project secrets).

### Files Changed
- `supabase/functions/crunchbase-intel/index.ts` — new
- `supabase/config.toml` — add function entry

