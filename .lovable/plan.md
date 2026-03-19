

## Add Real-Time BLS Employment Signals to Market Intelligence

### What This Adds
A new "Recent Trends" section on the Market Intelligence page that pulls **Bureau of Labor Statistics (BLS) Quarterly Census of Employment and Wages (QCEW)** data. QCEW is published quarterly with ~6 month lag (vs Census CBP's ~2 year lag), giving much fresher employment signals. The BLS API is free and requires no API key for up to 50 requests/day.

### How It Works

```text
┌──────────────────────────────────────────────┐
│  Market Intelligence Page                     │
│                                               │
│  [Census CBP Analysis]  ← existing            │
│  ────────────────────                         │
│  [Recent BLS Trends]    ← NEW section         │
│    • Latest quarter employment changes        │
│    • Average weekly wages by industry/state   │
│    • Quarter-over-quarter growth indicators   │
│    • "Hot Market" badges for fast movers      │
└──────────────────────────────────────────────┘
```

### Changes

**1. New edge function: `supabase/functions/bls-trends/index.ts`**
- Calls BLS Public Data API v2 (`https://api.bls.gov/publicAPI/v2/timeseries/data/`)
- Fetches QCEW series for selected industries and states (series IDs built from NAICS + state FIPS codes)
- Returns latest 2 quarters of: employment level, average weekly wages, and over-the-quarter percent change
- No API key needed (public tier: 50 requests/day, 10 series per request)
- Auth required (same pattern as market-intelligence)

**2. Frontend: `src/pages/MarketIntelligencePage.tsx`**
- Add a "Fetch Recent Trends" button that calls the new edge function after Census analysis completes
- New card section below Top Opportunities showing:
  - Industry/state pairs with latest quarterly employment change
  - Average weekly wage (signals employer size/spend capacity)
  - "Hot" badge when QoQ employment growth exceeds 2%
- Data source footnote: "BLS QCEW, [latest quarter]. Updated quarterly."

**3. Edge function config: `supabase/config.toml`**
- Add `[functions.bls-trends]` with `verify_jwt = false` (auth handled in code)

### BLS Series ID Format
QCEW series follow the pattern: `ENU{STATE_FIPS}0{SIZE_CODE}0{OWNERSHIP}{NAICS}{DATA_TYPE}`
- Example: `ENU0600010623101` = California, all sizes, private, Construction sector, employment level
- We'll query employment level (1) and avg weekly wages (5) for each state/industry combo

### Technical Notes
- BLS public tier allows 10 series per request, so we batch efficiently (2 series per industry-state = employment + wages)
- Results are cached in component state alongside Census data
- The PEO Opportunity Score on the Census table gets a small boost (+5-15 points) if BLS shows positive recent quarterly growth for that same industry-state pair

