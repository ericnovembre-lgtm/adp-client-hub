

# Analytics Enhancement Plan

## Summary
Add 5 new analytics modules across DashboardPage and ReportsPage: Quota Tracker, Deal Velocity, Competitor Win/Loss, Lead Score Distribution, and Outreach Effectiveness. All existing content remains untouched.

## New Files to Create

### 1. `src/hooks/useQuotaData.ts`
- Reads `quarterly_quota` from `user_settings` (default $500,000)
- Queries `deals` where `stage = 'closed_won'` in current quarter
- Queries open deals for pipeline coverage ratio
- Returns: quota, closedWon, gap, paceStatus, coverageRatio, daysRemaining, percentComplete

### 2. `src/components/QuotaTrackerWidget.tsx`
- Horizontal progress bar (shadcn Progress) showing closed-won vs quota
- Stat row: Quota, Closed Won, Gap, Pipeline Coverage (Xx)
- Pace badge: On Track (green) / Behind Pace (yellow) / At Risk (red)
- Days remaining in quarter
- Pencil icon → Dialog to edit `quarterly_quota` via `useUpdateUserSettings`

### 3. `src/hooks/useDealVelocity.ts`
- Queries activities with `type = 'stage_change'` or descriptions containing "Stage changed"
- Parses stage transitions, calculates avg days per stage
- Avg days to close (won/lost)
- Top 5 slowest open deals
- Accepts ReportsFilters for date range

### 4. `src/components/DealVelocityChart.tsx`
- Horizontal BarChart: avg days per stage
- Summary: "Avg Sales Cycle: X days (won) | Y days (lost)"
- Table of 5 slowest open deals with stage, value, age
- Empty state if no stage_change activities

### 5. `src/hooks/useCompetitorAnalytics.ts`
- Queries closed deals, joins to leads by company_name match
- Groups by `current_provider`: win rate, avg deal value, avg cycle, revenue won
- Falls back to "Unknown" if no lead match

### 6. `src/components/CompetitorWinLossChart.tsx`
- Stacked bar chart: won (green) vs lost (red) per competitor
- Win rate labels on bars
- Summary table below
- Empty state placeholder

### 7. `src/hooks/useScoreDistribution.ts`
- Queries `lead_scores` grouped by grade (A/B/C/D)
- Joins to leads for conversion rate per grade
- Returns counts, percentages, conversion rates

### 8. `src/components/ScoreDistributionChart.tsx`
- Donut chart with 4 grade segments
- Horizontal bar chart: conversion rate by grade
- Insight text auto-generated from data
- Empty state if no scores

### 9. `src/hooks/useOutreachMetrics.ts`
- Queries `email_send_log` + `email_tracking_events` in date range
- Calculates: total sent, open rate, click rate
- Daily volume for line chart
- Also queries `outreach_queue` for drafted/approved stats

### 10. `src/components/OutreachMetricsChart.tsx`
- 4 stat cards: Sent, Open Rate, Click Rate, Reply Rate
- Line chart: daily volume + open rate (dual axis)
- Empty state placeholder

## Files to Modify

### `src/pages/DashboardPage.tsx`
- Import `QuotaTrackerWidget`
- Insert it after the stat cards row, before the Benefits/Discovery section

### `src/pages/ReportsPage.tsx`
- Import all 4 new chart components and their hooks
- Pass existing `filters` to new hooks
- Add sections below Monthly Revenue in order: Outreach Effectiveness (full width), Deal Velocity + Competitor Win/Loss (2-col), Score Distribution (full width)

### `src/hooks/useUserSettings.ts`
- Add `quarterly_quota?: number` to the `UserSettings` interface

## Technical Notes
- All new hooks use `@tanstack/react-query` with appropriate query keys including date bounds
- All charts use Recharts (already installed) matching existing style
- Skeleton loading states for all new sections
- No database migrations needed — all data already exists in current tables

