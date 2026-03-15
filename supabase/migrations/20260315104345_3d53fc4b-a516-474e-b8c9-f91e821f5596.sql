
-- Fix 1: Add UPDATE policy for agent_actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own agent actions' AND tablename = 'agent_actions'
  ) THEN
    CREATE POLICY "Users can update own agent actions"
      ON agent_actions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Fix 2: Add UPDATE policy for agent_recommendations (will skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own recommendations' AND tablename = 'agent_recommendations'
  ) THEN
    CREATE POLICY "Users can update own recommendations"
      ON agent_recommendations FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Fix 3: Ensure lead_scores table exists
CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'D',
  factors jsonb DEFAULT '[]'::jsonb,
  scored_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_grade ON lead_scores(grade);

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view lead scores' AND tablename = 'lead_scores'
  ) THEN
    CREATE POLICY "Users can view lead scores"
      ON lead_scores FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage lead scores' AND tablename = 'lead_scores'
  ) THEN
    CREATE POLICY "Service role can manage lead scores"
      ON lead_scores FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix 4: Create trigger binding for lead score changes
DROP TRIGGER IF EXISTS on_lead_score_change ON lead_scores;
CREATE TRIGGER on_lead_score_change
  AFTER INSERT OR UPDATE ON lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION handle_lead_score_change();

-- Fix 5: Add columns to agent_recommendations if missing
ALTER TABLE agent_recommendations ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
ALTER TABLE agent_recommendations ADD COLUMN IF NOT EXISTS acted_on boolean DEFAULT false;
ALTER TABLE agent_recommendations ADD COLUMN IF NOT EXISTS acted_on_at timestamptz;
