

## Create `src/lib/adpProductKnowledge.ts`

### What changes

Create a single new file `src/lib/adpProductKnowledge.ts` that exports:

1. **`ADP_PRODUCT_KNOWLEDGE`** — a large structured object containing all ADP TotalSource product knowledge (company overview, 7 service pillars, support team, technology, verticals, competitor battle cards, ROI data, implementation, sales triggers).
2. **`getProductKnowledgeForAI()`** — a helper function returning a condensed ~4000-char text summary for AI system prompts.

The file contents will match exactly what was specified in the request. No other files are modified in this step.

### Technical notes

- The file lives at `src/lib/adpProductKnowledge.ts` as referenced in the project's custom knowledge docs.
- It is a pure data/utility file with no dependencies — just TypeScript exports.
- The edge functions (`ai-chat`, `scheduled-discovery`) currently inline their product knowledge in system prompts. A future step could update them to import from this file, but that requires Deno-compatible imports (esm.sh). This task only creates the client-side file.
- No database changes needed.

