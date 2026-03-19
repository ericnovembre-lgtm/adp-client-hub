

## Lead Enrichment for Registry-Discovered Leads

Registry leads lack headcount, website, and decision-maker contact info. This plan adds a post-discovery enrichment step using the Apollo API (already configured with `APOLLO_API_KEY`).

### Architecture

```text
Registry Discovery (OpenCorporates)
        │
        ▼
   Leads saved (no headcount/contact)
        │
        ▼
   Enrichment step (Apollo People Search)
        │
        ▼
   Update leads with headcount, website,
   decision maker name/title/email/phone
```

### Changes

**1. `supabase/functions/registry-discovery/index.ts`**
- After saving all registry leads, add an enrichment pass using Apollo's `organizations/enrich` endpoint
- For each saved lead, call Apollo with the company name + state to get: headcount, website, industry (refined), and a decision-maker contact via `mixed_people/search`
- Only enrich if `APOLLO_API_KEY` is present (graceful skip otherwise)
- Update the lead record with enriched data
- Log enrichment activity
- Add enrichment stats to the response (`enriched` count)
- Rate-limit Apollo calls (200ms delay between)

**2. `src/components/discovery/RegistryDiscoveryTab.tsx`**
- Show enrichment results in the summary: "Found X, saved Y, enriched Z"
- Add an "Enriched" badge on leads that received contact info
- Show decision maker name/email columns in the results table when available
- Add a note: "Leads enriched via Apollo (headcount + contacts)" when Apollo key is configured, or "Configure Apollo API key in Settings to auto-enrich leads with headcount & contacts" when not

### Technical Detail

The enrichment uses two Apollo endpoints per lead:
1. `POST /v1/organizations/enrich` with `domain` or `name` — returns headcount, website, industry
2. `POST /v1/mixed_people/search` with company name + decision-maker titles — returns contact info

Fields updated on the lead: `headcount`, `website`, `industry` (if null), `decision_maker_name`, `decision_maker_title`, `decision_maker_email`, `decision_maker_phone`

Leads outside territory range (2-20 employees) after enrichment get flagged with a warning activity, consistent with existing scoring behavior.

