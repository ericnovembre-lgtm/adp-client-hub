
-- Drop existing user-scoped SELECT policy
DROP POLICY IF EXISTS "Users can select own knockout_rules" ON public.knockout_rules;

-- Create global SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can select all knockout_rules"
  ON public.knockout_rules FOR SELECT TO authenticated
  USING (true);
