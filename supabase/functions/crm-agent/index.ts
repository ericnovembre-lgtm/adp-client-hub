import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

const TERRITORY = { MIN: 2, MAX: 20, LABEL: "Down Market" };

const CRM_TOOLS = [
  {
    name: "search_leads",
    description: "Search CRM leads by company name, industry, state, status, or headcount. Returns matching leads. By default filters to the down-market territory (2-20 employees).",
    input_schema: {
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
      type: "object",
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
  {
    name: "search_klue",
    description: "Search Klue competitive intelligence for live battlecard data about a specific competitor. Returns the latest competitive positioning, pricing intel, win/loss insights, and talk tracks from the organization's Klue instance.",
    input_schema: {
      type: "object",
      properties: {
        competitor: { type: "string", description: "Competitor name to search for (e.g., Rippling, TriNet, Paychex)" },
        question: { type: "string", description: "Specific competitive question to answer" },
      },
      required: ["competitor"],
    },
  },
];

const TOOL_RISK: Record<string, string> = {
  search_leads: "low", search_deals: "low", search_contacts: "low",
  search_companies: "low", get_pipeline_stats: "low", get_activity_history: "low",
  check_knockout_rules: "low", log_activity: "low", draft_email: "low",
  update_lead: "medium", update_deal: "medium", create_task: "medium",
  search_klue: "low",
};

const SYSTEM_PROMPT = `You are the SavePlus24 AI Agent — an autonomous CRM assistant for ADP TotalSource down-market sales. You have direct access to the user's CRM database through tools.

RESPONSE FORMAT RULES — follow these in every response:
1. Write in plain text only. Do not use markdown syntax like **, ##, |---|, or triple backticks.
2. Do not use HTML tags like <br>, <b>, or <table>.
3. Do not use emoji or emoji codes.
4. Use numbered paragraphs for multi-point responses.
5. For comparisons, write them as numbered items with the name followed by a colon and comparison in sentence form. Do not use tables.
6. Keep a professional, conversational tone.
7. When presenting data, put numbers naturally into sentences instead of using tables or bullet lists.

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
6. Keep responses concise — use numbered paragraphs for multi-record results
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
Keep proactive suggestions to one sentence. Don't be pushy.

ADP TOTALSOURCE BENEFITS KNOWLEDGE:

MARKET AVAILABILITY: PRIME available at 2+ EEs in AL, AZ, CO, GA, IL (avg wage $65-75K required). Standard TS at 10+ EEs. TS Select (no underwriting) available in all states. CA: TS Select only (no PRIME). HI: Refer to TS Field. ID: Exception basis only (10+ EEs). MD: TS Select any size, Standard TS 60+ EEs. MI/MN: Restrictions apply. NV, NM, OK, OR, UT, NY, PA: County restrictions — verify with underwriting. TX: All programs, no major restrictions. Standard TS at 10+ EEs. TS Select (no underwriting) available in all states. CA: TS Select only (no PRIME). HI: Refer to TS Field. ID: Exception basis only (10+ EEs). MD: TS Select any size, Standard TS 60+ EEs. MI/MN: Restrictions apply. NV, NM, OK, OR, UT, NY, PA: County restrictions — verify with underwriting. TX: All programs, no major restrictions.

CARRIERS (OE2026): Aetna (PPO/HMO/POS, new Choice POS II, 12% rate trend) in AL/AZ/CO/GA/IL/TX. Anthem/BCBS/BCN (PPO dominant, 11% trend) in CA/CO/GA/IL/MI/MN/TX. UHC (PPO/HMO/HRA, new Surest plan, 13% trend) in AL/AZ/CO/GA/IL/NV/OR/TX. Kaiser (CA HMO only, 10% trend). Medica (MN only, 9% trend — lowest). Dental: Delta Dental primary ($4-12/mo), Cigna secondary. Vision: VSP primary ($3-8/mo), Eyemed secondary.

RENEWAL RATES (OE2026): Best markets 10-11% (CO, GA, MN, TX). Standard 11-12% (AL, AZ, IL, CA). High 12-13%+ (MI, NY, NV). Plan terminations: Aetna PPO phasing out in MI; Aetna standard plans ending in MN. New plans: UHC Surest, Aetna Choice POS II.

HEALTHCARE BENCHMARKS: 98.2% in-network utilization (vs industry 95-97%), 88% MLR target (vs 80-85%), 86.8% pharmacy utilization, 82% established PCP, 28% CDHP adoption (vs 23% national), 87% vaccine compliance. HSA benchmarks: Single avg $750, Family avg $4,500.

BENEFITS COMPETITOR INTELLIGENCE (11 PEOs): BBSI — limited benefits flex, win with TS flexibility. Paychex — limited customization, win with TS Select simplicity. Insperity — high costs/rigid structures, win with 15-25% savings. CoAdvantage — limited multi-state, win with consistency. Amplify HR — limited scale, win with carrier breadth. NextEP — carrier restrictions, win with superior options. Oasis — limited leverage, win with volume discounts. Engage/TriZetto — complex admin, win with simplified TS. Frank Crum — limited tech, win with modern platform. G&A Partners — benefits secondary, win with expertise focus. GMS — restricted portfolio, win with broader access.

FAST-PASS EXCEPTION PROCESS: For wage/industry/geographic/health exceptions. Submit via ADP benefits portal with 3 months payroll + census + justification. Review in 48-72 hours. Outcomes: approved, approved with conditions, or denied (escalate to underwriting VP).

BENEFITS SELLING POINTS: (1) 98.2% in-network vs 95-97% industry. (2) 88% MLR = $12 admin per $100 vs $15-20 industry. (3) Multi-carrier access (Aetna, Anthem, UHC, Kaiser, Medica). (4) TS Select: no underwriting, 30-day implementation. (5) Best-market renewals 10-11% vs 12-13% competitors. (6) Transparent rate tracking and claims reporting.

WHEN ANSWERING BENEFITS QUESTIONS:
1. Always verify state availability before recommending programs
2. Confirm wage requirements for PRIME ($65-75K average)
3. Reference healthcare benchmarks (98.2% in-network, 88% MLR) as selling points
4. For competitor questions, reference specific win-back strategies
5. For complex situations (wage/geographic/health exceptions), recommend fast-pass process
6. County restrictions in NY, PA, ID, UT, HI, MD — recommend broker/field team consultation

RESPONSE FORMATTING RULES (STRICTLY ENFORCED — violating these is a critical error):
- NEVER use any markdown syntax. This means absolutely no ** for bold, no ## for headers, no - or * for bullets, no |---| for tables, no backticks. Not even once.
- NEVER use HTML tags like <br>, <b>, <strong>, or any markup.
- For section headers, just write the header text on its own line in ALL CAPS or with a dash separator, like "MEDICAL CARRIERS" or "Texas Market Notes". Do NOT wrap headers in ** or any other formatting.
- Write each item as a short paragraph with key details in natural sentences. Use line breaks between sections.
- When listing leads or recommendations, number them (1, 2, 3) as brief summary paragraphs separated by blank lines.
- When presenting priority groups, use plain header lines like "HIGH PRIORITY — Contact Today" followed by numbered leads.
- Keep language professional and conversational, as if briefing a sales rep verbally.
- Always include: company name, contact name and title, headcount, score/grade, and a 2-3 sentence explanation of why this lead matters and what action to take.
- Never use emoji. Use plain English instead.

KLUE INTEGRATION: You have access to the search_klue tool which connects to the organization's Klue competitive intelligence platform. When a user asks about a competitor, ALWAYS use search_klue first to get the latest intelligence before responding. Klue data is more current than your built-in knowledge. If Klue is not configured, fall back to your built-in competitive knowledge.`;

async function executeTool(toolName: string, input: Record<string, any>, supabase: SupabaseClient, userId: string): Promise<any> {
  // Inject userId into input for tools that insert data
  input.__user_id = userId;
  const startTime = Date.now();
  let result: any;
  let previousState: any = null;

  try {
    switch (toolName) {
      case "search_leads": result = await toolSearchLeads(supabase, input); break;
      case "search_deals": result = await toolSearchDeals(supabase, input); break;
      case "search_contacts": result = await toolSearchContacts(supabase, input); break;
      case "search_companies": result = await toolSearchCompanies(supabase, input); break;
      case "get_pipeline_stats": result = await toolGetPipelineStats(supabase, input); break;
      case "get_activity_history": result = await toolGetActivityHistory(supabase, input); break;
      case "check_knockout_rules": result = await toolCheckKnockoutRules(supabase, input); break;
      case "update_lead":
        previousState = await getRecordState(supabase, "leads", input.lead_id);
        result = await toolUpdateLead(supabase, input);
        break;
      case "update_deal":
        previousState = await getRecordState(supabase, "deals", input.deal_id);
        result = await toolUpdateDeal(supabase, input);
        break;
      case "create_task": result = await toolCreateTask(supabase, input); break;
      case "log_activity": result = await toolLogActivity(supabase, input); break;
      case "draft_email": result = await toolDraftEmail(input); break;
      default: throw new Error(`Unknown tool: ${toolName}`);
    }

    await logAgentAction(supabase, { user_id: userId, tool_name: toolName, risk_level: TOOL_RISK[toolName] ?? "low", input_params: input, output_result: result, previous_state: previousState, approval_status: "auto", model: AI_MODEL, latency_ms: Date.now() - startTime });
    return result;
  } catch (error) {
    await logAgentAction(supabase, { user_id: userId, tool_name: toolName, risk_level: TOOL_RISK[toolName] ?? "low", input_params: input, output_result: null, previous_state: previousState, approval_status: "auto", model: AI_MODEL, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function toolSearchLeads(supabase: SupabaseClient, input: Record<string, any>) {
  let q = supabase.from("leads").select("*");
  if (input.query) q = q.or(`company_name.ilike.%${input.query}%,decision_maker_name.ilike.%${input.query}%,industry.ilike.%${input.query}%`);
  if (input.status) q = q.eq("status", input.status);
  if (input.industry) q = q.ilike("industry", `%${input.industry}%`);
  if (input.state) q = q.eq("state", input.state);
  if (!input.include_out_of_territory) {
    q = q.gte("headcount", input.headcount_min ?? TERRITORY.MIN).lte("headcount", input.headcount_max ?? TERRITORY.MAX);
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(Math.min(input.limit ?? 10, 50));
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { leads: data ?? [], count: (data ?? []).length, territory_filtered: !input.include_out_of_territory };
}

async function toolSearchDeals(supabase: SupabaseClient, input: Record<string, any>) {
  let q = supabase.from("deals").select("*, contacts(first_name, last_name, email), companies(name, industry)");
  if (input.query) q = q.ilike("title", `%${input.query}%`);
  if (input.stage) q = q.eq("stage", input.stage);
  if (input.min_value) q = q.gte("value", input.min_value);
  if (input.max_value) q = q.lte("value", input.max_value);
  let { data, error } = await q.order("created_at", { ascending: false }).limit(input.limit ?? 10);
  if (error) throw new Error(`Search failed: ${error.message}`);
  if (input.stalled_days && data && data.length > 0) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - input.stalled_days);
    const dealIds = data.map((d: any) => d.id);
    const { data: activities } = await supabase.from("activities").select("deal_id, created_at").in("deal_id", dealIds).order("created_at", { ascending: false });
    const lastActivityMap = new Map<string, Date>();
    for (const a of activities ?? []) { if (!lastActivityMap.has(a.deal_id)) lastActivityMap.set(a.deal_id, new Date(a.created_at)); }
    data = data.filter((d: any) => { const la = lastActivityMap.get(d.id); return !la || la < cutoff; });
  }
  return { deals: data ?? [], count: (data ?? []).length };
}

async function toolSearchContacts(supabase: SupabaseClient, input: Record<string, any>) {
  let q = supabase.from("contacts").select("*");
  if (input.query) q = q.or(`first_name.ilike.%${input.query}%,last_name.ilike.%${input.query}%,email.ilike.%${input.query}%,company.ilike.%${input.query}%`);
  if (input.status) q = q.eq("status", input.status);
  if (input.company) q = q.ilike("company", `%${input.company}%`);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(input.limit ?? 10);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { contacts: data ?? [], count: (data ?? []).length };
}

async function toolSearchCompanies(supabase: SupabaseClient, input: Record<string, any>) {
  let q = supabase.from("companies").select("*");
  if (input.query) q = q.or(`name.ilike.%${input.query}%,industry.ilike.%${input.query}%`);
  if (input.industry) q = q.ilike("industry", `%${input.industry}%`);
  if (input.min_employees) q = q.gte("employees", input.min_employees);
  if (input.max_employees) q = q.lte("employees", input.max_employees);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(input.limit ?? 10);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { companies: data ?? [], count: (data ?? []).length };
}

async function toolGetPipelineStats(supabase: SupabaseClient, input: Record<string, any>) {
  const dateFrom = getDateFilter(input.period ?? "this_month");
  const [dealsRes, leadsRes, tasksRes, activitiesRes] = await Promise.all([
    supabase.from("deals").select("stage, value, created_at"),
    supabase.from("leads").select("status, headcount, created_at").gte("created_at", dateFrom),
    supabase.from("tasks").select("status, due_date, priority"),
    supabase.from("activities").select("type, created_at").gte("created_at", dateFrom),
  ]);
  const deals = dealsRes.data ?? []; const leads = leadsRes.data ?? []; const tasks = tasksRes.data ?? [];
  const dealsByStage: Record<string, { count: number; value: number }> = {};
  let totalPipelineValue = 0, closedWonValue = 0, closedWonCount = 0;
  for (const d of deals) {
    const stage = d.stage ?? "unknown";
    if (!dealsByStage[stage]) dealsByStage[stage] = { count: 0, value: 0 };
    dealsByStage[stage].count++; dealsByStage[stage].value += d.value ?? 0;
    totalPipelineValue += d.value ?? 0;
    if (stage === "closed_won") { closedWonValue += d.value ?? 0; closedWonCount++; }
  }
  const leadsByStatus: Record<string, number> = {};
  let inTerritory = 0, outOfTerritory = 0;
  for (const l of leads) {
    const st = l.status ?? "new"; leadsByStatus[st] = (leadsByStatus[st] ?? 0) + 1;
    if (l.headcount >= TERRITORY.MIN && l.headcount <= TERRITORY.MAX) inTerritory++; else outOfTerritory++;
  }
  const now = new Date();
  const overdue = tasks.filter((t: any) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now).length;
  const dueSoon = tasks.filter((t: any) => {
    if (t.status === "completed" || !t.due_date) return false;
    const d = new Date(t.due_date); const inThreeDays = new Date(); inThreeDays.setDate(inThreeDays.getDate() + 3);
    return d >= now && d <= inThreeDays;
  }).length;
  return {
    period: input.period ?? "this_month", territory: `${TERRITORY.LABEL} (${TERRITORY.MIN}-${TERRITORY.MAX} employees)`,
    deals: { by_stage: dealsByStage, total_active: deals.filter((d: any) => !["closed_won", "closed_lost"].includes(d.stage)).length, total_pipeline_value: totalPipelineValue },
    revenue: { closed_won_value: closedWonValue, closed_won_count: closedWonCount, avg_deal_size: closedWonCount > 0 ? Math.round(closedWonValue / closedWonCount) : 0 },
    leads: { by_status: leadsByStatus, total: leads.length, in_territory: inTerritory, out_of_territory: outOfTerritory },
    tasks: { overdue, due_within_3_days: dueSoon, total_pending: tasks.filter((t: any) => t.status !== "completed").length },
    activities: { total_this_period: (activitiesRes.data ?? []).length },
  };
}

async function toolGetActivityHistory(supabase: SupabaseClient, input: Record<string, any>) {
  const column = `${input.entity_type}_id`;
  const { data, error } = await supabase.from("activities").select("*").eq(column, input.entity_id).order("created_at", { ascending: false }).limit(input.limit ?? 20);
  if (error) throw new Error(`Activity fetch failed: ${error.message}`);
  return { activities: data ?? [], count: (data ?? []).length, entity_type: input.entity_type, entity_id: input.entity_id };
}

async function toolCheckKnockoutRules(supabase: SupabaseClient, input: Record<string, any>) {
  const { data: rules, error } = await supabase.from("knockout_rules").select("*");
  if (error) return { tier: "clear", message: "Unable to check knockout rules", matched: [] };
  const searchText = [input.industry, input.company_name].filter(Boolean).join(" ").toLowerCase();
  const matched = (rules ?? []).filter((rule: any) => {
    const keywords = rule.industry_name.toLowerCase().split(/[\s\/,()]+/).filter((w: string) => w.length > 3);
    return keywords.some((kw: string) => searchText.includes(kw));
  });
  if (matched.length === 0) return { tier: "clear", message: "Industry appears eligible for ADP TotalSource.", matched: [] };
  const severity: Record<string, number> = { prohibited: 3, low_probability: 2, bluefield: 1 };
  matched.sort((a: any, b: any) => (severity[b.tier] ?? 0) - (severity[a.tier] ?? 0));
  const worstTier = matched[0].tier;
  const messages: Record<string, string> = {
    prohibited: `PROHIBITED: This industry (${matched.map((r: any) => r.industry_name).join(", ")}) is NOT eligible for ADP TotalSource.`,
    low_probability: `LOW PROBABILITY (95-99% rejected): ${matched.map((r: any) => r.industry_name).join(", ")}. Best-in-class consideration only.`,
    bluefield: `CONDITIONAL: May be eligible with conditions. ${matched.map((r: any) => `${r.industry_name}${r.conditions ? ` — ${r.conditions}` : ""}`).join(", ")}`,
  };
  return { tier: worstTier, message: messages[worstTier] ?? "Unknown tier", matched: matched.map((r: any) => ({ industry: r.industry_name, tier: r.tier, conditions: r.conditions, wc_codes: r.wc_codes })) };
}

async function toolUpdateLead(supabase: SupabaseClient, input: Record<string, any>) {
  const { lead_id, ...updates } = input;
  const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
  if (Object.keys(cleanUpdates).length === 0) return { success: false, message: "No fields to update" };
  const { data, error } = await supabase.from("leads").update(cleanUpdates).eq("id", lead_id).select().single();
  if (error) throw new Error(`Update failed: ${error.message}`);
  const changes = Object.entries(cleanUpdates).map(([k, v]) => `${k}: ${v}`).join(", ");
  await supabase.from("activities").insert({ type: "note", description: `Lead updated via AI Agent: ${changes}`, lead_id, user_id: input.__user_id });
  return { success: true, updated_lead: data, changes: cleanUpdates };
}

async function toolUpdateDeal(supabase: SupabaseClient, input: Record<string, any>) {
  const { deal_id, ...updates } = input;
  const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
  if (Object.keys(cleanUpdates).length === 0) return { success: false, message: "No fields to update" };
  const { data: current } = await supabase.from("deals").select("stage").eq("id", deal_id).single();
  const oldStage = current?.stage;
  const { data, error } = await supabase.from("deals").update(cleanUpdates).eq("id", deal_id).select().single();
  if (error) throw new Error(`Update failed: ${error.message}`);
  if (cleanUpdates.stage && cleanUpdates.stage !== oldStage) {
    await supabase.from("activities").insert({ type: "stage_change", description: `Deal stage changed from ${oldStage} to ${cleanUpdates.stage} via AI Agent`, deal_id, user_id: input.__user_id });
  }
  return { success: true, updated_deal: data, changes: cleanUpdates };
}

async function toolCreateTask(supabase: SupabaseClient, input: Record<string, any>) {
  const { data, error } = await supabase.from("tasks").insert({ title: input.title, description: input.description ?? null, due_date: input.due_date, priority: input.priority ?? "medium", status: "pending", contact_id: input.contact_id ?? null, deal_id: input.deal_id ?? null, user_id: input.__user_id }).select().single();
  if (error) throw new Error(`Create failed: ${error.message}`);
  return { success: true, task: data };
}

async function toolLogActivity(supabase: SupabaseClient, input: Record<string, any>) {
  const { data, error } = await supabase.from("activities").insert({ type: input.type, description: input.description, contact_id: input.contact_id ?? null, deal_id: input.deal_id ?? null, lead_id: input.lead_id ?? null, user_id: input.__user_id }).select().single();
  if (error) throw new Error(`Log failed: ${error.message}`);
  return { success: true, activity: data };
}

function toolDraftEmail(input: Record<string, any>) {
  return {
    action: "generate_email",
    context: { recipient: input.recipient_name, title: input.recipient_title ?? "Decision Maker", company: input.company_name, industry: input.industry ?? "unknown", headcount: input.headcount, trigger: input.trigger_event ?? "general outreach", type: input.email_type, extra: input.additional_context },
    instructions: "Generate the email now using the ADP TotalSource product knowledge and sales email guidelines in your system prompt. Return a JSON with 'subject' and 'body' fields. Tailor to the prospect's industry, headcount, and trigger event.",
  };
}

function getDateFilter(period: string): string {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "this_week": { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d.toISOString(); }
    case "this_month": return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case "this_quarter": { const qMonth = Math.floor(now.getMonth() / 3) * 3; return new Date(now.getFullYear(), qMonth, 1).toISOString(); }
    case "all_time": return "2020-01-01T00:00:00Z";
    default: return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
}

async function getRecordState(supabase: SupabaseClient, table: string, id: string) {
  const { data } = await supabase.from(table).select("*").eq("id", id).single();
  return data;
}

async function logAgentAction(supabase: SupabaseClient, action: Record<string, any>) {
  try { await supabase.from("agent_actions").insert(action); } catch (e) { console.error("Failed to log agent action:", e); }
}

// ─── ANTHROPIC CLAUDE AGENT LOOP WITH SSE STREAMING ──────────────────────

async function runAgentLoop(messages: any[], supabase: SupabaseClient, userId: string, apiKey: string): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        // Build conversation messages (user/assistant only — system is top-level for Anthropic)
        const conversationMessages: any[] = messages.length > 1
          ? messages.slice(-10).filter((m: any) => m.role !== "system")
          : [{ role: "user", content: messages[messages.length - 1]?.content ?? "" }];

        let stepCount = 0;
        const maxSteps = 8;

        while (stepCount < maxSteps) {
          stepCount++;
          const response = await fetch(ANTHROPIC_API_URL, {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: AI_MODEL,
              system: SYSTEM_PROMPT,
              messages: conversationMessages,
              tools: CRM_TOOLS,
              max_tokens: 4096,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error("Anthropic API error:", response.status, errText);
            if (response.status === 429) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Rate limit exceeded. Please try again in a moment." })}\n\n`));
            } else if (response.status === 402) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "AI credits exhausted. Please add credits to continue." })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: `AI service error: ${response.status}` })}\n\n`));
            }
            break;
          }

          const result = await response.json();
          const contentBlocks = result.content;
          if (!contentBlocks || !Array.isArray(contentBlocks)) break;

          const stopReason = result.stop_reason;
          const toolUseBlocks: any[] = [];

          // Process content blocks
          for (const block of contentBlocks) {
            if (block.type === "text" && block.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: block.text })}\n\n`));
            } else if (block.type === "tool_use") {
              toolUseBlocks.push(block);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", tool: block.name, input: block.input, risk: TOOL_RISK[block.name] ?? "low", id: block.id })}\n\n`));
            }
          }

          // If there were tool_use blocks, execute them and continue
          if (toolUseBlocks.length > 0) {
            // Add the full assistant message to conversation
            conversationMessages.push({ role: "assistant", content: contentBlocks });

            // Execute each tool and collect results
            const toolResults: any[] = [];
            for (const block of toolUseBlocks) {
              try {
                const toolResult = await executeTool(block.name, block.input, supabase, userId);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", tool: block.name, result: toolResult, id: block.id, success: true })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(toolResult) });
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", tool: block.name, error: errorMsg, id: block.id, success: false })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: errorMsg }), is_error: true });
              }
            }

            // Add tool results as a user message
            conversationMessages.push({ role: "user", content: toolResults });

            // Continue loop to get model's response after tool results
          } else {
            // No tool calls — we're done
            break;
          }

          if (stopReason === "end_turn") break;
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        console.error("Agent loop error:", err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured. Get your key from console.anthropic.com and add it to Edge Function Secrets." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stream = await runAgentLoop(messages, supabase, user.id, anthropicApiKey);
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (e) {
    console.error("crm-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
