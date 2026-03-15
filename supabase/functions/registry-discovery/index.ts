import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATE_JURISDICTIONS: Record<string, string> = {
  "Alabama": "us_al", "Alaska": "us_ak", "Arizona": "us_az", "Arkansas": "us_ar",
  "California": "us_ca", "Colorado": "us_co", "Connecticut": "us_ct", "Delaware": "us_de",
  "Florida": "us_fl", "Georgia": "us_ga", "Hawaii": "us_hi", "Idaho": "us_id",
  "Illinois": "us_il", "Indiana": "us_in", "Iowa": "us_ia", "Kansas": "us_ks",
  "Kentucky": "us_ky", "Louisiana": "us_la", "Maine": "us_me", "Maryland": "us_md",
  "Massachusetts": "us_ma", "Michigan": "us_mi", "Minnesota": "us_mn", "Mississippi": "us_ms",
  "Missouri": "us_mo", "Montana": "us_mt", "Nebraska": "us_ne", "Nevada": "us_nv",
  "New Hampshire": "us_nh", "New Jersey": "us_nj", "New Mexico": "us_nm", "New York": "us_ny",
  "North Carolina": "us_nc", "North Dakota": "us_nd", "Ohio": "us_oh", "Oklahoma": "us_ok",
  "Oregon": "us_or", "Pennsylvania": "us_pa", "Rhode Island": "us_ri", "South Carolina": "us_sc",
  "South Dakota": "us_sd", "Tennessee": "us_tn", "Texas": "us_tx", "Utah": "us_ut",
  "Vermont": "us_vt", "Virginia": "us_va", "Washington": "us_wa", "West Virginia": "us_wv",
  "Wisconsin": "us_wi", "Wyoming": "us_wy",
};

