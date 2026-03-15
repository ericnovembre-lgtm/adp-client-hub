

## Create CRM Agent Edge Function — Part 1

### What will be created

A new file `supabase/functions/crm-agent/index.ts` containing exactly the code you provided:

- **Imports**: `serve` from Deno std, `createClient` + `SupabaseClient` from supabase-js
- **CORS headers**
- **Territory constants**: MIN 2, MAX 20, "Down Market"
- **12 CRM tool definitions** for Claude's tool-use API: search_leads, search_deals, search_contacts, search_companies, get_pipeline_stats, get_activity_history, check_knockout_rules, update_lead, update_deal, create_task, log_activity, draft_email
- **Risk classification map**: low for reads, medium for mutations
- **System prompt**: Full SavePlus24 agent persona with territory rules, CRM schema, behavior rules, ADP product knowledge, email guidelines, and proactive behavior instructions

### Note on API key
This function calls `https://api.anthropic.com/v1/messages` directly — not the Lovable AI Gateway. You mentioned you will set the `ANTHROPIC_API_KEY` secret after deployment. No secret prompt will be triggered now.

### Config
Will add `[functions.crm-agent]` with `verify_jwt = false` to `supabase/config.toml` (JWT validation handled in code like the other functions).

### Files
| File | Action |
|------|--------|
| `supabase/functions/crm-agent/index.ts` | Create with exact Part 1 code |
| `supabase/config.toml` | Add crm-agent function entry |

No other files modified. The `serve()` handler and tool execution logic will come in Part 2.

