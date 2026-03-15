

## Create Agent Daily Brief Edge Function

### What will be created

A new edge function `supabase/functions/agent-daily-brief/index.ts` with the exact code provided. This function scans the CRM for actionable items and writes recommendations to `agent_recommendations`.

### Checks performed (6 types)
1. **Stalled deals** — no activity in 14+ days
2. **Overdue tasks** — past due date, not completed
3. **Uncontacted leads** — "new" status 3+ days with zero activities
4. **Territory violations** — headcount outside 2-20 range
5. **Pipeline coverage gap** — below 3x quarterly quota
6. **Follow-ups due today** — tasks due today

### Config update
Add `[functions.agent-daily-brief]` with `verify_jwt = false` to `supabase/config.toml` (auth handled in code).

### Files

| File | Action |
|------|--------|
| `supabase/functions/agent-daily-brief/index.ts` | Create with provided code |
| `supabase/config.toml` | Add function entry |

