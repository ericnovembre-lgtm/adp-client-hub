
-- Table: lead_gen_runs
CREATE TABLE public.lead_gen_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trigger_type text NOT NULL DEFAULT 'manual',
  config jsonb DEFAULT '{}',
  discovered_count integer DEFAULT 0,
  enriched_count integer DEFAULT 0,
  scored_count integer DEFAULT 0,
  emails_drafted integer DEFAULT 0,
  emails_approved integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_gen_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own lead_gen_runs" ON public.lead_gen_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own lead_gen_runs" ON public.lead_gen_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead_gen_runs" ON public.lead_gen_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert lead_gen_runs" ON public.lead_gen_runs FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_lead_gen_runs_user_status ON public.lead_gen_runs (user_id, status);
CREATE INDEX idx_lead_gen_runs_user_created ON public.lead_gen_runs (user_id, created_at DESC);

-- Table: outreach_queue
CREATE TABLE public.outreach_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.lead_gen_runs(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipient_email text,
  recipient_name text,
  company_name text,
  competitor_detected text,
  lead_score integer,
  lead_grade text,
  email_type text DEFAULT 'cold_outreach',
  status text DEFAULT 'pending_review',
  approved_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own outreach_queue" ON public.outreach_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own outreach_queue" ON public.outreach_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own outreach_queue" ON public.outreach_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert outreach_queue" ON public.outreach_queue FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_outreach_queue_user_status ON public.outreach_queue (user_id, status);
CREATE INDEX idx_outreach_queue_user_created ON public.outreach_queue (user_id, created_at DESC);
CREATE INDEX idx_outreach_queue_run ON public.outreach_queue (run_id);
CREATE INDEX idx_outreach_queue_lead ON public.outreach_queue (lead_id);
