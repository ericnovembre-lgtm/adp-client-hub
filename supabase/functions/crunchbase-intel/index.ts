import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPIDAPI_HOST = "crunchbase-crunchbase-v1.p.rapidapi.com";

interface EnrichmentHints {
  apollo_funding_info?: boolean;
  apollo_total_funding?: number;
  apollo_employee_growth_rate?: number;
  apollo_tags?: string[];
  trigger_events?: Array<{ type?: string; description?: string }>;
  manual_check?: boolean;
}

function shouldQueryCrunchbase(hints?: EnrichmentHints): { shouldQuery: boolean; triggers: string[]; reason: string } {
  const triggers: string[] = [];

  if (!hints) {
    return { shouldQuery: false, triggers: [], reason: "No enrichment hints provided — skipping Crunchbase to conserve free tier" };
  }

  if (hints.manual_check) {
    triggers.push("manual_check");
  }

  if (hints.apollo_funding_info || (hints.apollo_total_funding && hints.apollo_total_funding > 0)) {
    triggers.push("apollo_funding_detected");
  }

  if (hints.apollo_employee_growth_rate && hints.apollo_employee_growth_rate > 0.3) {
    triggers.push("high_employee_growth");
  }

  if (hints.apollo_tags?.some((tag: string) =>
    ["funded", "venture-backed", "series-a", "series-b", "seed", "startup"].includes(tag.toLowerCase())
  )) {
    triggers.push("apollo_funding_tag");
  }

  if (hints.trigger_events) {
    const fundingTriggers = hints.trigger_events.filter(
      (t: any) => t.type === "recently_funded" || t.type === "funding_round" || t.description?.toLowerCase().includes("raised")
    );
    if (fundingTriggers.length > 0) {
      triggers.push("lead411_funding_trigger");
    }
  }

  return {
    shouldQuery: triggers.length > 0,
    triggers,
    reason: triggers.length > 0
      ? `Funding signals detected: ${triggers.join(", ")}`
      : "No funding signals — skipping Crunchbase to conserve free tier",
  };
}

function isRecentlyFunded(fundedAt: string | null | undefined): boolean {
  if (!fundedAt) return false;
  const fundingDate = new Date(fundedAt);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return fundingDate >= sixMonthsAgo;
}

function categorizeFunding(totalFunding: number | null | undefined): string {
  if (!totalFunding || totalFunding === 0) return "unfunded";
  if (totalFunding < 1_000_000) return "pre_seed";
  if (totalFunding < 5_000_000) return "seed";
  if (totalFunding < 20_000_000) return "early_stage";
  if (totalFunding < 50_000_000) return "growth";
  return "late_stage";
}

function extractCompanyData(entity: any) {
  const props = entity?.properties || {};
  return {
    company: {
      name: props.name || null,
      domain: props.domain || null,
      short_description: props.short_description || null,
      founded_on: props.founded_on || null,
      num_employees_enum: props.num_employees_enum || null,
      categories: props.categories?.map((c: any) => c?.value || c) || [],
      location: [props.city, props.region, props.country_code].filter(Boolean).join(", ") || null,
    },
    funding: {
      total_funding_usd: props.total_funding_usd || null,
      num_funding_rounds: props.num_funding_rounds || 0,
      last_funding_type: props.last_funding_type || null,
      last_funding_at: props.funded_at || null,
      funding_stage: props.funding_stage || null,
      ipo_status: props.ipo_status || null,
      num_investors: props.num_investors || 0,
    },
    has_funding: (props.total_funding_usd && props.total_funding_usd > 0) || false,
    recently_funded: isRecentlyFunded(props.funded_at),
    funding_tier: categorizeFunding(props.total_funding_usd),
  };
}

async function queryRapidAPI(companyName: string, companyDomain: string | null, rapidApiKey: string) {
  const headers = {
    "X-RapidAPI-Key": rapidApiKey,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
  };

  const searchUrl = `https://${RAPIDAPI_HOST}/odm-organizations?name=${encodeURIComponent(companyName)}`;
  const searchRes = await fetch(searchUrl, { headers });

  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`Crunchbase RapidAPI error ${searchRes.status}: ${text}`);
  }

  const searchData = await searchRes.json();

  if (!searchData.entities || searchData.entities.length === 0) {
    return { found: false, message: "Company not found in Crunchbase" };
  }

  // Find best match by domain or name
  const cleanDomain = companyDomain?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const bestMatch = searchData.entities.find(
    (e: any) =>
      (cleanDomain && e.properties?.domain === cleanDomain) ||
      e.properties?.name?.toLowerCase() === companyName.toLowerCase()
  ) || searchData.entities[0];

  return { found: true, ...extractCompanyData(bestMatch) };
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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({
          error: "rapidapi_not_configured",
          message: "RAPIDAPI_KEY is not configured. Sign up at rapidapi.com, subscribe to Crunchbase Basic (free, 500 req/month), and add your X-RapidAPI-Key as RAPIDAPI_KEY in project secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { mode, company_name, domain, enrichment_hints } = body;

    if (!mode) {
      return new Response(JSON.stringify({ error: "mode is required (search_companies, check_funding, lookup_company)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: search_companies
    if (mode === "search_companies") {
      if (!company_name) {
        return new Response(JSON.stringify({ error: "company_name is required for search_companies" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await queryRapidAPI(company_name, domain || null, rapidApiKey);
      return new Response(
        JSON.stringify({
          mode: "search_companies",
          success: true,
          data: result.found ? result : null,
          count: result.found ? 1 : 0,
          found: result.found,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: check_funding (conditional — the primary mode)
    if (mode === "check_funding") {
      if (!company_name) {
        return new Response(JSON.stringify({ error: "company_name is required for check_funding" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const gateResult = shouldQueryCrunchbase(enrichment_hints);
      if (!gateResult.shouldQuery) {
        return new Response(
          JSON.stringify({
            mode: "check_funding",
            success: true,
            skipped: true,
            skip_reason: gateResult.reason,
            triggers: gateResult.triggers,
            data: null,
            count: 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await queryRapidAPI(company_name, domain || null, rapidApiKey);
      return new Response(
        JSON.stringify({
          mode: "check_funding",
          success: true,
          skipped: false,
          triggers: gateResult.triggers,
          trigger_reason: gateResult.reason,
          data: result.found ? result : null,
          count: result.found ? 1 : 0,
          found: result.found,
          funding_tier: result.found ? (result as any).funding_tier : null,
          recently_funded: result.found ? (result as any).recently_funded : false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: lookup_company
    if (mode === "lookup_company") {
      if (!company_name) {
        return new Response(JSON.stringify({ error: "company_name is required for lookup_company" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await queryRapidAPI(company_name, domain || null, rapidApiKey);
      return new Response(
        JSON.stringify({
          mode: "lookup_company",
          success: true,
          data: result.found ? result : null,
          count: result.found ? 1 : 0,
          found: result.found,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}. Use search_companies, check_funding, or lookup_company.` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crunchbase-intel error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
