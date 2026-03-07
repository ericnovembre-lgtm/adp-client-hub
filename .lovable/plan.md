

## Fix: AI Chat "Unauthorized" Error

The AI chat widget sends the anon key as the Authorization Bearer token, but the edge function expects a real user JWT to validate via `getUser()`. This causes a 401 every time.

### Root Cause
In `src/components/AIChatWidget.tsx` line 35:
```typescript
Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
```
This sends the publishable/anon key, not the logged-in user's session token.

### Fix

**`src/components/AIChatWidget.tsx`**
1. Import `supabase` from `@/integrations/supabase/client`
2. In the `streamChat` function, retrieve the current session token via `supabase.auth.getSession()` before making the fetch call
3. Pass the session's `access_token` as the Bearer token, falling back to the anon key if no session exists

This single change will resolve the 401 and allow the AI chat to authenticate properly with the edge function.

