

## Create AI Agent System Tables Migration

### What's needed
Run a migration to create three new tables: `agent_actions`, `agent_recommendations`, and `lead_scores`.

### Adjustments from your SQL
I verified the current schema and found:
- `deals.value` is **already** `numeric(12,2)` — the ALTER is a no-op but safe to include with `IF NOT EXISTS` logic
- `deals.closed_at` **already exists** — the `ADD COLUMN IF NOT EXISTS` is safe
- The `UPDATE deals SET closed_at = updated_at` will **fail** because there is no `updated_at` column on the deals table — this statement will be removed
- The two ALTER statements are already applied, so they'll be skipped entirely to keep the migration clean

### Migration SQL (adjusted)
Creates exactly the three new tables with all indexes and RLS policies as specified:

1. **`agent_actions`** — audit log for AI agent tool executions, user-scoped SELECT, open INSERT
2. **`agent_recommendations`** — proactive daily brief items, user-scoped SELECT/UPDATE, open INSERT/DELETE
3. **`lead_scores`** — cached lead scores per lead, authenticated SELECT, open manage policy

All indexes, RLS policies, and defaults match your specification exactly. The two deals ALTER statements and the UPDATE are omitted since they're already applied (or reference a non-existent column).

### Files
- New migration file in `supabase/migrations/`

