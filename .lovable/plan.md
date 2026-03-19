

## Competitor-Specific Outreach Templates + Battlecard AI Knowledge

### Overview
Two features in one: (1) Add competitor-aware email templates that auto-select based on a lead's detected `current_provider`, and (2) Inject battlecard knowledge into the CRM Agent so it can answer competitive questions, suggest talk tracks, and handle objections in real-time.

### 1. New file: `src/lib/competitorOutreachTemplates.ts`

Define `OUTREACH_TEMPLATES` registry with templates for QuickBooks, Justworks, Gusto, Paychex, and DIY/None. Each entry has `subject_lines`, `pain_points`, `adp_counters`, `killer_question`, and `notes`. Also define `BATTLECARD_KNOWLEDGE` constant with full competitive intel for each competitor (overview, why_adp_wins, why_adp_loses, pricing_intel, objection_handlers).

Export a `getCompetitorTemplate(provider: string)` function that returns the matching template or a generic fallback. Export a `buildCompetitorEmail(lead: Lead)` function that:
- Picks a random subject line with merge fields filled
- Composes a body using: personalized hook (trigger-based if available), one pain point, the ADP counter, the killer question, soft CTA, and signature
- Returns `{ subject, body }`

### 2. Update `src/components/DraftEmailDialog.tsx`

Add a new prop: `competitorTemplate?: { subject: string; body: string }`.

When `competitorTemplate` is provided:
- Pre-fill subject and body from the competitor template instead of the generic cold outreach template
- Add a "Competitor Template" option in the template selector dropdown
- Still allow switching to generic templates

### 3. Update `src/pages/LeadsPage.tsx`

When `setEmailLead(lead)` is called and `lead.current_provider` exists and has a matching template:
- Call `buildCompetitorEmail(lead)` to generate the competitor-specific draft
- Pass it as `competitorTemplate` to `DraftEmailDialog`

### 4. Update `src/components/LeadDetailSheet.tsx`

Same logic: when "Draft Email" is clicked and the lead has a detected competitor, pass the competitor template through the `onDraftEmail` callback. The parent (LeadsPage) handles the rest.

### 5. Update `supabase/functions/crm-agent/index.ts` — Battlecard AI Knowledge

Append `BATTLECARD_KNOWLEDGE` to the system prompt:
- Add a new section "COMPETITOR BATTLECARD INTELLIGENCE" with the full knowledge base for QuickBooks, Justworks, Gusto, and Paychex
- Include `objection_handlers` formatted as Q&A pairs
- Add behavioral instructions:
  - When user asks "How do we beat X?" → surface top 3 why_adp_wins
  - When user says "They said [objection]" → match to objection_handlers
  - When user asks about pricing → return pricing_intel
  - When user asks for strengths → be honest with why_adp_loses
  - Always use search_klue first for the latest data, then supplement with built-in knowledge

This doesn't require new tools — the existing `draft_email` and `search_klue` tools combined with enriched system prompt knowledge cover all the required behaviors.

### Files Changed
- `src/lib/competitorOutreachTemplates.ts` — new (templates + knowledge constants + builder function)
- `src/components/DraftEmailDialog.tsx` — accept and use competitor template
- `src/pages/LeadsPage.tsx` — generate competitor template when opening email dialog
- `supabase/functions/crm-agent/index.ts` — append battlecard knowledge to system prompt

