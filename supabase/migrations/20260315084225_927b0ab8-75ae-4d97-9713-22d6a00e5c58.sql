
-- 1. agent_actions — Audit log for every tool the AI agent executes
CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text,
  tool_name text NOT NULL,
  risk_level text NOT NULL DEFAULT 'low',
  input_params jsonb DEFAULT '{}'::jsonb,
  output_result jsonb DEFAULT '{}'::jsonb,
  previous_state jsonb,
  approval_status text DEFAULT 'auto',
  model text DEFAULT 'claude-sonnet-4-20250514',
  tokens_used integer DEFAULT 0,
  latency_ms integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX idx_agent_actions_session_id ON agent_actions(session_id);
CREATE INDEX idx_agent_actions_tool_name ON agent_actions(tool_name);
CREATE INDEX idx_agent_actions_created_at ON agent_actions(created_at DESC);
CREATE INDEX idx_agent_actions_risk_level ON agent_actions(risk_level);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent actions"
  ON agent_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert agent actions"
  ON agent_actions FOR INSERT
  WITH CHECK (true);

-- 2. agent_recommendations — Proactive daily brief items
CREATE TABLE IF NOT EXISTS agent_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id uuid,
  priority integer DEFAULT 50,
  dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  acted_on boolean DEFAULT false,
  acted_on_at timestamptz,
  expires_at timestamptz,
  batch_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_recs_user_id ON agent_recommendations(user_id);
CREATE INDEX idx_agent_recs_type ON agent_recommendations(type);
CREATE INDEX idx_agent_recs_priority ON agent_recommendations(priority DESC);
CREATE INDEX idx_agent_recs_dismissed ON agent_recommendations(dismissed);
CREATE INDEX idx_agent_recs_created_at ON agent_recommendations(created_at DESC);
CREATE INDEX idx_agent_recs_batch_id ON agent_recommendations(batch_id);

ALTER TABLE agent_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON agent_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON agent_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert recommendations"
  ON agent_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can delete recommendations"
  ON agent_recommendations FOR DELETE
  USING (true);

-- 3. lead_scores — Cached lead scores
CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'D',
  factors jsonb DEFAULT '[]'::jsonb,
  scored_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX idx_lead_scores_score ON lead_scores(score DESC);
CREATE INDEX idx_lead_scores_grade ON lead_scores(grade);

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lead scores"
  ON lead_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage lead scores"
  ON lead_scores FOR ALL
  USING (true)
  WITH CHECK (true);
