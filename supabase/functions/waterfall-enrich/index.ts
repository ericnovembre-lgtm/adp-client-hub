import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADP_FRIENDLY_INDUSTRIES = [
  "professional services", "technology", "healthcare", "financial services",
  "manufacturing", "construction", "real estate", "retail", "hospitality",
  "legal", "accounting", "insurance", "staffing", "marketing", "consulting",
  "architecture", "engineering", "nonprofit", "education", "logistics",
  "transportation", "wholesale", "distribution", "food service",
];

interface ProviderResult {
  status: "success" | "partial" | "failed" | "skipped";
  fields_found: string[];
  error?: string;
}

interface EnrichmentResult {
  lead_id: string;
  company_name: string;
  sources_tried: string[];
  sources_succeeded: string[];
  fields_before: { filled: number; total: number };
  fields_after: { filled: number; total: number };
  enrichment_details: Record<string, ProviderResult>;
  score_change: { before: number; after: number; grade_before: string; grade_after: string };
  trigger_updated: boolean;
}

const TRACKED_FIELDS = [
  "headcount", "industry", "website", "state",
  "decision_maker_name", "decision_maker_title",
  "decision_maker_email", "decision_maker_phone",
  "trigger_event", "trigger_type",
  "current_provider", "provider_type",
] as const;

// ─── COMPETITOR REGISTRY ───
const COMPETITOR_REGISTRY = [
  { name: "Paychex", aliases: ["paychex", "paychex flex", "paychex oasis", "oasis outsourcing"], type: "Payroll-Only", priority: "High", displacement: "Medium", klue_cards: 128 },
  { name: "isolved", aliases: ["isolved", "isolved hcm", "isolved people cloud"], type: "HCM Platform", priority: "High", displacement: "Medium", klue_cards: 54 },
  { name: "Intuit QuickBooks", aliases: ["quickbooks", "intuit", "qbo", "quickbooks online", "quickbooks payroll", "intuit payroll"], type: "Accounting+Payroll", priority: "High", displacement: "Easy", klue_cards: 41 },
  { name: "Insperity", aliases: ["insperity", "administaff"], type: "PEO", priority: "High", displacement: "Hard", klue_cards: 32 },
  { name: "Justworks", aliases: ["justworks", "just works"], type: "PEO", priority: "High", displacement: "Medium", klue_cards: 32 },
  { name: "Dayforce", aliases: ["dayforce", "ceridian", "ceridian dayforce"], type: "HCM Platform", priority: "High", displacement: "Hard", klue_cards: 31 },
  { name: "Rippling", aliases: ["rippling"], type: "HCM Platform", priority: "Medium", displacement: "Medium", klue_cards: 21 },
  { name: "Gusto", aliases: ["gusto", "gusto payroll", "zenpayroll"], type: "Payroll-Only", priority: "Medium", displacement: "Easy", klue_cards: 18 },
  { name: "TriNet", aliases: ["trinet", "tri net", "trinet zenefits"], type: "PEO", priority: "Medium", displacement: "Hard", klue_cards: 14 },
  { name: "Paycom", aliases: ["paycom"], type: "HCM Platform", priority: "Low", displacement: "Medium", klue_cards: 7 },
  { name: "Paylocity", aliases: ["paylocity"], type: "HCM Platform", priority: "Low", displacement: "Medium", klue_cards: 4 },
  { name: "UKG", aliases: ["ukg", "ultimate kronos", "kronos", "ultimatesoftware"], type: "HCM Platform", priority: "Low", displacement: "Hard", klue_cards: 4 },
  { name: "BambooHR", aliases: ["bamboohr", "bamboo hr"], type: "HCM Platform", priority: "Low", displacement: "Easy", klue_cards: 1 },
  { name: "Workday", aliases: ["workday"], type: "HCM Platform", priority: "Low", displacement: "Hard", klue_cards: 1 },
  { name: "SAP SuccessFactors", aliases: ["sap", "successfactors", "sap successfactors"], type: "HCM Platform", priority: "Low", displacement: "Hard", klue_cards: 1 },
] as const;

