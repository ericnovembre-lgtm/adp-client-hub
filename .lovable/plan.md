

## Bypass OpenCorporates API Key Requirement

The edge function currently blocks with a 500 error if `OPENCORPORATES_API_KEY` is not set (lines 40-45). The fix is to make it work without the key — OpenCorporates has a free/public tier that works without authentication (lower rate limits).

### Changes

**1. `supabase/functions/registry-discovery/index.ts`** (lines 38-45)
- Remove the early-return error when `openCorpApiKey` is missing
- Only include `api_token` in the search params when the key is present
- This lets the function call OpenCorporates without auth (public access, lower rate limits)

**2. `src/pages/SettingsPage.tsx`**
- Update the OpenCorporates settings section to show "Works without key" badge (like Census) instead of requiring configuration
- Change helper text to indicate the key is optional and improves rate limits

**3. `src/components/discovery/RegistryDiscoveryTab.tsx`**
- No changes needed — it already calls the function without checking for key status

