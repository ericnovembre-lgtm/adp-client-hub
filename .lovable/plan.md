

## Replace PDL with Snov.io Enrichment

### Overview
Replace `supabase/functions/pdl-enrichment/index.ts` with a new `supabase/functions/snov-enrichment/index.ts` edge function that uses Snov.io's OAuth 2.0 API for email finding, email verification, prospect enrichment, and domain search. Add a Snov.io settings card to the Settings page. Delete the old PDL function.

### Changes

#### 1. New Edge Function: `supabase/functions/snov-enrichment/index.ts`
- Same CORS/auth pattern as `crunchbase-intel`
- Reads `SNOV_USER_ID` and `SNOV_API_SECRET` from env; returns setup instructions if missing
- Internal OAuth token helper: POST to `https://api.snov.io/v1/oauth/access_token` with client_credentials grant, caches token for 1 hour
- Conditional logic: accepts `enrichment_hints` (apollo results, hunter results, lead score) and runs `shouldQuerySnov()` — only fires when there are data gaps (missing email, phone, linkedin, profile) AND lead score >= 40

**Five modes:**

1. **`find_email`** — POST `/v1/get-emails-from-names` with first_name, last_name, domain. Returns matched emails with confidence/type/status. 1 credit.

2. **`verify_email`** — POST `/v1/add-emails-to-verification` then `/v1/get-emails-verification-status` (with 3s poll delay). Returns valid/invalid/unverifiable. 1 credit.

3. **`enrich_prospect`** — POST `/v1/get-prospect-by-email`. Extracts first/last name, industry, country, locality, social_links, current_jobs (company, title, domain, size, industry, founded), previous_jobs. 1 credit.

4. **`domain_search`** — POST `/v1/get-domain-emails-count` (free) then `/v2/domain-emails-with-info` (1 credit per batch of 10). Returns email list with names/positions.

5. **`check_gaps`** — The primary orchestrator mode. Accepts lead data + enrichment_hints. Runs shouldQuerySnov(). If gaps exist and budget allows, calls find_email → verify_email → enrich_prospect in sequence, filling gaps. Returns combined results with credits_used tally.

Returns: `{ mode, success, data, credits_used, skipped?, skip_reason? }`

#### 2. Delete: `supabase/functions/pdl-enrichment/index.ts`
Remove the old PDL function entirely.

#### 3. Config: `supabase/config.toml`
Add:
```toml
[functions.snov-enrichment]
verify_jwt = false
```

#### 4. Secrets
Prompt user for `SNOV_USER_ID` and `SNOV_API_SECRET` (get from snov.io account settings).

#### 5. Settings Page: `src/pages/SettingsPage.tsx`
- Add `snovKeyConfigured` / `testingSnov` state variables
- Load/save `snov_key_configured` from user settings
- Add a "Snov.io" card (after Crunchbase card) with:
  - Connection status badge
  - "Free: 50 credits/month" note
  - Test Connection button (invokes `snov-enrichment` with `{ mode: "domain_search", domain: "adp.com" }` — domain count is free)
  - Setup instructions

#### 6. UserSettings: `src/hooks/useUserSettings.ts`
- Add `snov_key_configured?: boolean` to interface
- Remove `pdl_api_key_configured` if present (it's not — confirmed)

### Files Changed
- `supabase/functions/snov-enrichment/index.ts` — new
- `supabase/functions/pdl-enrichment/index.ts` — delete
- `supabase/config.toml` — add snov-enrichment entry
- `src/pages/SettingsPage.tsx` — add Snov.io settings card
- `src/hooks/useUserSettings.ts` — add snov_key_configured

