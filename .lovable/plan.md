

## Fix AI Chat Authorization

### Problem
The `AIChatWidget` sends the anon key as the Authorization header when calling the `ai-chat` edge function. The edge function validates the JWT via `supabase.auth.getUser()`, which rejects the anon key (it has no `sub` claim), returning 401 Unauthorized.

### Fix

**File: `src/components/AIChatWidget.tsx`**

Update `streamChat` to accept and use the user's session JWT token instead of the static anon key:

1. Before calling `streamChat` in the `send` function, get the current session token via `supabase.auth.getSession()`
2. Pass the session's `access_token` as the Authorization Bearer token in the fetch call
3. Fall back to the anon key only if no session exists (which would fail anyway, but keeps the code defensive)

The change is ~5 lines in the `send` function and updating the `streamChat` call to accept a `token` parameter.

### Files changed
- `src/components/AIChatWidget.tsx`

