

## Deal Coach: AI Coaching for Deals

### Overview
Add a Deal Coach feature that analyzes deal context (stage, activities, tasks, contacts, company) and provides actionable sales coaching via Anthropic Claude.

### Changes

**1. Edge Function: `supabase/functions/deal-coach/index.ts`**
- Same pattern as `crm-agent/index.ts` (serve, createClient, corsHeaders, Anthropic Messages API, `claude-sonnet-4-20250514`)
- Accepts `POST { deal_id }`, authenticates via `supabase.auth.getUser()`
- Queries: deal (with contact/company info), last 10 activities, open tasks for the deal
- Calculates `days_in_current_stage` and `days_since_last_activity`
- Sends all context to Anthropic with the specified system prompt (deal health, next action, talk track, objection prep, timeline check)
- Returns `{ coaching: string, deal_health: "hot"|"warm"|"stale"|"at_risk", next_action: string }`
- Parses the AI response to extract deal_health from the coaching text

**2. Config: `supabase/config.toml`**
- Add `[functions.deal-coach]` with `verify_jwt = false`

**3. Component: `src/components/DealCoachPanel.tsx`**
- Props: `deal_id: string`
- "Get Coaching" button that calls the edge function via `supabase.functions.invoke("deal-coach", { body: { deal_id } })`
- Displays coaching in a Card with colored Badge for deal health (green/yellow/orange/red)
- Loading spinner while waiting
- Shows next_action prominently

**4. Update: `src/components/DealDetailSheet.tsx`**
- Add "Get AI Coaching" button (with sparkle/brain icon) below the activity timeline
- Renders `DealCoachPanel` when clicked, passing the deal ID

### Technical Details
- No new database tables needed
- Uses existing `ANTHROPIC_API_KEY` secret (already configured)
- Auth pattern: `verify_jwt = false` in config, validate in code via `getUser()`

