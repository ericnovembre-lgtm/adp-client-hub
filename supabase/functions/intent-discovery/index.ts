import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TERRITORY = { MIN: 2, MAX: 20 };

const DEFAULT_INTENT_KEYWORDS = [
  "Professional Employer Organization",
  "PEO services",
  "HR outsourcing",
  "Payroll outsourcing",
  "Employee benefits administration",
  "Workers compensation insurance",
  "HR compliance",
  "Small business HR",
  "Co-employment",
  "Benefits administration software",
];

const DECISION_MAKER_TITLES = [
  "Owner",
  "CEO",
  "Chief Executive Officer",
  "Founder",
  "Co-Founder",
  "President",
  "CFO",
  "Chief Financial Officer",
  "COO",
  "Chief Operating Officer",
  "VP of HR",
  "VP of Human Resources",
  "HR Director",
  "Director of Human Resources",
  "Office Manager",
  "Controller",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");

    if (!apolloApiKey) {
      return new Response(
        JSON.stringify({ error: "APOLLO_API_KEY not configured. Add your Apollo.io API key in the project secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse request options
    const body = await req.json().catch(() => ({}));
    const {
      intent_keywords = DEFAULT_INTENT_KEYWORDS,
      industries = [],
      states = [],
      headcount_min = TERRITORY.MIN,
      headcount_max = TERRITORY.MAX,
      per_page = 25,
      test_connection = false,
    } = body;

    // Quick test mode — just verify the API key works
    if (test_connection) {
      const testResp = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apolloApiKey },
        body: JSON.stringify({ per_page: 1, page: 1, person_titles: ["CEO"] }),
      });
      const testText = await testResp.text();
      if (!testResp.ok) {
        return new Response(
          JSON.stringify({ error: `Apollo API error: ${testResp.status}`, details: testText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, message: "Apollo API connection successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Apollo search
    const apolloSearchBody: Record<string, unknown> = {
      person_titles: DECISION_MAKER_TITLES,
      person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
      organization_num_employees_ranges: [`${headcount_min},${headcount_max}`],
      q_organization_keyword_tags: intent_keywords.slice(0, 5),
      per_page: Math.min(per_page, 50),
      page: 1,
    };

    if (states.length > 0) {
      apolloSearchBody.organization_locations = states.map((s: string) => `United States, ${s}`);
    }

    const apolloResponse = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apolloApiKey },
      body: JSON.stringify(apolloSearchBody),
    });

    if (!apolloResponse.ok) {
      const errText = await apolloResponse.text();
      console.error("Apollo API error:", apolloResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Apollo API error: ${apolloResponse.status}. Check your API key and plan.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apolloData = await apolloResponse.json();
    const people = apolloData.people ?? [];

    // Transform results into leads
    const results = {
      found: people.length,
      saved: 0,
      skipped_duplicate: 0,
      skipped_territory: 0,
      errors: 0,
      leads: [] as Record<string, unknown>[],
    };

    for (const person of people) {
      const org = person.organization ?? {};
      const headcount = org.estimated_num_employees ?? org.num_employees ?? null;
      const companyName = org.name ?? "Unknown";

      if (headcount !== null && (headcount < TERRITORY.MIN || headcount > TERRITORY.MAX)) {
        results.skipped_territory++;
        continue;
      }

      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .ilike("company_name", companyName)
        .limit(1);

      if (existing && existing.length > 0) {
        results.skipped_duplicate++;
        continue;
      }

      const leadData = {
        company_name: companyName,
        industry: org.industry ?? null,
        state: extractState(org.city, org.state, org.country),
        headcount,
        website: org.website_url ?? null,
        decision_maker_name: [person.first_name, person.last_name].filter(Boolean).join(" ") || null,
        decision_maker_title: person.title ?? null,
        decision_maker_email: person.email ?? null,
        decision_maker_phone: person.phone_numbers?.[0]?.sanitized_number ?? person.organization_phone ?? null,
        trigger_event: buildTriggerSummary(person, org),
        trigger_type: determineTriggerType(person, org),
        ai_pitch_summary: buildPitchSummary(person, org),
        source: "apollo_intent",
        status: "new",
      };

      const { data: newLead, error: insertErr } = await supabase
        .from("leads")
        .insert(leadData)
        .select()
        .single();

      if (insertErr) {
        console.error("Failed to insert lead:", insertErr.message);
        results.errors++;
        continue;
      }

      await supabase.from("activities").insert({
        type: "system",
        description: `Lead discovered via Apollo Intent: ${companyName} (${headcount ?? "?"} employees, ${org.industry ?? "unknown industry"}). Decision maker: ${leadData.decision_maker_name ?? "unknown"}, ${leadData.decision_maker_title ?? "unknown title"}.`,
        lead_id: newLead.id,
      });

      results.saved++;
      results.leads.push({
        id: newLead.id,
        company_name: companyName,
        headcount,
        industry: org.industry,
        decision_maker: leadData.decision_maker_name,
        title: leadData.decision_maker_title,
        email: leadData.decision_maker_email,
        trigger: leadData.trigger_type,
      });
    }

    // Update scheduler state
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();

    const currentSettings = (existingSettings?.settings as Record<string, unknown>) ?? {};
    await supabase.from("user_settings").upsert({
      user_id: userId,
      settings: {
        ...currentSettings,
        scheduler_last_run: new Date().toISOString(),
        scheduler_last_source: "apollo_intent",
        scheduler_last_count: results.saved,
        scheduler_status: "completed",
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("intent-discovery error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractState(_city?: string, state?: string, country?: string): string | null {
  if (country && !country.toLowerCase().includes("united states") && !country.toLowerCase().includes("us")) return null;
  return state ?? null;
}

function determineTriggerType(_person: Record<string, unknown>, org: Record<string, unknown>): string {
  if (org.latest_funding_round_date) {
    const fundingDate = new Date(org.latest_funding_round_date as string);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (fundingDate > sixMonthsAgo) return "funding_raised";
  }
  if ((org.estimated_num_employees as number) > (org.num_employees_prev as number)) return "hiring_surge";
  return "competitor_peo_renewal";
}

function buildTriggerSummary(_person: Record<string, unknown>, org: Record<string, unknown>): string {
  const parts = [];
  if (org.latest_funding_round_date) {
    parts.push(`Recent funding: ${(org.latest_funding_stage as string) ?? "unknown stage"}`);
  }
  parts.push("Found via Apollo intent search — actively researching HR outsourcing solutions");
  return parts.join(". ");
}

function buildPitchSummary(person: Record<string, unknown>, org: Record<string, unknown>): string {
  const name = (person.first_name as string) ?? "there";
  const company = (org.name as string) ?? "your company";
  const headcount = org.estimated_num_employees ?? "your team";
  const industry = (org.industry as string) ?? "your industry";

  return `${name} at ${company} (${headcount} employees, ${industry}) — researching HR/PEO solutions. Lead with compliance cost savings for small businesses and Fortune 500-level benefits through ADP TotalSource's 742K+ employee buying power.`;
}
