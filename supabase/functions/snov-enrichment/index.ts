import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SNOV_BASE = "https://api.snov.io";

// Token cache
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSnovToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const userId = Deno.env.get("SNOV_USER_ID");
  const apiSecret = Deno.env.get("SNOV_API_SECRET");
  if (!userId || !apiSecret) throw new Error("snov_not_configured");

  const res = await fetch(`${SNOV_BASE}/v1/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: userId,
      client_secret: apiSecret,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to obtain Snov.io access token");

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 3600 * 1000; // 1 hour
  return cachedToken!;
}

// --- Mode handlers ---

async function findEmail(token: string, firstName: string, lastName: string, domain: string) {
  const res = await fetch(`${SNOV_BASE}/v1/get-emails-from-names`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, first_name: firstName, last_name: lastName, domain }),
  });
  const data = await res.json();

  if (data.success && data.data?.emails?.length > 0) {
    return {
      found: true,
      emails: data.data.emails.map((e: any) => ({
        email: e.email,
        type: e.type,
        status: e.status,
        confidence: e.confidence,
      })),
      credits_used: 1,
    };
  }
  return { found: false, emails: [], credits_used: 0 };
}

async function verifyEmail(token: string, email: string) {
  // Add to verification queue
  await fetch(`${SNOV_BASE}/v1/add-emails-to-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, emails: [email] }),
  });

  // Poll after delay
  await new Promise((r) => setTimeout(r, 3000));

  const res = await fetch(`${SNOV_BASE}/v1/get-emails-verification-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, emails: [email] }),
  });
  const result = await res.json();

  if (result.success && result.data?.length > 0) {
    const v = result.data[0];
    return {
      email,
      is_valid: v.result === "valid",
      result: v.result,
      credits_used: 1,
    };
  }
  return { email, is_valid: null, result: "check_failed", credits_used: 0 };
}

async function enrichProspect(token: string, email: string) {
  const res = await fetch(`${SNOV_BASE}/v1/get-prospect-by-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, email }),
  });
  const data = await res.json();

  if (data.success && data.data) {
    const p = data.data;
    return {
      found: true,
      profile: {
        first_name: p.firstName || null,
        last_name: p.lastName || null,
        full_name: [p.firstName, p.lastName].filter(Boolean).join(" ") || null,
        industry: p.industry || null,
        country: p.country || null,
        locality: p.locality || null,
        social_links: p.social || [],
        current_jobs: (p.currentJobs || []).map((j: any) => ({
          company_name: j.companyName || null,
          title: j.position || null,
          company_domain: j.companyDomain || null,
          company_size: j.companySize || null,
          company_industry: j.companyIndustry || null,
          company_country: j.companyCountry || null,
          company_founded: j.companyFounded || null,
        })),
        previous_jobs: (p.previousJobs || []).map((j: any) => ({
          company_name: j.companyName || null,
          title: j.position || null,
          start_date: j.startDate || null,
          end_date: j.endDate || null,
        })),
      },
      credits_used: 1,
    };
  }
  return { found: false, profile: null, credits_used: 0 };
}

