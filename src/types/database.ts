// Union types for type-safe status/stage/priority fields
export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "dismissed";
export type ContactStatus = "lead" | "prospect" | "customer" | "inactive";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type ActivityType = "note" | "call" | "email" | "meeting" | "status_change" | "stage_change" | "conversion" | "system";

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
  company_id: string | null;
  job_title: string | null;
  status: ContactStatus | string | null;
  source: string | null;
  notes: string | null;
  user_id: string;
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
  user_id: string;
  created_at: string | null;
}

export interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: DealStage | string | null;
  contact_id: string | null;
  company_id: string | null;
  expected_close_date: string | null;
  closed_at: string | null;
  notes: string | null;
  user_id: string;
  created_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority | string | null;
  status: TaskStatus | string | null;
  contact_id: string | null;
  deal_id: string | null;
  user_id: string;
  created_at: string | null;
}

export interface Activity {
  id: string;
  type: ActivityType | string;
  description: string;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  user_id: string;
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
  notes: string | null;
  status: LeadStatus | string | null;
  source: string | null;
  user_id: string;
  created_at: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
