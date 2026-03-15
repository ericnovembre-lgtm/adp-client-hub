import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERRITORY = { MIN: 2, MAX: 20, LABEL: "Down Market" };

const CRM_TOOLS = [
  {
    name: "search_leads",
    description: "Search CRM leads by company name, industry, state, status, or headcount. Returns matching leads. By default filters to the down-market territory (2-20 employees).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search company_name, industry, decision_maker_name" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "converted", "dismissed"] },
        industry: { type: "string" },
        state: { type: "string", description: "US state abbreviation" },
        headcount_min: { type: "number", description: "Min employees. Default 2." },
        headcount_max: { type: "number", description: "Max employees. Default 20." },
        include_out_of_territory: { type: "boolean", description: "Include leads outside 2-20 range. Default false." },
        limit: { type: "number", description: "Max results. Default 10, max 50." },
      },
      required: ["query"],
    },
  },
  {
    name: "search_deals",
    description: "Search CRM deals by title, stage, value range, or stalled duration. Returns deals with contact/company names.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search by deal title. Empty string returns all." },
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] },
        min_value: { type: "number" },
        max_value: { type: "number" },
        stalled_days: { type: "number", description: "Only return deals with no activity in this many days." },
        limit: { type: "number", description: "Default 10." },
      },
      required: [],
    },
  },
  {
    name: "search_contacts",
    description: "Search CRM contacts by name, email, company, or job title.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search name, email, company, job_title" },
        status: { type: "string", enum: ["lead", "prospect", "customer", "inactive"] },
        company: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_companies",
    description: "Search CRM companies by name or industry.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        industry: { type: "string" },
        min_employees: { type: "number" },
        max_employees: { type: "number" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_pipeline_stats",
    description: "Get aggregate pipeline statistics: deals by stage, revenue, avg deal size, lead counts, overdue tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", enum: ["today", "this_week", "this_month", "this_quarter", "all_time"], description: "Default this_month" },
      },
      required: [],
    },
  },
  {
    name: "get_activity_history",
    description: "Get recent activities for a specific lead, deal, or contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["lead", "deal", "contact"] },
        entity_id: { type: "string", description: "UUID of the entity" },
        limit: { type: "number", description: "Default 20" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "check_knockout_rules",
    description: "Check if an industry is eligible for ADP TotalSource based on WC underwriting knockout rules. Returns tier (clear/bluefield/low_probability/prohibited).",
    input_schema: {
      type: "object" as const,
      properties: {
        industry: { type: "string", description: "Industry to check" },
        company_name: { type: "string", description: "Optional company name for broader matching" },
      },
      required: ["industry"],
    },
  },
  {
    name: "update_lead",
    description: "Update an existing lead's status or fields. Logs activity automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        lead_id: { type: "string" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "converted", "dismissed"] },
        headcount: { type: "number" },
        industry: { type: "string" },
        decision_maker_name: { type: "string" },
        decision_maker_email: { type: "string" },
        decision_maker_phone: { type: "string" },
        decision_maker_title: { type: "string" },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "update_deal",
    description: "Update a deal's stage, value, notes, or expected close date. Logs activity on stage changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        deal_id: { type: "string" },
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] },
        value: { type: "number" },
        notes: { type: "string" },
        expected_close_date: { type: "string", description: "ISO date" },
      },
      required: ["deal_id"],
    },
  },
  {
    name: "create_task",
    description: "Create a follow-up task linked to a contact or deal.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_date: { type: "string", description: "ISO date for when task is due" },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        contact_id: { type: "string" },
        deal_id: { type: "string" },
      },
      required: ["title", "due_date"],
    },
  },
  {
    name: "log_activity",
    description: "Log a sales activity (call, email, meeting, note) against a contact, deal, or lead.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["call", "email", "meeting", "note"] },
        description: { type: "string" },
        contact_id: { type: "string" },
        deal_id: { type: "string" },
        lead_id: { type: "string" },
      },
      required: ["type", "description"],
    },
  },
  {
    name: "draft_email",
    description: "Generate a personalized ADP TotalSource sales email. Returns subject + body text. Does NOT send.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipient_name: { type: "string" },
        recipient_title: { type: "string" },
        company_name: { type: "string" },
        industry: { type: "string" },
        headcount: { type: "number" },
        trigger_event: { type: "string" },
        email_type: { type: "string", enum: ["cold_outreach", "follow_up", "proposal", "check_in", "welcome"] },
        additional_context: { type: "string" },
      },
      required: ["recipient_name", "company_name", "email_type"],
    },
  },
];

