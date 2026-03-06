export interface User {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: string | null;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  employees: number | null;
  revenue: string | null;
  address: string | null;
  phone: string | null;
  created_at: string | null;
}

export interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string | null;
  contact_id: string | null;
  company_id: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string | null;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string | null;
}

export interface Lead {
  id: string;
  company_name: string;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  decision_maker_phone: string | null;
  decision_maker_title: string | null;
  headcount: number | null;
  industry: string | null;
  website: string | null;
  state: string | null;
  trigger_event: string | null;
  trigger_type: string | null;
  ai_pitch_summary: string | null;
  status: string | null;
  source: string | null;
  created_at: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
