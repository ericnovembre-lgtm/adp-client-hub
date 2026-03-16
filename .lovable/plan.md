

# Fix enrich-lead Auth Method

Replace invalid `getClaims()` with `getUser()` in `supabase/functions/enrich-lead/index.ts` (lines 34-43). Same fix applied to other Edge Functions previously.

### Change
- **Lines 34-43**: Replace `anonClient.auth.getClaims(token)` with `anonClient.auth.getUser()`, extract `user.id` instead of `claims.claims.sub`

No other files affected.

