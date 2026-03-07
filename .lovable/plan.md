

## Plan: Update `ai-chat` Edge Function to Use Product Knowledge File

### Problem
Edge Functions run on Deno and cannot import from `src/lib/` — the `getProductKnowledgeForAI()` function lives in the client-side codebase and isn't accessible from the Edge Function runtime.

### Approach
Copy the `getProductKnowledgeForAI()` function output directly into the edge function as the system prompt base, then append the existing sales approach, competitor positioning, industry verticals, and knockout rules that are already in the current prompt. This keeps the edge function self-contained (required for Deno) while aligning the content with the canonical product knowledge file.

Alternatively, we could create a shared helper file under `supabase/functions/_shared/` but Lovable Edge Functions must keep all code in `index.ts` with no subfolders.

### Changes

**`supabase/functions/ai-chat/index.ts`**:
1. Replace the current `SYSTEM_PROMPT` with a restructured version that:
   - Uses the condensed product knowledge text from `getProductKnowledgeForAI()` (~4000 chars) as the core knowledge section
   - Keeps the sales approach, competitor positioning, industry verticals, and knockout rules sections
   - Adds a comment noting the knowledge mirrors `src/lib/adpProductKnowledge.ts`
2. No other changes — auth, streaming, model, error handling all stay the same

### No other files change
- `src/lib/adpProductKnowledge.ts` — unchanged (remains the canonical source for frontend use)
- `AIChatWidget.tsx` — unchanged
- `config.toml` — unchanged

