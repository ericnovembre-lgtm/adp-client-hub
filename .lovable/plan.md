

## Knockout Rules: Database Table + Utility

### 1. Database Migration

Create `knockout_rules` table with the provided schema, RLS (SELECT only for authenticated), and indexes on `tier` and `industry_name`.

```sql
CREATE TABLE public.knockout_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_name text NOT NULL,
  tier text NOT NULL,
  wc_codes text,
  conditions text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.knockout_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can select knockout_rules"
  ON public.knockout_rules FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_knockout_rules_tier ON public.knockout_rules(tier);
CREATE INDEX idx_knockout_rules_industry ON public.knockout_rules(industry_name);
```

Admin write policies (INSERT, UPDATE, DELETE) will not be added now — admin CRUD can be handled via service role in edge functions or added later with a roles system.

### 2. Utility — `src/lib/knockoutCheck.ts`

Create a utility function `checkIndustryKnockout(industry, companyName?, description?)` that:
- Queries `knockout_rules` table for matching industry (case-insensitive partial match on `industry_name`)
- Returns an object: `{ tier: 'prohibited' | 'low_probability' | 'bluefield' | null, rule: KnockoutRule | null }`
- Handles the three tiers with clear semantics:
  - `prohibited` — block conversion, block AI outreach
  - `low_probability` — warn, allow with acknowledgment
  - `bluefield` — show conditions, include in deal notes

### 3. Hook — `src/hooks/useKnockoutRules.ts`

Create a React Query hook:
- `useKnockoutRules(tier?)` — fetches all rules, optionally filtered by tier
- `useCheckKnockout(industry)` — checks a single industry against rules, returns tier info

### Files Created/Modified

| File | Action |
|------|--------|
| `supabase/migrations/...knockout_rules.sql` | Create table via migration tool |
| `src/lib/knockoutCheck.ts` | New — utility function |
| `src/hooks/useKnockoutRules.ts` | New — React Query hooks |

No UI changes in this step — integration into LeadsPage, AI Discovery, and AI Chat will follow in subsequent prompts.

