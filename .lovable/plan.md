

# Add user_id Scoping to email_send_log and knockout_rules

## Overview

Add `user_id` column and RLS policies to the two remaining unscoped tables, ensuring full multi-tenant data isolation.

## Important Design Note

**knockout_rules** currently acts as shared compliance data (all users see all rules). Adding `user_id` scoping means each user will manage their own set of knockout rules. If you'd prefer knockout rules to remain shared/global, let me know and I'll scope only `email_send_log`.

## Database Migration

Single migration that:

1. **email_send_log**: Add `user_id uuid NOT NULL` column, backfill existing rows to current user, create index, drop old permissive RLS policies, add scoped `auth.uid() = user_id` policies for SELECT/INSERT.

2. **knockout_rules**: Add `user_id uuid NOT NULL` column, backfill existing rows to current user, create index, drop all 4 old permissive RLS policies, add scoped `auth.uid() = user_id` policies for SELECT/INSERT/UPDATE/DELETE.

## Frontend Changes

**`src/hooks/useKnockoutRules.ts`**
- `useCreateKnockoutRule`: inject `user_id` from auth session into insert payload.
- `KnockoutRule` interface: add `user_id` field.

**`src/lib/checkKnockoutFromDB.ts`**
- No change needed — RLS will automatically scope the query to the authenticated user's rules.

**`src/components/EmailHistory.tsx`**
- No change needed — queries filter by `contact_id` and RLS handles scoping.

## Edge Function Changes

**`supabase/functions/send-crm-email/index.ts`**
- Add `user_id: userId` to both `email_send_log` insert calls (success and failure paths). The `userId` is already extracted from the JWT.

**`supabase/functions/crm-agent/index.ts`**
- `toolCheckKnockoutRules`: uses service role client so it bypasses RLS. Add `.eq("user_id", input.__user_id)` filter to scope the query, or leave unscoped if rules should be globally readable by the agent. Will add the filter for consistency.

## Summary of Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add columns, backfill, indexes, RLS policies |
| `src/hooks/useKnockoutRules.ts` | Inject `user_id` on insert, update interface |
| `supabase/functions/send-crm-email/index.ts` | Add `user_id` to inserts |
| `supabase/functions/crm-agent/index.ts` | Filter knockout rules by `user_id` |

