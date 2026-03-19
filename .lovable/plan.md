

## Competitor-Aware Lead Scoring (COMPLETED)

### Overview
Extended `computeScore` in `waterfall-enrich` with a 6th scoring factor: **Competitor Advantage** (max 60 points). Layers competitor displacement bonuses, trigger event bonuses, confidence multipliers, headcount sweet spot bonuses, and combo bonuses on top of the existing 5 base factors (max 100). Total possible = 160. Grade thresholds: A=80+, B=60-79, C=40-59, D=<40.

### Changes Made
- `supabase/functions/waterfall-enrich/index.ts` — added COMPETITOR_SCORE_ADJUSTMENTS, TRIGGER_BONUSES, confidence multipliers, headcount bonuses, combo bonus, capped at 60
- `src/components/LeadDetailSheet.tsx` — score display shows tier icons (Hot/Warm/Nurture/Cold), breakdown tooltip (Base + Competitor = Total), updated max score denominator

## Competitor-Specific Outreach Templates + Battlecard AI Knowledge (COMPLETED)

### Overview
Two features: (1) Competitor-aware email templates that auto-select based on a lead's detected `current_provider`, and (2) Battlecard knowledge injected into the CRM Agent for real-time competitive Q&A.

### Changes Made
- `src/lib/competitorOutreachTemplates.ts` — new file with OUTREACH_TEMPLATES (QuickBooks, Justworks, Gusto, Paychex, DIY/None), BATTLECARD_KNOWLEDGE, `getCompetitorTemplate()`, and `buildCompetitorEmail()` builder
- `src/components/DraftEmailDialog.tsx` — added `competitorTemplate` prop, "Competitor Displacement" template option in selector, pre-fills subject/body from competitor template
- `src/pages/LeadsPage.tsx` — generates competitor template via `buildCompetitorEmail()` when opening email dialog from table actions or detail sheet
- `supabase/functions/crm-agent/index.ts` — appended full BATTLECARD_KNOWLEDGE to system prompt with objection handlers, pricing intel, why_adp_wins/loses, and competitive question behavior instructions
