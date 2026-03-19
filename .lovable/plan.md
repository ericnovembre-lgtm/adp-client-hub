

# Outreach Intelligence Page Plan

## Summary
Build a dedicated `/outreach-analytics` page with aggregate email performance analytics, using existing `email_send_log` and `email_tracking_events` data. Includes a database migration to add a `metadata` column, an edge function update, a comprehensive analytics hook, and a multi-section page with KPIs, charts, and AI insights.

## Database Migration

Add `metadata` jsonb column to `email_send_log`:
```sql
ALTER TABLE email_send_log ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

## Edge Function Update: `send-crm-email`

Accept optional `metadata` field in the request body and pass it through to the `email_send_log` insert (both success and failure paths).

## New Files

### 1. `src/hooks/useOutreachAnalytics.ts`
Single hook accepting `{ range, from?, to? }` filters. Returns multiple query results:

- **Overall metrics**: Total sent, unique opens/clicks (distinct message_id from tracking events), open/click/click-to-open rates
- **Time series**: Daily sent/open/click counts grouped by `created_at::date`
- **Competitor angle**: Group by `metadata->>'competitor_angle'`, fallback to subject pattern matching against known competitor keywords (QuickBooks→compliance/HR, Gusto→benefits, Justworks→reporting)
- **Email type**: Group by `metadata->>'email_type'`, fallback to subject keyword matching
- **Subject leaderboard**: Per unique subject, calculate open rate, filter to >= 3 sends, rank top 10 / bottom 5
- **Send time**: Group by hour (0-23) and day of week, calculate open rate per slot
- **Engagement funnel**: Sent → Opened → Clicked → Replied (replied = activities with type email/call linked to same contact within 7 days)

Uses multiple `useQuery` calls with shared date bounds. Queries email_send_log and email_tracking_events, joins via message_id.

### 2. `src/pages/OutreachAnalyticsPage.tsx`
Full analytics page with date range filter (7d/30d/90d/custom), 7 sections:

1. **KPI Cards** (4-col grid): Total Sent, Open Rate %, Click Rate %, Reply Rate % — color-coded thresholds, benchmark text below each
2. **Engagement Funnel**: Horizontal bar/funnel showing Sent→Opened→Clicked→Replied with conversion rates
3. **Performance Over Time**: ComposedChart with bars (sent count) + line (open rate %)
4. **Competitor Angle Performance**: Horizontal BarChart grouped by competitor, open/click rates side-by-side, insight text
5. **Subject Line Leaderboard**: Table with subject, sent, opened, open rate, clicks, click rate. "Copy" button per row. Top 5 green, bottom 3 red
6. **Send Time Heatmap**: 7×24 grid rendered as a table with background color intensity based on open rate per slot. Best slots highlighted
7. **AI Insights**: 3-5 bullet points generated client-side from query data (no API call)

**Empty state**: When < 5 emails sent, shows Mail icon + "No outreach data yet" + CTAs to Leads page and Agent panel.

## Files to Modify

### `src/App.tsx`
- Import `OutreachAnalyticsPage`
- Add route: `<Route path="/outreach-analytics">{() => <ProtectedPage><OutreachAnalyticsPage /></ProtectedPage>}</Route>`

### `src/components/AppSidebar.tsx`
- Import `Send` from lucide-react
- Add nav item `{ title: "Outreach Analytics", path: "/outreach-analytics", icon: Send }` after Reports

### `supabase/functions/send-crm-email/index.ts`
- Destructure `metadata` from request body (default `{}`)
- Add `metadata` field to both email_send_log insert calls (success + failure)

## Technical Notes
- All queries scoped to authenticated user via RLS on email_send_log
- email_tracking_events has no user_id — join through email_send_log.message_id
- Heatmap: use `getHours()` and `getDay()` from email_send_log.created_at
- Subject matching fallback uses simple `.includes()` checks against competitor keywords from `competitorOutreachTemplates.ts`
- Recharts for all charts; shadcn Card/Table/Badge for layout

