

## Update `scheduled-discovery` Edge Function

### Changes to `supabase/functions/scheduled-discovery/index.ts`

Full rewrite of the edge function with these enhancements:

**1. Enhanced System Prompt** — Replace `DISCOVERY_PROMPT` with comprehensive product-aware prompt including:
- Ideal prospect criteria (5-150 employees sweet spot, eligible industries, target decision makers)
- 8 trigger event types with corresponding ADP capabilities to reference in pitches
- Industry-specific pitch guidance (compliance → EPLI/Compliance Compass, benefits → 742K buying power, safety → Nurse Navigator, growth → multi-state/G-P, talent → 500+ courses)
- Full prohibited and low-probability industry lists from knockout rules
- Instruction to generate `ai_pitch_summary` (2-3 sentences referencing specific capabilities) and `trigger_type` for each lead

**2. JWT Authentication** — Add `supabase.auth.getUser()` validation before processing (same pattern as ai-chat). Create authenticated client from Authorization header, fall back to service role client for DB writes.

**3. Duplicate Detection** — After AI generates leads, query the `leads` table with case-insensitive `ilike` on `company_name` for each lead. Skip duplicates; track skipped count in response.

**4. AI Pitch Storage** — Save the AI-generated `ai_pitch_summary` field into the leads table (already a column on the table).

**5. Response** — Return `{ found, saved, skipped, errors }`.

### No other file changes needed
- `supabase/config.toml` already has `[functions.scheduled-discovery] verify_jwt = false`
- `AIDiscoveryPage.tsx` already passes auth header via `supabase.functions.invoke`
- Model stays `google/gemini-2.5-flash` (stable)

