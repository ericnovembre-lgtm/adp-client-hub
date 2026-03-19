

## Hunter.io Email Edge Function

### Overview
Create a single edge function at `supabase/functions/hunter-email/index.ts` that proxies four Hunter.io API endpoints. No UI pages or components needed.

### Edge Function: `supabase/functions/hunter-email/index.ts`

Same pattern as `enrich-lead/index.ts`:
- CORS headers, auth via Bearer token + `getUser()`
- Reads `HUNTER_API_KEY` from env; returns `hunter_not_configured` error if missing
- Accepts POST with `{ mode, domain?, first_name?, last_name?, email?, company? }`

Four modes, each calling `https://api.hunter.io/v2/...?api_key={key}`:
- `domain_search` → GET `/domain-search?domain={domain}` — returns emails array
- `email_finder` → GET `/email-finder?domain={domain}&first_name=...&last_name=...` — returns email + confidence
- `email_verifier` → GET `/email-verifier?email={email}` — returns verification status
- `company_enrichment` → GET `/companies/find?domain={domain}` — returns company info

Returns `{ mode, success, data, credits_used, error? }`

### Config
Add `[functions.hunter-email] verify_jwt = false` to `supabase/config.toml`.

### Secret
Will prompt for `HUNTER_API_KEY` secret (not currently in project secrets).

### Files Changed
- `supabase/functions/hunter-email/index.ts` — new
- `supabase/config.toml` — add function config

