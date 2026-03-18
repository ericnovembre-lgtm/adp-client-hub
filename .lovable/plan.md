

## Replace Benefits Knowledge Base and Update System Prompts

### 1. Rewrite `src/lib/adpBenefitsKnowledge.ts`

Replace the entire file content with a new `ADP_BENEFITS_KNOWLEDGE` constant containing the 6 sections specified:

- State availability (all 50 states + DC, 28 primary markets listed)
- Carrier portfolio by state (FL, TX, CA, NY, IL with specific carriers; ancillary lines)
- OE2026 renewal rates (national averages, state-specific rates, dental/vision)
- PRIME underwriting rules (6 specific rules including metro wage adjustments)
- Healthcare utilization benchmarks (MLR, in-network, pharmacy, preventive, ER)
- Competitor intelligence (vs Rippling, TriNet, Paychex, Insperity, Justworks with specific talking points)

Also export `BENEFITS_KNOWLEDGE_SUMMARY` (condensed version for quick reference).

### 2. Append note to `supabase/functions/ai-chat/index.ts` SYSTEM_PROMPT

At line 132 (after "Never use emoji" line, before the Knowledge Version line), add:

```
BENEFITS DEEP DIVE: For detailed benefits questions (carrier availability by state, renewal rates, PRIME underwriting rules, or competitor comparisons), reference the benefits knowledge base in src/lib/adpBenefitsKnowledge.ts.
```

### 3. Append note to `supabase/functions/scheduled-discovery/index.ts` DISCOVERY_PROMPT

At line 79 (after "Return ONLY the JSON array" line, before the Knowledge Version line), add the same benefits deep-dive note.

No existing content is removed or modified -- all changes are additive.

