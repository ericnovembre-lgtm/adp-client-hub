
CREATE OR REPLACE FUNCTION handle_lead_score_change()
RETURNS TRIGGER AS $$
DECLARE
  current_status text;
  current_company text;
  lead_headcount integer;
BEGIN
  SELECT status, company_name, headcount
  INTO current_status, current_company, lead_headcount
  FROM leads
  WHERE id = NEW.lead_id;

  IF current_status IN ('new', 'contacted') THEN
    IF NEW.score >= 60 THEN
      UPDATE leads
      SET status = 'qualified'
      WHERE id = NEW.lead_id;

      INSERT INTO activities (type, description, lead_id)
      VALUES (
        'system',
        'Lead auto-qualified by AI scoring: ' || NEW.grade || ' grade (' || NEW.score || '/100). Top factor: ' || COALESCE(NEW.factors->0->>'factor', 'N/A') || ' (' || COALESCE(NEW.factors->0->>'points', '0') || '/' || COALESCE(NEW.factors->0->>'max', '0') || ' pts)',
        NEW.lead_id
      );
    END IF;

    IF NEW.score < 40 AND (lead_headcount IS NULL OR lead_headcount < 2 OR lead_headcount > 20) THEN
      INSERT INTO activities (type, description, lead_id)
      VALUES (
        'system',
        'Low score warning: ' || current_company || ' scored ' || NEW.score || '/100 (Grade D). Headcount ' || COALESCE(lead_headcount::text, 'unknown') || ' is outside territory range (2-20). Review and consider dismissing.',
        NEW.lead_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_score_change ON lead_scores;
CREATE TRIGGER on_lead_score_change
  AFTER INSERT OR UPDATE ON lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION handle_lead_score_change();
