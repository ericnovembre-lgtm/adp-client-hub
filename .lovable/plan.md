

# Make knockout_rules Shared/Global (Revert User Scoping)

## Overview

The previous migration added `user_id` scoping to both `email_send_log` and `knockout_rules`. The `email_send_log` scoping is correct, but knockout rules should be shared compliance data visible to all users. This plan reverts knockout_rules to global access.

## Database Migration

Replace the 4 user-scoped RLS policies on `knockout_rules` with global policies:

- **SELECT**: All authenticated users can read all rules (`true`)
- **INSERT**: Authenticated users can insert (keep `user_id` column for audit/ownership, but don't restrict reads)
- **UPDATE**: Users can update their own rules (`auth.uid() = user_id`)
- **DELETE**: Users can delete their own rules (`auth.uid() = user_id`)

## Code Changes

**`supabase/functions/crm-agent/index.ts`** (line 395)
- Remove `.eq("user_id", input.__user_id)` filter from `toolCheckKnockoutRules` so the agent sees all knockout rules globally

**`src/hooks/useKnockoutRules.ts`** — No changes needed (the query already fetches without user_id filter; RLS will now return all rules)

**`src/lib/checkKnockoutFromDB.ts`** — No changes needed (same reason)

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Replace SELECT RLS policy with permissive `true` for authenticated |
| `supabase/functions/crm-agent/index.ts` | Remove `.eq("user_id", ...)` filter on knockout_rules query |

