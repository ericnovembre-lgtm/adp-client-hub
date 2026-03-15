

## Fix `getClaims()` → `getUser()` in Two Edge Functions

Both `intent-discovery` and `registry-discovery` use `authClient.auth.getClaims(token)` which is not a valid Supabase JS method. Replace with the standard `getUser()` pattern.

### Changes

**1. `supabase/functions/intent-discovery/index.ts` (lines 66-71)**
Remove the `token` variable and `getClaims` call. Replace with:
```typescript
const { data: { user }, error: userError } = await authClient.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const userId = user.id;
```

**2. `supabase/functions/registry-discovery/index.ts` (lines 49-54)**
Identical fix — replace `getClaims` block with `getUser()`.

Both functions will be redeployed after editing.

