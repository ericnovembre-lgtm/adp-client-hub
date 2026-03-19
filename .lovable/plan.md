

## Create PDL Enrichment Edge Function

### Overview
New edge function for People Data Labs API integration, providing person enrichment, company enrichment, and person search as a secondary data source when Apollo is incomplete.

### Edge Function: `supabase/functions/pdl-enrichment/index.ts`
- Same CORS/auth pattern as `crunchbase-intel` (imports, corsHeaders, Bearer token → getUser)
- Reads `PDL_API_KEY` from env; returns signup instructions if missing (free tier: 100 lookups/month)
- API base: `https://api.peopledatalabs.com/v5`, auth via `X-Api-Key` header

**Three modes:**

1. **`person_enrich`** — GET `/person/enrich` with query params built from email, phone, name, company, linkedin_url, location. Extracts: full_name, first/last name, job_title, company info, work_email, personal_emails, phone_numbers, linkedin_url, location, experience, education, skills. Returns `match_likelihood` from PDL response.

2. **`company_enrich`** — GET `/company/enrich` with `website={domain}` or `name={company}`. Extracts: name, display_name, size, industry, location, founded, description, linkedin_url, employee_count, tags, recent_exec_hires, technologies.

3. **`person_search`** — POST `/person/search` with Elasticsearch-style bool query built from provided filters (job_company_name, job_title, location). Size defaults to 10. Returns array of person profiles.

All modes return `{ mode, success, data, match_likelihood?, error? }`.

### Config
Add to `supabase/config.toml`:
```toml
[functions.pdl-enrichment]
verify_jwt = false
```

### Secret
Prompt user for `PDL_API_KEY` (not currently configured).

### Files Changed
- `supabase/functions/pdl-enrichment/index.ts` — new
- `supabase/config.toml` — add function entry

