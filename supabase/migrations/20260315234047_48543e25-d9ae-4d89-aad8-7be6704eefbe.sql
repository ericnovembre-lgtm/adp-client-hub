
-- Add user_id to email_send_log
ALTER TABLE public.email_send_log ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows with first available user
UPDATE public.email_send_log SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.email_send_log ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_email_send_log_user_id ON public.email_send_log(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert email_send_log" ON public.email_send_log;
DROP POLICY IF EXISTS "Authenticated users can select email_send_log" ON public.email_send_log;

-- New scoped policies
CREATE POLICY "Users can select own email_send_log" ON public.email_send_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email_send_log" ON public.email_send_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add user_id to knockout_rules
ALTER TABLE public.knockout_rules ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows
UPDATE public.knockout_rules SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.knockout_rules ALTER COLUMN user_id SET NOT NULL;

-- Index
CREATE INDEX idx_knockout_rules_user_id ON public.knockout_rules(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete knockout_rules" ON public.knockout_rules;
DROP POLICY IF EXISTS "Authenticated users can insert knockout_rules" ON public.knockout_rules;
DROP POLICY IF EXISTS "Authenticated users can select knockout_rules" ON public.knockout_rules;
DROP POLICY IF EXISTS "Authenticated users can update knockout_rules" ON public.knockout_rules;

-- New scoped policies
CREATE POLICY "Users can select own knockout_rules" ON public.knockout_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knockout_rules" ON public.knockout_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knockout_rules" ON public.knockout_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own knockout_rules" ON public.knockout_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);