const DIY_PATTERNS = ["manual payroll", "spreadsheet payroll", "excel payroll", "doing payroll manually", "payroll in excel", "payroll spreadsheet"];

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

interface CompetitorDetection {
  current_provider: string;
  provider_type: string;
  provider_confidence: string;
  competitor_source: string;
  displacement_difficulty: string;
}

function detectCompetitor(
  enrichmentTexts: { text: string; source: string; confidence: "Confirmed" | "Likely" | "Possible" }[],
  headcount?: number | null,
): CompetitorDetection {
  const matches: Array<{ competitor: typeof COMPETITOR_REGISTRY[number]; confidence: string; source: string }> = [];

  for (const { text, source, confidence } of enrichmentTexts) {
    if (!text) continue;
    const lower = text.toLowerCase();

    // Check DIY patterns
    for (const pattern of DIY_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          current_provider: "DIY/None",
          provider_type: "DIY/None",
          provider_confidence: "Confirmed",
          competitor_source: source,
          displacement_difficulty: "Easy",
        };
      }
    }

    // Check competitor aliases
    for (const comp of COMPETITOR_REGISTRY) {
      for (const alias of comp.aliases) {
        if (lower.includes(alias)) {
          matches.push({ competitor: comp, confidence, source });
          break; // one match per competitor per text block
        }
      }
    }
  }

  if (matches.length === 0) {
    // Check if small company with no HR tech → possible DIY
    if (headcount != null && headcount >= 5 && headcount <= 20) {
      return {
        current_provider: "Unknown",
        provider_type: "Unknown",
        provider_confidence: "Unknown",
        competitor_source: "inference",
        displacement_difficulty: "Easy",
      };
    }
    return {
      current_provider: "Unknown",
      provider_type: "Unknown",
      provider_confidence: "Unknown",
      competitor_source: "",
      displacement_difficulty: "Easy",
    };
  }

  // Pick best match: highest priority, then most klue_cards
  matches.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.competitor.priority] ?? 0;
    const pb = PRIORITY_ORDER[b.competitor.priority] ?? 0;
    if (pb !== pa) return pb - pa;
    return b.competitor.klue_cards - a.competitor.klue_cards;
  });

  const best = matches[0];
  return {
    current_provider: best.competitor.name,
    provider_type: best.competitor.type,
    provider_confidence: best.confidence,
    competitor_source: best.source,
    displacement_difficulty: best.competitor.displacement,
  };
}

function countFilled(lead: Record<string, unknown>): number {
  return TRACKED_FIELDS.filter(f => lead[f] != null && lead[f] !== "").length;
}

