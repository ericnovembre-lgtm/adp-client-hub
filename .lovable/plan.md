

## Tighten RLS on CRM Tables — Add `user_id` Scoping

### Current State
The tables `companies`, `contacts`, `deals`, `tasks`, `leads`, and `activities` have **no `user_id` column**. RLS policies use `USING (true)` — any authenticated user sees all data. This is fine for single-user but insecure for multi-tenant.

### Scope of Change
This is a **large, cross-cutting migration** affecting:
- **6 tables** need a new `user_id` column
- **6 hooks** need to set `user_id` on inserts
- **5 edge functions** that insert leads/activities/tasks need to pass `user_id`
- **CSV import logic** needs to attach `user_id`
- **Lead conversion** and **CRM agent tool functions** need updating
- **All existing data** needs to be assigned to a user (or deleted)

### Migration Plan

**Step 1 — Database migration:**
```sql
-- Add user_id to all CRM tables (nullable first for existing data)
ALTER TABLE companies ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE deals ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE activities ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Backfill: assign all existing rows to the first user (or a specific user)
-- (Will need user input on which user to assign to)

-- Make user_id NOT NULL after backfill
-- Add indexes on user_id for each table

-- Replace all 24 RLS policies (4 per table × 6 tables):
-- SELECT: auth.uid() = user_id
-- INSERT: auth.uid() = user_id (WITH CHECK)
-- UPDATE: auth.uid() = user_id
-- DELETE: auth.uid() = user_id
```

**Step 2 — Update all hooks** (`useCompanies`, `useContacts`, `useDeals`, `useTasks`, `useLeads`, `useActivities`):
- Add `user_id: (await supabase.auth.getUser()).data.user?.id` to all insert mutations
- No changes needed for select/update/delete (RLS handles filtering)

**Step 3 — Update edge functions** (`intent-discovery`, `yelp-discovery`, `registry-discovery`, `crm-agent`, `agent-daily-brief`):
- Pass `user_id` when inserting leads, activities, tasks

**Step 4 — Update CSV import** and any direct insert logic

**Step 5 — Update TypeScript types** in `src/types/database.ts` to include `user_id`

### Risk Assessment
- **Breaking change**: Existing data without `user_id` will be invisible after RLS tightening unless backfilled
- **Edge functions use service role**: They bypass RLS, but should still set `user_id` for consistency
- **Activities inserted by triggers** (like `handle_lead_score_change`): The trigger runs as SECURITY DEFINER and doesn't have access to `auth.uid()` — it would need the `user_id` from the lead row

### Question Before Proceeding
Before implementing, I need to know: do you have existing data in these tables that needs to be preserved? If so, I'll need to assign all existing rows to your user ID during the migration. If this is a fresh/dev database, we can simply make `user_id` NOT NULL with no backfill concern.

