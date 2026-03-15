

## Add Missing RLS Policies, Indexes, and Trigger

### What exists vs. what's needed
- **agent_actions**: Missing UPDATE policy — will add
- **agent_recommendations**: UPDATE policy already exists — the `IF NOT EXISTS` check will skip it safely
- **lead_scores**: Table and policies exist — `CREATE TABLE IF NOT EXISTS` and policy checks will skip safely
- **Trigger `on_lead_score_change`**: The function exists but the trigger binding is missing (confirmed from schema context) — will create it
- **agent_recommendations columns**: Already exist — `ADD COLUMN IF NOT EXISTS` will skip safely

### Migration
Run the user-provided SQL as a single migration. All statements are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`), so this is safe.

### Net effect
1. New UPDATE policy on `agent_actions` for users to update their own actions
2. Indexes on `lead_scores` (if missing)
3. The `on_lead_score_change` trigger gets created/recreated, connecting the existing function to the `lead_scores` table
4. Everything else is a no-op due to idempotency guards

No code changes needed — this is database-only.

