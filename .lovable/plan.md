

## Waterfall Orchestrator Update — Steps 6-7 Progress + Dashboard Competitor Breakdown

### What's Already Done
The waterfall-enrich edge function already has competitor detection (Step 6.5) and competitor-aware scoring integrated. The enrichment results already include competitor data. No backend changes needed.

### What Needs to Change

#### 1. Deep Enrich Progress Indicator (`LeadDetailSheet.tsx`)
Currently shows a simple "Deep Enriching..." spinner. Replace with a step-by-step progress display:
- Add `enrichStep` state tracking current step (1-7)
- Use SSE-style polling or simply show a static "Step X/7: ..." label that updates on a timer during enrichment (since the edge function is a single call, simulate progress steps on ~2s intervals)
- Steps: Apollo → Hunter.io → Snov.io → Crunchbase → Lead411 → Detecting provider → Calculating score
- On completion, update toast to: `"✅ Provider: [X] | Score: Y (Tier) | Displacement: Z"`

#### 2. Enrichment Results Card Enhancement (`LeadDetailSheet.tsx`)
Add competitor detection and scoring rows to the existing enrichment results card:
- Show "Provider Detected" row with competitor name + displacement badge
- Show "Competitor Score" row with breakdown

#### 3. Dashboard Competitor Breakdown Widget (`DashboardPage.tsx`)
Add a new "Competitor Breakdown" section with:
- Query leads grouped by `current_provider` for a pie chart (using Recharts `PieChart`)
- Query leads grouped by `displacement_difficulty` for a bar chart
- Counter: "X hot leads on easy-to-displace competitors" (leads with score ≥80 and displacement="Easy")
- Table: Top 10 leads sorted by total score with competitor badges

New query hook or inline queries fetching:
```sql
-- Leads by provider
SELECT current_provider, COUNT(*) FROM leads WHERE current_provider IS NOT NULL GROUP BY current_provider
-- Leads by displacement
SELECT displacement_difficulty, COUNT(*) FROM leads WHERE displacement_difficulty IS NOT NULL GROUP BY displacement_difficulty
-- Hot + Easy leads
SELECT * FROM leads WHERE displacement_difficulty = 'Easy' JOIN lead_scores ON ... WHERE score >= 80
```

### Files Changed
- `src/components/LeadDetailSheet.tsx` — progress steps during enrichment + enhanced results display
- `src/pages/DashboardPage.tsx` — add Competitor Breakdown widget with pie chart, bar chart, counter, and top leads table

