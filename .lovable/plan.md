

# Integrate ADP TotalSource Benefits Knowledge

## Overview
Create a new benefits knowledge base file and integrate it into the three edge functions (crm-agent, ai-chat, scheduled-discovery) and frontend product knowledge.

## Files to Create

### 1. `src/lib/adpBenefitsKnowledge.ts`
New file with two exports:
- `ADP_BENEFITS_KNOWLEDGE` — full benefits knowledge string (~400 lines covering state availability, carriers, renewal rates, benchmarks, competitor intelligence, exception process, selling points)
- `BENEFITS_KNOWLEDGE_SUMMARY` — compact summary for lighter prompts

Content as specified in the user's request.

## Files to Modify

### 2. `supabase/functions/crm-agent/index.ts`
- **Lines 232-252**: Append benefits knowledge section to `SYSTEM_PROMPT` after the existing product knowledge block. Add a new `ADP TOTALSOURCE BENEFITS KNOWLEDGE` section with the full benefits content inline (edge functions can't import from `src/lib`). Include guidance on when/how to use benefits info (state verification, PRIME requirements, competitor win-backs, fast-pass process).

### 3. `supabase/functions/ai-chat/index.ts`
- **Lines ~25-26 area** (after existing CORE SERVICES in SYSTEM_PROMPT): Append the `BENEFITS_KNOWLEDGE_SUMMARY` content inline, plus instructions for answering benefits questions (state-specific info, renewal positioning, MLR metrics, program eligibility).

### 4. `supabase/functions/scheduled-discovery/index.ts`
- **Lines ~60-65 area** (in DISCOVERY_PROMPT, after AI PITCH SUMMARY GUIDANCE): Append benefits summary content for discovery context, plus discovery question examples for benefits-related opportunities.

### 5. `src/lib/adpProductKnowledge.ts`
- **Line 568**: Add `benefits` property to the `ADP_PRODUCT_KNOWLEDGE` object with `keyPoints` (state availability, carriers, renewal context, network strength, MLR, competitor focus).
- **Line 570**: Import and use `ADP_BENEFITS_KNOWLEDGE` and `BENEFITS_KNOWLEDGE_SUMMARY` from the new file, include summary in `getProductKnowledgeForAI()` return.

## Technical Notes
- Edge functions cannot import from `src/lib/`, so benefits knowledge must be inlined in each function's prompt string.
- The full benefits text is ~12KB; `crm-agent` gets the full version, `ai-chat` and `scheduled-discovery` get the summary to keep token usage reasonable.
- Knowledge version should update to `2026-03-15-v1` across all files to reflect the new content.
- No database or schema changes required.

