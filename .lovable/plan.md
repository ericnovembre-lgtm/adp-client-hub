

## Append Part 2 to CRM Agent Edge Function

### What will be done

Append all tool execution functions, helpers, the Claude API agent loop, and the `serve()` handler to the existing `supabase/functions/crm-agent/index.ts` file (after line 249).

The appended code includes:
- **12 tool execution functions**: `toolSearchLeads`, `toolSearchDeals`, `toolSearchContacts`, `toolSearchCompanies`, `toolGetPipelineStats`, `toolGetActivityHistory`, `toolCheckKnockoutRules`, `toolUpdateLead`, `toolUpdateDeal`, `toolCreateTask`, `toolLogActivity`, `toolDraftEmail`
- **Helper functions**: `executeTool` (dispatcher with audit logging), `getDateFilter`, `getRecordState`, `logAgentAction`
- **Agent loop**: `runAgentLoop` — calls Claude API directly at `https://api.anthropic.com/v1/messages` with tool-use, iterates up to 8 steps, streams SSE events
- **Main handler**: `serve()` — validates auth via JWT, reads `ANTHROPIC_API_KEY` from Deno env, creates service-role Supabase client for DB operations, returns SSE stream

### API Key
The code references `Deno.env.get("ANTHROPIC_API_KEY")`. You will add this secret yourself after deployment. No secret prompt will be triggered.

### Files
| File | Action |
|------|--------|
| `supabase/functions/crm-agent/index.ts` | Append Part 2 after existing code |

