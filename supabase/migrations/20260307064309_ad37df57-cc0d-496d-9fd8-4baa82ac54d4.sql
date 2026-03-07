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