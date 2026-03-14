

## Plan: Add Product Knowledge Version Tracking

### Approach

Add a `KNOWLEDGE_VERSION` constant to `src/lib/adpProductKnowledge.ts` and mirror it in both edge functions. Display the version on the Settings page so users can verify all three sources are in sync.

### Changes

**1. `src/lib/adpProductKnowledge.ts`** — Add at the top:
```ts
export const KNOWLEDGE_VERSION = "2026-03-14-v1";
```

**2. `supabase/functions/ai-chat/index.ts`** — Add after imports:
```ts
const KNOWLEDGE_VERSION = "2026-03-14-v1";
```
Append to SYSTEM_PROMPT: `\n\n[Knowledge Version: ${KNOWLEDGE_VERSION}]`

**3. `supabase/functions/scheduled-discovery/index.ts`** — Same pattern:
```ts
const KNOWLEDGE_VERSION = "2026-03-14-v1";
```
Append to DISCOVERY_PROMPT: `\n\n[Knowledge Version: ${KNOWLEDGE_VERSION}]`

**4. `src/pages/SettingsPage.tsx`** — Add a small "Product Knowledge" info card in the settings that shows:
- Current frontend knowledge version (imported from `adpProductKnowledge.ts`)
- A note that edge functions should match this version
- A badge showing the version string

### How it works

All three files share the same version string. When product knowledge is updated, the developer bumps the version in all three places. The Settings page displays the frontend version so users can cross-reference. The version is also embedded in AI responses (appended to system prompts) for debugging.

