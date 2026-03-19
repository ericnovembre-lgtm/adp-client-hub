

# Outreach Analytics Enhancement Plan

## Summary
Enhance the existing Outreach Intelligence page with 5 modules: (1) Email Type Performance breakdown, (2) Period-over-period trend indicators on KPI cards, (3) Metadata-first grouping for competitor/type detection, (4) Click-to-Open Rate KPI card, (5) Exportable insights summary.

## Module 1: Email Type Performance Section

**File: `src/hooks/useOutreachAnalytics.ts`**
- Add a new `emailTypePerformance` query that groups emails by type (cold_outreach, competitor_displacement, follow_up, trigger_based, other)
- Use `metadata->>'email_type'` first, fall back to `detectEmailType()` subject matching
- Return: `{ type, sent, opens, clicks, openRate, clickRate }[]`

**File: `src/pages/OutreachAnalyticsPage.tsx`**
- Add new section between Competitor Angle and Subject Leaderboard: "Email Type Performance"
- Horizontal BarChart showing open rate + click rate per email type
- Type labels formatted (e.g., `cold_outreach` → "Cold Outreach")

## Module 2: Period-over-Period Trends on KPI Cards

**File: `src/hooks/useOutreachAnalytics.ts`**
- In the `overall` query, also fetch the previous period's data (e.g., if range=30, fetch days 31-60)
- Return `prevTotalSent`, `prevOpenRate`, `prevClickRate`, `prevReplyRate`
- Calculate delta for each metric

**File: `src/pages/OutreachAnalyticsPage.tsx`**
- Update `KPICard` to accept an optional `trend` prop (`{ delta: number; direction: 'up' | 'down' | 'flat' }`)
- Show green up-arrow or red down-arrow with delta percentage next to each value

## Module 3: Metadata-First Competitor Grouping

**File: `src/hooks/useOutreachAnalytics.ts`**
- In `competitorPerformance` query, check `metadata->>'competitor_angle'` on each email_send_log row before falling back to subject pattern matching
- Requires fetching `metadata` column in the select: `.select("message_id, subject, created_at, metadata")`
- Priority: `metadata.competitor_angle` > outreach_queue match > subject pattern detection

## Module 4: Click-to-Open Rate KPI

**File: `src/pages/OutreachAnalyticsPage.tsx`**
- Change from 4-column to 5-column KPI grid (still responsive: 2 cols on mobile, 5 on desktop)
- Add 5th card: "CTO Rate" (Click-to-Open Rate) — already computed in hook as `clickToOpenRate`
- Benchmark: 10-15% for B2B
- Color thresholds: green >= 15%, yellow >= 8%, red < 8%

## Module 5: Export & Share Insights

**File: `src/pages/OutreachAnalyticsPage.tsx`**
- Add a "Copy Insights" button in the AI Insights card header that copies all bullet points to clipboard
- Add a "Download Report" button in the page header that exports a summary CSV with: metric name, value, benchmark, trend
- Uses the existing `exportCSV` utility from `src/lib/exportCSV.ts`

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks/useOutreachAnalytics.ts` | Add `emailTypePerformance` query, add previous-period fetch for trends, metadata-first competitor detection |
| `src/pages/OutreachAnalyticsPage.tsx` | Add Email Type section, trend arrows on KPIs, CTO Rate card, export buttons |

No database changes needed — the `metadata` column already exists on `email_send_log`.

