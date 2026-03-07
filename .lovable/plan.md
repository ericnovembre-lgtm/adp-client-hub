

## Fix: Edge Function Auth Validation

### Changes

**1. `supabase/config.toml`** — Add `verify_jwt = false` for `ai-chat` (already set for `scheduled-discovery`):
```toml
[functions.ai-chat]
verify_jwt = false
```

**2. `supabase/functions/ai-chat/index.ts`** — Add auth check at start of try block:
- Add `createClient` import
- Extract Authorization header, parse Bearer token
- Create anon-key Supabase client, call `auth.getClaims(token)`
- Return 401 if no valid user
- Then proceed with existing logic (parse body, call AI)

**3. `supabase/functions/scheduled-discovery/index.ts`** — Add auth check after line 31:
- Create a second Supabase client using anon key (not service role) for auth validation
- Call `auth.getClaims(token)` on the auth header
- Return 401 if invalid
- Keep existing service-role client for DB operations

No other files modified. No logic changes beyond the auth gate.