const TOOL_RISK: Record<string, string> = {
  search_leads: "low", search_deals: "low", search_contacts: "low",
  search_companies: "low", get_pipeline_stats: "low", get_activity_history: "low",
  check_knockout_rules: "low", log_activity: "low", draft_email: "low",
  update_lead: "medium", update_deal: "medium", create_task: "medium",
};

const SYSTEM_PROMPT = `You are the SavePlus24 AI Agent — an autonomous CRM assistant for ADP TotalSource down-market sales. You have direct access to the user's CRM database through tools.

TERRITORY RULES (CRITICAL):
- You work the DOWN MARKET segment: companies with 2 to 20 employees ONLY
- When searching leads, default to territory-filtered results (2-20 headcount)
- Flag any leads/deals outside the 2-20 range as "⚠️ Outside Territory"
- On lead conversion or deal creation, warn if headcount is outside range
- Never recommend pursuing a company outside territory without flagging it

CRM SCHEMA:
- leads: company_name, decision_maker_name/email/phone/title, headcount, industry, website, state, trigger_event, trigger_type, ai_pitch_summary, status (new/contacted/qualified/converted/dismissed), source
- deals: title, value (numeric), stage (lead/qualified/proposal/negotiation/closed_won/closed_lost), contact_id, company_id, expected_close_date, notes
- contacts: first_name, last_name, email, phone, company, job_title, status (lead/prospect/customer/inactive)
- companies: name, industry, website, employees, revenue, address, phone
- tasks: title, description, due_date, priority (urgent/high/medium/low), status (pending/in_progress/completed), contact_id, deal_id
- activities: type (call/email/meeting/note/system/stage_change), description, contact_id, deal_id, lead_id
- knockout_rules: industry_name, tier (prohibited/low_probability/bluefield), wc_codes, conditions

BEHAVIOR RULES:
1. ALWAYS use tools to get real data — NEVER fabricate CRM data or pipeline numbers
2. For read queries, execute immediately and present results
3. For mutations (update lead/deal, create task), briefly state what you will change, then execute
4. Check knockout rules BEFORE recommending outreach to unfamiliar industries
5. When showing leads, always note headcount and flag if outside 2-20
6. Keep responses concise — use tables for multi-record results
7. Resolve references ("that company", "him") from recent conversation context

ADP TOTALSOURCE PRODUCT KNOWLEDGE:
ADP TotalSource is the nation's largest IRS-Certified PEO supporting 742,000+ client employees. 27.2% annual ROI from cost savings. Only 4% of PEOs are IRS-Certified.

Core Services: (1) HR Compliance — dedicated SHRM/SPHR-certified HR Business Partner, EPLI + legal defense included, Compliance Compass, federal/state/local law support. Violations cost $272-$75K+ per incident. (2) Payroll — full-service with dedicated Payroll BP, multi-state, tax filing. (3) Benefits — Fortune 500-level from 742K+ employee buying power. Medical/dental/vision, 401(k) via Voya, HSA/FSA, EAP 24/7/365. (4) Workers' Comp — bundled insurance, dedicated claims specialist, Nurse Navigator (3 in 4 decrease in lag time), 24/7 triage. (5) Risk & Safety — dedicated safety consultant, OSHA, Safety Program Builder. (6) Talent — 500+ myLearning courses, ATS, performance mgmt, compensation analysis. (7) Leadership Development — Kouzes & Posner framework.

Competitive Positioning: vs Rippling (not IRS-certified, chatbot support, hidden fees), vs TriNet (two systems, regional benefits, 338K vs 742K employees), vs Paychex (best for <50, limited reporting, account manager not HRBP), vs Justworks (not IRS-certified, tech-only, no HRBP).

SALES EMAIL GUIDELINES:
- Subject lines under 50 chars
- Lead with prospect's pain point, not ADP features
- Include one specific statistic relevant to their situation
- Soft CTA (coffee chat, quick call — not "buy now")
- Max 3 paragraphs for cold outreach
- Personalize based on trigger events

PROACTIVE BEHAVIOR:
After answering the user's question, if you notice relevant patterns, briefly mention ONE:
- Stalled deals with no activity
- Leads outside territory
- Overdue tasks
Keep proactive suggestions to one sentence. Don't be pushy.`;
