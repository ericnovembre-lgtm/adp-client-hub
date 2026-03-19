

## Competitor-Aware Lead Scoring

### Overview
Extend the existing `computeScore` function in `waterfall-enrich` to add a 6th scoring factor: **Competitor Score** (max 60 points). This layers competitor displacement bonuses, trigger event bonuses, confidence multipliers, and combo bonuses on top of the existing 5 base factors (max 100). The total possible score becomes 160, but displayed as a composite with breakdown.

### 1. Update `computeScore` in `waterfall-enrich/index.ts`

Add competitor-aware scoring after the existing 5 factors:

- **COMPETITOR_SCORE_ADJUSTMENTS** constant — maps each provider name to bonus points (QuickBooks +20, Gusto +18, DIY/None +25, etc.)
- **TRIGGER_BONUSES** constant — maps trigger types to bonus points (recent_funding +15, hiring_surge +12, etc.)
- **Confidence multiplier** — multiply competitor portion by 1.0/0.75/0.5/0.25 based on `provider_confidence`
- **Headcount sweet spot bonuses** — employee_count_5_to_10 (+10), 11_to_20 (+15), 21_to_50 (+5)
- **Combo bonus** — Easy displacement + 2+ triggers = +10 extra
- **Cap** at 60 points total for competitor adjustment
- Add as a new factor: `{ factor: "Competitor Advantage", points, max: 60, reason: "..." }`

The base score remains max 100. Competitor score adds up to 60. Total max = 160. Grade thresholds shift:
- A = 80+ (Hot — reach out TODAY)
- B = 60-79 (Warm — reach out this week)  
- C = 40-59 (Nurture — drip sequence)
- D = below 40 (Cold — monitor)

### 2. Update `LeadScoreSection` in `LeadDetailSheet.tsx`

- Show score breakdown on hover/tooltip: "Base: 45 + Competitor: 20 = 65"
- Add tier icon next to score: fire (Hot 80+), orange circle (Warm 60-79), yellow (Nurture 40-59), blue snowflake (Cold <40)
- Parse factors to separate base vs competitor for the tooltip display

### 3. No database changes needed
The `lead_scores` table already stores `score` (integer), `grade` (text), and `factors` (jsonb). The new competitor factor gets stored alongside existing factors.

### Files Changed
- `supabase/functions/waterfall-enrich/index.ts` — expand `computeScore` with competitor scoring
- `src/components/LeadDetailSheet.tsx` — enhance score display with tier icons and breakdown tooltip

