

## Fix: OpenCorporates API Returns 401 Without Key

The OpenCorporates API v0.4 now requires authentication for all requests. Without `OPENCORPORATES_API_KEY`, every call returns 401.

### Options

| Approach | Pros | Cons |
|----------|------|------|
| **A. Graceful error + clear messaging** | Honest UX, no fake data | Feature non-functional until key obtained |
| **B. Switch to free alternative API** | Works immediately | Limited data quality |

### Recommended: Option A — Graceful 401 Handling + UI Messaging

**1. `supabase/functions/registry-discovery/index.ts`**
- When a state returns 401, track it and continue
- After all states, if every state returned 401, return a structured error: `{ error: "api_key_required", message: "OpenCorporates requires an API key..." }`
- Log a warning instead of generic error

**2. `src/components/discovery/RegistryDiscoveryTab.tsx`**
- Handle the `api_key_required` error specifically
- Show an alert: "OpenCorporates requires an API key for access. Configure your key in Settings > API Keys to use this feature."
- Link to Settings page
- Keep the "Discover" button but show the key requirement prominently

**3. `src/pages/SettingsPage.tsx`**
- Update the OpenCorporates card to remove "Works without key" badge
- Change to "Required" badge, matching Apollo/Yelp pattern
- Update helper text accordingly

### Changes Summary
- Edge function: Better 401 handling with structured error response
- Discovery tab: Show actionable error when key is missing
- Settings: Correct the badge from "optional" to "required"

