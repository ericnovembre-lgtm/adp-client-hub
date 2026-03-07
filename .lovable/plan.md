

## Plan: Update `scheduled-discovery` Edge Function with Full Product Knowledge

The `ai-chat` edge function already has the comprehensive product knowledge prompt (lines 10-95). The `scheduled-discovery` function has a shorter, lead-generation-specific prompt that's missing the detailed product knowledge (core services, competitor positioning, industry verticals, etc.).

### Changes

**`supabase/functions/scheduled-discovery/index.ts`** — Replace `DISCOVERY_PROMPT` (lines 10-56) with an enhanced version that:

1. **Adds full product knowledge context** — Mirrors the `ai-chat` SYSTEM_PROMPT sections: core services (7 pillars with specifics), dedicated support team, technology, additional capabilities, competitive advantages, competitor positioning, and industry vertical knowledge
2. **Keeps existing lead-gen instructions** — Ideal prospect criteria, trigger events, pitch guidance, output format, prohibited/low-probability industry lists all stay (with the expanded prohibited list from ai-chat replacing the shorter one)
3. **Enhances pitch guidance** — The AI now has full product details to write richer `ai_pitch_summary` fields (e.g., can reference Nurse Navigator specifics, Compliance Compass, 500+ myLearning courses, etc.)

No changes to the rest of the function (auth, duplicate detection, DB writes, response format) — only the `DISCOVERY_PROMPT` constant is updated.

### No other files change
- `supabase/config.toml` — already configured
- `AIDiscoveryPage.tsx` — no changes needed
- `ai-chat/index.ts` — already updated