const PEO_FRIENDLY_KEYWORDS = [
  "construction", "consulting", "medical", "dental", "restaurant", "landscaping",
  "plumbing", "electrical", "hvac", "cleaning", "staffing", "accounting",
  "real estate", "insurance", "marketing", "technology", "manufacturing",
  "trucking", "auto", "veterinary", "fitness", "salon", "spa",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openCorpApiKey = Deno.env.get("OPENCORPORATES_API_KEY");

    // API key is optional — OpenCorporates works without auth at lower rate limits

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

    const body = await req.json().catch(() => ({}));
    const {
      states = ["California", "Texas", "Florida"],
      months_back = 6,
      per_page = 100,
      industry_keywords = [],
    } = body;

    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months_back);
    const sinceDateStr = sinceDate.toISOString().split("T")[0];

    const results = {
      searched_states: states,
      found: 0,
      saved: 0,
      skipped_duplicate: 0,
      errors: 0,
      classified: 0,
      unclassified: 0,
      leads: [] as any[],
    };

    let authFailures = 0;

    for (const stateName of states) {
      const jurisdictionCode = STATE_JURISDICTIONS[stateName];
      if (!jurisdictionCode) continue;

      const searchParams = new URLSearchParams({
        jurisdiction_code: jurisdictionCode,
        order: "incorporation_date",
        per_page: String(Math.min(per_page, 100)),
        incorporation_date_after: sinceDateStr,
        current_status: "Active",
      });

      if (openCorpApiKey) searchParams.set("api_token", openCorpApiKey);
      const url = `https://api.opencorporates.com/v0.4/companies/search?${searchParams}`;
      const response = await fetch(url);

      if (response.status === 401 || response.status === 403) {
        console.warn(`OpenCorporates API auth error for ${stateName}: ${response.status}`);
        authFailures++;
        continue;
      }

      if (!response.ok) {
        console.error(`OpenCorporates API error for ${stateName}:`, response.status);
        continue;
      }

      const data = await response.json();
      const companies = data?.results?.companies ?? [];

      for (const item of companies) {
        const company = item.company;
        const companyName = company.name ?? "Unknown";

        const skipPatterns = /registered agent|holding|llc series|statutory trust|blank check/i;
        if (skipPatterns.test(companyName)) continue;

        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .ilike("company_name", companyName)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped_duplicate++;
          continue;
        }

        results.found++;

        const incDate = company.incorporation_date
          ? new Date(company.incorporation_date).toLocaleDateString()
          : "recently";

        const classifiedIndustry = inferIndustryFromName(companyName)
          ?? matchIndustryKeywords(companyName, industry_keywords);

        const leadData = {
          company_name: companyName,
          industry: classifiedIndustry,
          state: stateName,
          headcount: null,
          website: null,
          decision_maker_name: null,
          decision_maker_title: null,
          decision_maker_email: null,
          decision_maker_phone: null,
          trigger_event: `Newly incorporated ${incDate} in ${stateName}. Company type: ${company.company_type ?? "LLC/Corp"}. Registry #: ${company.company_number ?? "N/A"}.`,
          trigger_type: "new_business_formation",
          ai_pitch_summary: `${companyName} was recently incorporated in ${stateName} (${incDate}). New businesses forming with employees are prime PEO candidates — they need payroll, benefits, compliance, and workers' comp from day one. Lead with ADP TotalSource's turnkey HR solution and Fortune 500-level benefits at small-business pricing.`,
          source: "business_registry",
          status: "new",
        };

        const { data: newLead, error: insertErr } = await supabase
          .from("leads")
          .insert(leadData)
          .select()
          .single();

        if (insertErr) {
          console.error("Failed to insert registry lead:", insertErr.message);
          results.errors++;
          continue;
        }

        await supabase.from("activities").insert({
          type: "system",
          description: `Lead discovered via Business Registry: ${companyName} — incorporated ${incDate} in ${stateName}. Company type: ${company.company_type ?? "unknown"}.`,
          lead_id: newLead.id,
        });

        results.saved++;
        if (classifiedIndustry) results.classified++;
        else results.unclassified++;
        results.leads.push({
          id: newLead.id,
          company_name: companyName,
          state: stateName,
          incorporation_date: company.incorporation_date,
          company_type: company.company_type,
          industry: leadData.industry,
          trigger: "new_business_formation",
        });
      }

      await new Promise(r => setTimeout(r, 500));
    }

    // If every state returned 401/403, the API key is required
    if (authFailures > 0 && authFailures >= states.length) {
      return new Response(JSON.stringify({
        error: "api_key_required",
        message: "OpenCorporates requires an API key for access. Configure your key in Settings > API Keys to use this feature.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read-merge-write settings
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();

    const mergedSettings = {
      ...(existingSettings?.settings as Record<string, unknown> ?? {}),
      registry_last_run: new Date().toISOString(),
      registry_last_source: "opencorporates",
      registry_leads_saved: results.saved,
      registry_status: "completed",
    };

    await supabase.from("user_settings").upsert({
      user_id: userId,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("registry-discovery error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function inferIndustryFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (/construct|build|roof|pav|excavat/.test(n)) return "Construction";
  if (/consult|advisory|strateg/.test(n)) return "Consulting";
  if (/medical|health|clinic|dental|ortho|chiro|therap/.test(n)) return "Healthcare";
  if (/restaurant|cafe|grill|bistro|catering|food/.test(n)) return "Food & Beverage";
  if (/clean|janitor|maid|sanit/.test(n)) return "Cleaning Services";
  if (/landscap|lawn|tree|garden/.test(n)) return "Landscaping";
  if (/plumb|electr|hvac|mechanic|weld/.test(n)) return "Trades";
  if (/tech|software|digital|app|cyber|data/.test(n)) return "Technology";
  if (/real estate|realty|property|mortgage/.test(n)) return "Real Estate";
  if (/truck|freight|logist|transport|haul/.test(n)) return "Transportation";
  if (/salon|barber|beauty|spa|nail/.test(n)) return "Personal Care";
  if (/fitness|gym|yoga|train/.test(n)) return "Fitness";
  if (/account|bookkeep|tax|cpa/.test(n)) return "Accounting";
  if (/market|advertis|media|design|brand/.test(n)) return "Marketing";
  if (/auto|car|tire|body shop|mechanic/.test(n)) return "Automotive";
  if (/staffing|recruit|talent|employ/.test(n)) return "Staffing";
  if (/insur|underwr/.test(n)) return "Insurance";
  if (/manufactur|fabricat|machine/.test(n)) return "Manufacturing";
  if (/vet|animal|pet/.test(n)) return "Veterinary";
  return null;
}
