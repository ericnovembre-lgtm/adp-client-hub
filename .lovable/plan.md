

## Territory Analytics Agent

### Overview
Create an edge function that aggregates pipeline data and generates AI-powered territory insights, plus a new page with KPIs, charts, and analysis display.

### 1. Edge Function: `supabase/functions/territory-analytics/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS headers, Anthropic API (`claude-sonnet-4-20250514`), auth via Bearer token
- Accepts POST `{ period?: "this_week" | "this_month" | "this_quarter" | "all_time" }`
- Runs 10 aggregation queries against leads, deals, activities, tasks tables (all scoped to user via RLS)
- Sends aggregated data to Anthropic with the full system prompt (territory health, industry concentration, geographic gaps, pipeline flow, activity analysis, source effectiveness, whitespace opportunities, weekly action plan)
- Returns `{ analysis, health_score, total_leads, total_deals, total_pipeline_value }`

Config: add `[functions.territory-analytics] verify_jwt = false` to `supabase/config.toml`

### 2. Page: `src/pages/TerritoryAnalyticsPage.tsx`

- KPI cards row: Total Leads, Total Deals, Pipeline Value, Health Score (color-coded badge: green/yellow/orange/red)
- Period selector dropdown (this week / month / quarter / all time)
- "Run Analysis" button with loading state
- AI analysis displayed in a scrollable Card
- Three Recharts BarCharts: leads by industry (top 10), leads by state (top 10), deals by stage
- Charts populated from the raw aggregation data returned alongside the analysis

### 3. Navigation & Routing

- Add `{ title: "Territory Analytics", path: "/territory-analytics", icon: Map }` to `AppSidebar.tsx` nav items (after Market Intel)
- Add `/territory-analytics` route in `App.tsx` with `ProtectedPage` wrapper
- Import `TerritoryAnalyticsPage` in `App.tsx`

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/territory-analytics/index.ts` — new edge function
- `src/pages/TerritoryAnalyticsPage.tsx` — new page with KPIs, charts, analysis
- `src/components/AppSidebar.tsx` — add nav item
- `src/App.tsx` — add route + import

