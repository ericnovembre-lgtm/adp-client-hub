-- Step 1: Add user_id columns (nullable first for backfill)
ALTER TABLE companies ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE deals ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE activities ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Step 2: Backfill all existing rows to the single user
UPDATE companies SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;
UPDATE contacts SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;
UPDATE deals SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;
UPDATE tasks SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;
UPDATE leads SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;
UPDATE activities SET user_id = '5d5c7b79-fe48-48c6-8b5a-e4984b0609e3' WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL
ALTER TABLE companies ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Add indexes
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);

-- Step 5: Drop old permissive policies and create scoped ones

-- COMPANIES
DROP POLICY IF EXISTS "Authenticated users can select companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;
CREATE POLICY "Users can select own companies" ON companies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companies" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON companies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON companies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CONTACTS
DROP POLICY IF EXISTS "Authenticated users can select contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;
CREATE POLICY "Users can select own contacts" ON contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DEALS
DROP POLICY IF EXISTS "Authenticated users can select deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can update deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can delete deals" ON deals;
CREATE POLICY "Users can select own deals" ON deals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON deals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON deals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TASKS
DROP POLICY IF EXISTS "Authenticated users can select tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;
CREATE POLICY "Users can select own tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- LEADS
DROP POLICY IF EXISTS "Authenticated users can select leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
CREATE POLICY "Users can select own leads" ON leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ACTIVITIES
DROP POLICY IF EXISTS "Authenticated users can select activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON activities;
CREATE POLICY "Users can select own activities" ON activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON activities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON activities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 6: Update the handle_lead_score_change trigger to carry user_id from leads
CREATE OR REPLACE FUNCTION public.handle_lead_score_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_status text;
  current_company text;
  lead_headcount integer;
  lead_user_id uuid;
  qualify_threshold integer;
BEGIN
  SELECT COALESCE(
    (settings->>'auto_qualify_threshold')::integer, 60
  ) INTO qualify_threshold
  FROM user_settings
  LIMIT 1;

  IF qualify_threshold IS NULL THEN
    qualify_threshold := 60;
  END IF;

  SELECT status, company_name, headcount, user_id
  INTO current_status, current_company, lead_headcount, lead_user_id
  FROM leads WHERE id = NEW.lead_id;

  IF current_status IN ('new', 'contacted') THEN
    IF NEW.score >= qualify_threshold THEN
      UPDATE leads SET status = 'qualified' WHERE id = NEW.lead_id;
      INSERT INTO activities (type, description, lead_id, user_id) VALUES (
        'system',
        'Lead auto-qualified by AI scoring: ' || NEW.grade || ' grade (' || NEW.score || '/100, threshold: ' || qualify_threshold || '). Top factor: ' || COALESCE(NEW.factors->0->>'factor', 'N/A') || ' (' || COALESCE(NEW.factors->0->>'points', '0') || '/' || COALESCE(NEW.factors->0->>'max', '0') || ' pts)',
        NEW.lead_id,
        lead_user_id
      );
    END IF;

    IF NEW.score < 40 AND (lead_headcount IS NULL OR lead_headcount < 2 OR lead_headcount > 20) THEN
      INSERT INTO activities (type, description, lead_id, user_id) VALUES (
        'system',
        'Low score warning: ' || current_company || ' scored ' || NEW.score || '/100 (Grade D). Headcount ' || COALESCE(lead_headcount::text, 'unknown') || ' is outside territory range (2-20). Review and consider dismissing.',
        NEW.lead_id,
        lead_user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