function getDomain(lead: Record<string, unknown>): string | null {
  const w = (lead.website as string) || "";
  if (!w) return null;
  return w.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function computeScore(lead: Record<string, unknown>): { score: number; grade: string; factors: Array<{ factor: string; points: number; max: number; reason: string }> } {
  const factors: Array<{ factor: string; points: number; max: number; reason: string }> = [];

  // Headcount score (max 30)
  const hc = lead.headcount as number | null;
  let hcPts = 0;
  if (hc != null && hc >= 2 && hc <= 20) {
    hcPts = hc >= 5 && hc <= 15 ? 30 : 20;
    factors.push({ factor: "Territory Fit", points: hcPts, max: 30, reason: `${hc} employees — ${hcPts === 30 ? "sweet spot" : "within territory"}` });
  } else if (hc != null) {
    factors.push({ factor: "Territory Fit", points: 0, max: 30, reason: `${hc} employees — outside 2-20 territory` });
  } else {
    factors.push({ factor: "Territory Fit", points: 5, max: 30, reason: "Headcount unknown" });
    hcPts = 5;
  }

  // Industry score (max 25)
  const ind = ((lead.industry as string) || "").toLowerCase();
  let indPts = 0;
  if (ind && ADP_FRIENDLY_INDUSTRIES.some(i => ind.includes(i))) {
    indPts = 25;
    factors.push({ factor: "Industry Match", points: 25, max: 25, reason: `${lead.industry} — ADP-friendly industry` });
  } else if (ind) {
    indPts = 10;
    factors.push({ factor: "Industry Match", points: 10, max: 25, reason: `${lead.industry} — not a primary ADP vertical` });
  } else {
    factors.push({ factor: "Industry Match", points: 0, max: 25, reason: "Industry unknown" });
  }

  // Decision maker / email score (max 15)
  const hasEmail = !!lead.decision_maker_email;
  const hasName = !!lead.decision_maker_name;
  const hasTitle = !!lead.decision_maker_title;
  let dmPts = 0;
  if (hasEmail) {
    dmPts = 15;
    factors.push({ factor: "Contact Quality", points: 15, max: 15, reason: "Verified email available" });
  } else if (hasName && hasTitle) {
    dmPts = 10;
    factors.push({ factor: "Contact Quality", points: 10, max: 15, reason: "Name + title but no email" });
  } else if (hasName) {
    dmPts = 5;
    factors.push({ factor: "Contact Quality", points: 5, max: 15, reason: "Name only — missing title and email" });
  } else {
    factors.push({ factor: "Contact Quality", points: 0, max: 15, reason: "No decision maker info" });
  }

  // Trigger score (max 20)
  const tt = (lead.trigger_type as string) || "";
  const te = (lead.trigger_event as string) || "";
  let trigPts = 0;
  if (tt === "active_trigger" || tt === "funding_raised" || tt === "recently_funded") {
    trigPts = 20;
    factors.push({ factor: "Trigger Event", points: 20, max: 20, reason: `Active trigger: ${te.slice(0, 80)}` });
  } else if (te) {
    trigPts = 10;
    factors.push({ factor: "Trigger Event", points: 10, max: 20, reason: "Latent need identified" });
  } else {
    factors.push({ factor: "Trigger Event", points: 0, max: 20, reason: "No trigger event" });
  }

  // Contact completeness (max 10)
  const hasPhone = !!lead.decision_maker_phone;
  let compPts = 0;
  if (hasEmail && hasPhone && hasName && hasTitle) compPts = 10;
  else if (hasEmail && hasName) compPts = 7;
  else if (hasName) compPts = 3;
  factors.push({ factor: "Contact Completeness", points: compPts, max: 10, reason: `${[hasName && "name", hasTitle && "title", hasEmail && "email", hasPhone && "phone"].filter(Boolean).join(", ") || "none"}` });

  const score = hcPts + indPts + dmPts + trigPts + compPts;
  const grade = score >= 75 ? "A" : score >= 55 ? "B" : score >= 35 ? "C" : "D";
  return { score, grade, factors };
}

async function callEdgeFunction(
  baseUrl: string,
  fnName: string,
  body: Record<string, unknown>,
  authHeader: string,
  anonKey: string,
): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok && !data.error, data };
  } catch (e) {
    return { ok: false, data: { error: (e as Error).message } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { lead_id, force_refresh = false } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Read lead
    const { data: lead, error: leadErr } = await serviceClient
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing score
    const { data: existingScore } = await serviceClient
      .from("lead_scores")
      .select("score, grade")
      .eq("lead_id", lead_id)
      .maybeSingle();

    const scoreBefore = existingScore?.score ?? 0;
    const gradeBefore = existingScore?.grade ?? "D";

    const fieldsBefore = countFilled(lead);
    const updates: Record<string, unknown> = {};
    const details: Record<string, ProviderResult> = {};
    const sourcesTried: string[] = [];
    const sourcesSucceeded: string[] = [];
    let triggerUpdated = false;

    // Helper: should update field
    const shouldUpdate = (field: string) => force_refresh || !lead[field];

    // Working copy of lead data (merge updates as we go)
    const working = { ...lead };
    const applyUpdates = (newData: Record<string, unknown>, fields: string[]) => {
      for (const f of fields) {
        if (newData[f] != null && newData[f] !== "") {
          updates[f] = newData[f];
          working[f] = newData[f];
        }
      }
    };

    // ─── Step 2: APOLLO ───
    const apolloKey = Deno.env.get("APOLLO_API_KEY");
    if (apolloKey) {
      sourcesTried.push("apollo");
      const apolloFields: string[] = [];
      try {
        // Org enrichment
        const orgParams = new URLSearchParams({ api_key: apolloKey });
        if (lead.company_name) orgParams.set("organization_name", lead.company_name);
        const domain = getDomain(working);
        if (domain) orgParams.set("domain", domain);

        const orgRes = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?${orgParams}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (orgRes.ok) {
          const org = (await orgRes.json()).organization;
          if (org) {
            if (shouldUpdate("headcount") && org.estimated_num_employees) {
              updates.headcount = org.estimated_num_employees;
              working.headcount = org.estimated_num_employees;
              apolloFields.push("headcount");
            }
            if (shouldUpdate("website") && org.primary_domain) {
              updates.website = org.primary_domain;
              working.website = org.primary_domain;
              apolloFields.push("website");
            }
            if (shouldUpdate("industry") && org.industry) {
              updates.industry = org.industry;
              working.industry = org.industry;
              apolloFields.push("industry");
            }
            if (shouldUpdate("state") && org.state) {
              updates.state = org.state;
              working.state = org.state;
              apolloFields.push("state");
            }
          }
        }

        // People search
        if (shouldUpdate("decision_maker_email") || shouldUpdate("decision_maker_name")) {
          const pDomain = getDomain(working);
          if (pDomain) {
            const peopleRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: apolloKey,
                q_organization_domains: pDomain,
                person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
                page: 1,
                per_page: 1,
              }),
            });
            if (peopleRes.ok) {
              const person = (await peopleRes.json()).people?.[0];
              if (person) {
                if (shouldUpdate("decision_maker_name") && person.name) {
                  updates.decision_maker_name = person.name;
                  working.decision_maker_name = person.name;
                  apolloFields.push("decision_maker_name");
                }
                if (shouldUpdate("decision_maker_title") && person.title) {
                  updates.decision_maker_title = person.title;
                  working.decision_maker_title = person.title;
                  apolloFields.push("decision_maker_title");
                }
                if (shouldUpdate("decision_maker_email") && person.email) {
                  updates.decision_maker_email = person.email;
                  working.decision_maker_email = person.email;
                  apolloFields.push("decision_maker_email");
                }
                if (shouldUpdate("decision_maker_phone") && (person.phone_numbers?.[0]?.sanitized_number || person.phone_number)) {
                  const phone = person.phone_numbers?.[0]?.sanitized_number || person.phone_number;
                  updates.decision_maker_phone = phone;
                  working.decision_maker_phone = phone;
                  apolloFields.push("decision_maker_phone");
                }
              }
            }
          }
        }

        details.apollo = {
          status: apolloFields.length > 0 ? "success" : "partial",
          fields_found: apolloFields,
        };
        if (apolloFields.length > 0) sourcesSucceeded.push("apollo");
      } catch (e) {
        details.apollo = { status: "failed", fields_found: [], error: (e as Error).message };
      }
    } else {
      details.apollo = { status: "skipped", fields_found: [] };
    }

    // ─── Step 3: HUNTER.IO ───
    const hunterKey = Deno.env.get("HUNTER_API_KEY");
    if (hunterKey && shouldUpdate("decision_maker_email")) {
      sourcesTried.push("hunter");
      const hunterFields: string[] = [];
      try {
        const domain = getDomain(working);
        const dmName = working.decision_maker_name as string;

        if (domain && dmName) {
          const { first, last } = splitName(dmName);
          if (first && last) {
            const { ok, data } = await callEdgeFunction(supabaseUrl, "hunter-email", {
              mode: "email_finder",
              domain,
              first_name: first,
              last_name: last,
            }, authHeader, anonKey);

            if (ok && data?.data?.email) {
              updates.decision_maker_email = data.data.email;
              working.decision_maker_email = data.data.email;
              hunterFields.push("decision_maker_email");

              // Verify
              await callEdgeFunction(supabaseUrl, "hunter-email", {
                mode: "email_verifier",
                email: data.data.email,
              }, authHeader, anonKey);
            }
          }
        } else if (domain && !dmName) {
          // Domain search to find contacts
          const { ok, data } = await callEdgeFunction(supabaseUrl, "hunter-email", {
            mode: "domain_search",
            domain,
          }, authHeader, anonKey);

          if (ok && data?.data?.emails?.length > 0) {
            const topEmail = data.data.emails[0];
            if (shouldUpdate("decision_maker_email") && topEmail.email) {
              updates.decision_maker_email = topEmail.email;
              working.decision_maker_email = topEmail.email;
              hunterFields.push("decision_maker_email");
            }
            if (shouldUpdate("decision_maker_name") && topEmail.first_name && topEmail.last_name) {
              const name = `${topEmail.first_name} ${topEmail.last_name}`;
              updates.decision_maker_name = name;
              working.decision_maker_name = name;
              hunterFields.push("decision_maker_name");
            }
            if (shouldUpdate("decision_maker_title") && topEmail.position) {
              updates.decision_maker_title = topEmail.position;
              working.decision_maker_title = topEmail.position;
              hunterFields.push("decision_maker_title");
            }
          }
        }

        details.hunter = {
          status: hunterFields.length > 0 ? "success" : "partial",
          fields_found: hunterFields,
        };
        if (hunterFields.length > 0) sourcesSucceeded.push("hunter");
      } catch (e) {
        details.hunter = { status: "failed", fields_found: [], error: (e as Error).message };
      }
    } else {
      details.hunter = { status: !hunterKey ? "skipped" : "skipped", fields_found: [] };
    }

    // ─── Step 4: SNOV.IO ───
    const snovUserId = Deno.env.get("SNOV_USER_ID");
    const snovSecret = Deno.env.get("SNOV_API_SECRET");
    const needsSnovData = shouldUpdate("decision_maker_email") || shouldUpdate("decision_maker_phone") || shouldUpdate("decision_maker_name");

    if (snovUserId && snovSecret && needsSnovData) {
      sourcesTried.push("snov");
      const snovFields: string[] = [];
      try {
        const { ok, data } = await callEdgeFunction(supabaseUrl, "snov-enrichment", {
          mode: "check_gaps",
          first_name: working.decision_maker_name ? splitName(working.decision_maker_name as string).first : undefined,
          last_name: working.decision_maker_name ? splitName(working.decision_maker_name as string).last : undefined,
          domain: getDomain(working),
          email: working.decision_maker_email || undefined,
          enrichment_hints: {
            apollo_email: working.decision_maker_email || null,
            hunter_email: updates.decision_maker_email || null,
            apollo_phone: working.decision_maker_phone || null,
            apollo_linkedin_url: null,
            apollo_title: working.decision_maker_title || null,
            apollo_company_name: working.company_name || null,
            lead_score: scoreBefore || 40, // Default to 40 to pass threshold
          },
        }, authHeader, anonKey);

        if (ok && data && !data.skipped) {
          // Extract email from finder
          const finderEmail = data.data?.email_finder?.emails?.[0]?.email;
          if (finderEmail && shouldUpdate("decision_maker_email")) {
            updates.decision_maker_email = finderEmail;
            working.decision_maker_email = finderEmail;
            snovFields.push("decision_maker_email");
          }

          // Extract prospect data
          const prospect = data.data?.prospect_enrichment?.profile;
          if (prospect) {
            if (shouldUpdate("decision_maker_name") && prospect.full_name) {
              updates.decision_maker_name = prospect.full_name;
              working.decision_maker_name = prospect.full_name;
              snovFields.push("decision_maker_name");
            }
            if (shouldUpdate("decision_maker_title") && prospect.current_jobs?.[0]?.title) {
              updates.decision_maker_title = prospect.current_jobs[0].title;
              working.decision_maker_title = prospect.current_jobs[0].title;
              snovFields.push("decision_maker_title");
            }
          }
        }

        details.snov = {
          status: snovFields.length > 0 ? "success" : data?.skipped ? "skipped" : "partial",
          fields_found: snovFields,
        };
        if (snovFields.length > 0) sourcesSucceeded.push("snov");
      } catch (e) {
        details.snov = { status: "failed", fields_found: [], error: (e as Error).message };
      }
    } else {
      details.snov = { status: "skipped", fields_found: [] };
    }

    // ─── Step 5: CRUNCHBASE ───
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (rapidApiKey) {
      sourcesTried.push("crunchbase");
      const cbFields: string[] = [];
      try {
        const { ok, data } = await callEdgeFunction(supabaseUrl, "crunchbase-intel", {
          mode: "lookup_company",
          company_name: working.company_name,
          domain: getDomain(working),
        }, authHeader, anonKey);

        if (ok && data?.found && data?.data) {
          const fundingData = data.data.funding || data.data;
          const recentlyFunded = data.data.recently_funded;
          const totalFunding = fundingData.total_funding_usd;

          if (recentlyFunded && totalFunding) {
            const fundingEvent = `Raised $${(totalFunding / 1_000_000).toFixed(1)}M (${fundingData.last_funding_type || "funding round"})`;
            if (shouldUpdate("trigger_event") || force_refresh) {
              updates.trigger_type = "funding_raised";
              updates.trigger_event = fundingEvent;
              working.trigger_type = "funding_raised";
              working.trigger_event = fundingEvent;
              cbFields.push("trigger_event", "trigger_type");
              triggerUpdated = true;
            }
          }
        }

        details.crunchbase = {
          status: cbFields.length > 0 ? "success" : "partial",
          fields_found: cbFields,
        };
        if (cbFields.length > 0) sourcesSucceeded.push("crunchbase");
      } catch (e) {
        details.crunchbase = { status: "failed", fields_found: [], error: (e as Error).message };
      }
    } else {
      details.crunchbase = { status: "skipped", fields_found: [] };
    }

    // ─── Step 6: LEAD411 ───
    const lead411Key = Deno.env.get("LEAD411_API_KEY");
    if (lead411Key) {
      sourcesTried.push("lead411");
      const l4Fields: string[] = [];
      try {
        const { ok, data } = await callEdgeFunction(supabaseUrl, "lead411-intent", {
          mode: "get_triggers",
          company_name: working.company_name,
          domain: getDomain(working),
        }, authHeader, anonKey);

        if (ok && data?.triggers?.length > 0) {
          const bestTrigger = data.triggers[0];
          if (shouldUpdate("trigger_event") || force_refresh) {
            updates.trigger_type = bestTrigger.type || "active_trigger";
            updates.trigger_event = bestTrigger.description || bestTrigger.title || "";
            working.trigger_type = updates.trigger_type;
            working.trigger_event = updates.trigger_event;
            l4Fields.push("trigger_event", "trigger_type");
            triggerUpdated = true;
          }
        }

        details.lead411 = {
          status: l4Fields.length > 0 ? "success" : "partial",
          fields_found: l4Fields,
        };
        if (l4Fields.length > 0) sourcesSucceeded.push("lead411");
      } catch (e) {
        details.lead411 = { status: "failed", fields_found: [], error: (e as Error).message };
      }
    } else {
      details.lead411 = { status: "skipped", fields_found: [] };
    }

    // ─── Step 6.5: COMPETITOR DETECTION ───
    const enrichmentTexts: { text: string; source: string; confidence: "Confirmed" | "Likely" | "Possible" }[] = [];

    // Collect text from enrichment data for scanning
    // Technologies / tech stack → Confirmed
    if (working.notes) enrichmentTexts.push({ text: working.notes as string, source: "notes", confidence: "Likely" });
    if (working.trigger_event) enrichmentTexts.push({ text: working.trigger_event as string, source: "trigger_event", confidence: "Possible" });
    if (working.industry) enrichmentTexts.push({ text: working.industry as string, source: "industry", confidence: "Likely" });
    if (working.ai_pitch_summary) enrichmentTexts.push({ text: working.ai_pitch_summary as string, source: "ai_pitch", confidence: "Possible" });
    if (working.decision_maker_title) enrichmentTexts.push({ text: working.decision_maker_title as string, source: "job_title", confidence: "Likely" });

    // Scan all provider result data for competitor mentions
    for (const [provider, detail] of Object.entries(details)) {
      if (detail.status !== "skipped" && detail.status !== "failed") {
        // Fields found text can hint at tools
        for (const field of detail.fields_found) {
          const val = working[field];
          if (typeof val === "string") {
            enrichmentTexts.push({ text: val, source: provider, confidence: provider === "lead411" ? "Confirmed" : "Likely" });
          }
        }
      }
    }

    const competitorResult = detectCompetitor(enrichmentTexts, working.headcount as number | null);

    if (competitorResult.current_provider !== "Unknown" || shouldUpdate("current_provider")) {
      updates.current_provider = competitorResult.current_provider;
      updates.provider_type = competitorResult.provider_type;
      updates.provider_confidence = competitorResult.provider_confidence;
      updates.competitor_source = competitorResult.competitor_source;
      updates.displacement_difficulty = competitorResult.displacement_difficulty;
      updates.competitor_detected_at = new Date().toISOString();
      working.current_provider = competitorResult.current_provider;
      working.provider_type = competitorResult.provider_type;
    }

    // ─── Step 7: Update lead ───
    if (Object.keys(updates).length > 0) {
      await serviceClient.from("leads").update(updates).eq("id", lead_id);
    }

    // ─── Step 8: Recalculate score ───
    const { score, grade, factors } = computeScore(working);

    await serviceClient.from("lead_scores").upsert(
      {
        lead_id,
        score,
        grade,
        factors: factors as any,
        scored_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );

    // ─── Step 9: Log activity ───
    const allFieldsFound = Object.values(details).flatMap(d => d.fields_found);
    await serviceClient.from("activities").insert({
      type: "system",
      description: `Waterfall enrichment completed for ${working.company_name}. Sources: ${sourcesSucceeded.length > 0 ? sourcesSucceeded.join(", ") : "none succeeded"}. Fields enriched: ${allFieldsFound.length > 0 ? allFieldsFound.join(", ") : "none"}. Score: ${scoreBefore} → ${score}.`,
      lead_id,
      user_id: user.id,
    });

    const fieldsAfter = countFilled(working);

    const result: EnrichmentResult = {
      lead_id,
      company_name: working.company_name as string,
      sources_tried: sourcesTried,
      sources_succeeded: sourcesSucceeded,
      fields_before: { filled: fieldsBefore, total: TRACKED_FIELDS.length },
      fields_after: { filled: fieldsAfter, total: TRACKED_FIELDS.length },
      enrichment_details: details,
      score_change: { before: scoreBefore, after: score, grade_before: gradeBefore, grade_after: grade },
      trigger_updated: triggerUpdated,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("waterfall-enrich error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
