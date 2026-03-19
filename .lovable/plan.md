

## Competitor-Aware Lead Scoring (COMPLETED)

### Overview
Extended `computeScore` in `waterfall-enrich` with a 6th scoring factor: **Competitor Advantage** (max 60 points). Layers competitor displacement bonuses, trigger event bonuses, confidence multipliers, headcount sweet spot bonuses, and combo bonuses on top of the existing 5 base factors (max 100). Total possible = 160. Grade thresholds: A=80+, B=60-79, C=40-59, D=<40.

### Changes Made
- `supabase/functions/waterfall-enrich/index.ts` — added COMPETITOR_SCORE_ADJUSTMENTS, TRIGGER_BONUSES, confidence multipliers, headcount bonuses, combo bonus, capped at 60
- `src/components/LeadDetailSheet.tsx` — score display shows tier icons (Hot/Warm/Nurture/Cold), breakdown tooltip (Base + Competitor = Total), updated max score denominator
