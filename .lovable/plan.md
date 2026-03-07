

## Update `ai-chat` Edge Function with Enhanced Product Knowledge and Auth

### Changes

**1. `supabase/functions/ai-chat/index.ts`** — Full rewrite:
- Replace the system prompt with the comprehensive version from the user's request (covering all 7 service pillars, competitor battle cards, industry verticals, sales approach, and knockout rules)
- Add JWT validation using `createClient` + `supabase.auth.getUser()` before processing
- Switch model from `google/gemini-3-flash-preview` to `google/gemini-2.5-flash` (stable)
- Keep existing CORS, streaming, and error handling (429/402/500)

**2. `supabase/config.toml`** — Add ai-chat function entry:
```toml
[functions.ai-chat]
verify_jwt = false
```
(JWT validated in code via `getUser()`)

### What stays the same
- Frontend `AIChatWidget.tsx` — no changes needed (same endpoint, same streaming protocol)
- Knockout rules still included in the prompt (prohibited + low probability lists)
- All error handling patterns preserved

