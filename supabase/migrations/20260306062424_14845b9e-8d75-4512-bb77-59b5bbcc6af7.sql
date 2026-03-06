
-- 1. Create tables

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  name text,
  avatar text,
  role text DEFAULT 'user'
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE,
  phone text,
  company text,
  job_title text,
  status text DEFAULT 'lead',
  source text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  website text,
  employees integer,
  revenue text,
  address text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  value integer,
  stage text DEFAULT 'lead',
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  expected_close_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date timestamptz,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  description text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  decision_maker_name text,
  decision_maker_email text,
  decision_maker_phone text,
  decision_maker_title text,
  headcount integer,
  industry text,
  website text,
  state text,
  trigger_event text,
  trigger_type text DEFAULT 'latent_need',
  ai_pitch_summary text,
  status text DEFAULT 'new',
  source text,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on all tables

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for each table

CREATE POLICY "Authenticated users can select users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete users" ON public.users FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update companies" ON public.companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete companies" ON public.companies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select deals" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deals" ON public.deals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete deals" ON public.deals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update activities" ON public.activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete activities" ON public.activities FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- 4. Indexes

CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_activities_created_at ON public.activities(created_at);