async function domainSearch(token: string, domain: string, limit = 10) {
  // Step 1: Free count
  const countRes = await fetch(`${SNOV_BASE}/v1/get-domain-emails-count`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, domain }),
  });
  const countData = await countRes.json();

  if (!countData.success || countData.data?.result === 0) {
    return { found: false, email_count: 0, emails: [], credits_used: 0 };
  }

  // Step 2: Get emails (1 credit per 10)
  const emailsRes = await fetch(`${SNOV_BASE}/v2/domain-emails-with-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, domain, type: "all", limit }),
  });
  const emailsData = await emailsRes.json();

  return {
    found: true,
    email_count: countData.data?.result || 0,
    emails: (emailsData.data?.emails || []).map((e: any) => ({
      email: e.email,
      first_name: e.firstName,
      last_name: e.lastName,
      position: e.position,
      type: e.type,
      status: e.status,
    })),
    credits_used: 1,
  };
}

// --- Conditional logic ---

interface EnrichmentHints {
  apollo_email?: string | null;
  hunter_email?: string | null;
  apollo_phone?: string | null;
  apollo_linkedin_url?: string | null;
  apollo_title?: string | null;
  apollo_company_name?: string | null;
  lead_score?: number;
}

function shouldQuerySnov(hints?: EnrichmentHints): { shouldQuery: boolean; gaps: string[]; reason: string } {
  const gaps: string[] = [];
  if (!hints) return { shouldQuery: false, gaps: [], reason: "No enrichment hints — skipping Snov.io" };

  if (!hints.apollo_email && !hints.hunter_email) gaps.push("missing_email");
  if (!hints.apollo_phone) gaps.push("missing_phone");
  if (!hints.apollo_linkedin_url) gaps.push("missing_linkedin");
  if (!hints.apollo_title || !hints.apollo_company_name) gaps.push("missing_profile");

  const scoreTooLow = (hints.lead_score ?? 0) < 40;
  if (scoreTooLow && gaps.length > 0) {
    return { shouldQuery: false, gaps, reason: "Lead score below 40 — conserving Snov.io credits" };
  }

  return {
    shouldQuery: gaps.length > 0,
    gaps,
    reason: gaps.length > 0 ? `Data gaps: ${gaps.join(", ")}` : "No gaps — skipping Snov.io",
  };
}

// --- Orchestrator mode ---

async function checkGaps(
  token: string,
  body: {
    first_name?: string;
    last_name?: string;
    domain?: string;
    email?: string;
    enrichment_hints?: EnrichmentHints;
  }
) {
  const gate = shouldQuerySnov(body.enrichment_hints);
  if (!gate.shouldQuery) {
    return { skipped: true, skip_reason: gate.reason, gaps: gate.gaps, data: null, credits_used: 0 };
  }

  const results: Record<string, any> = {};
  let totalCredits = 0;

  // Priority 1: Find email
  if (gate.gaps.includes("missing_email") && body.first_name && body.last_name && body.domain) {
    const emailResult = await findEmail(token, body.first_name, body.last_name, body.domain);
    results.email_finder = emailResult;
    totalCredits += emailResult.credits_used;

    // Auto-verify if found
    if (emailResult.found && emailResult.emails[0]?.email) {
      const verification = await verifyEmail(token, emailResult.emails[0].email);
      results.email_verification = verification;
      totalCredits += verification.credits_used;
    }
  }

  // Priority 2: Enrich profile
  const emailToEnrich =
    body.email ||
    body.enrichment_hints?.apollo_email ||
    body.enrichment_hints?.hunter_email ||
    results.email_finder?.emails?.[0]?.email;

  if (emailToEnrich && (gate.gaps.includes("missing_phone") || gate.gaps.includes("missing_profile") || gate.gaps.includes("missing_linkedin"))) {
    const prospect = await enrichProspect(token, emailToEnrich);
    results.prospect_enrichment = prospect;
    totalCredits += prospect.credits_used;
  }

  return { skipped: false, gaps: gate.gaps, data: results, credits_used: totalCredits };
}

// --- Main handler ---

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

    // Check credentials
    const snovUserId = Deno.env.get("SNOV_USER_ID");
    const snovSecret = Deno.env.get("SNOV_API_SECRET");
    if (!snovUserId || !snovSecret) {
      return new Response(
        JSON.stringify({
          error: "snov_not_configured",
          message:
            "Snov.io credentials not configured. Sign up at snov.io (free: 50 credits/month), then add SNOV_USER_ID and SNOV_API_SECRET in project secrets. Find them under Account Settings → API.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getSnovToken();
    const body = await req.json();
    const { mode } = body;

    if (!mode) {
      return new Response(
        JSON.stringify({ error: "mode is required (find_email, verify_email, enrich_prospect, domain_search, check_gaps)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: find_email
    if (mode === "find_email") {
      const { first_name, last_name, domain } = body;
      if (!first_name || !last_name || !domain) {
        return new Response(JSON.stringify({ error: "first_name, last_name, and domain are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await findEmail(token, first_name, last_name, domain);
      return new Response(JSON.stringify({ mode, success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: verify_email
    if (mode === "verify_email") {
      if (!body.email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await verifyEmail(token, body.email);
      return new Response(JSON.stringify({ mode, success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: enrich_prospect
    if (mode === "enrich_prospect") {
      if (!body.email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await enrichProspect(token, body.email);
      return new Response(JSON.stringify({ mode, success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: domain_search
    if (mode === "domain_search") {
      if (!body.domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await domainSearch(token, body.domain, body.limit || 10);
      return new Response(JSON.stringify({ mode, success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: check_gaps
    if (mode === "check_gaps") {
      const result = await checkGaps(token, body);
      return new Response(JSON.stringify({ mode, success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}. Use find_email, verify_email, enrich_prospect, domain_search, or check_gaps.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("snov-enrichment error:", e);
    const msg = e.message || "Internal error";
    if (msg === "snov_not_configured") {
      return new Response(
        JSON.stringify({
          error: "snov_not_configured",
          message: "Snov.io credentials not configured. Add SNOV_USER_ID and SNOV_API_SECRET in project secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
