import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HUNTER_API_BASE = "https://api.hunter.io/v2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
    if (!HUNTER_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "hunter_not_configured",
          message: "Hunter.io API key not configured. Sign up free at hunter.io and add HUNTER_API_KEY to Edge Function secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { mode, domain, first_name, last_name, email, company } = body;

    if (!mode) {
      return new Response(
        JSON.stringify({ error: "mode is required (domain_search, email_finder, email_verifier, company_enrichment)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url: string;
    switch (mode) {
      case "domain_search": {
        if (!domain) {
          return new Response(
            JSON.stringify({ error: "domain is required for domain_search" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const params = new URLSearchParams({ domain, api_key: HUNTER_API_KEY });
        if (company) params.set("company", company);
        url = `${HUNTER_API_BASE}/domain-search?${params}`;
        break;
      }
      case "email_finder": {
        if (!domain || !first_name || !last_name) {
          return new Response(
            JSON.stringify({ error: "domain, first_name, and last_name are required for email_finder" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${HUNTER_API_BASE}/email-finder?${new URLSearchParams({ domain, first_name, last_name, api_key: HUNTER_API_KEY })}`;
        break;
      }
      case "email_verifier": {
        if (!email) {
          return new Response(
            JSON.stringify({ error: "email is required for email_verifier" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${HUNTER_API_BASE}/email-verifier?${new URLSearchParams({ email, api_key: HUNTER_API_KEY })}`;
        break;
      }
      case "company_enrichment": {
        if (!domain) {
          return new Response(
            JSON.stringify({ error: "domain is required for company_enrichment" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${HUNTER_API_BASE}/companies/find?${new URLSearchParams({ domain, api_key: HUNTER_API_KEY })}`;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Invalid mode: ${mode}. Use domain_search, email_finder, email_verifier, or company_enrichment` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const hunterRes = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const hunterData = await hunterRes.json();

    if (!hunterRes.ok) {
      console.error("Hunter API error:", hunterRes.status, JSON.stringify(hunterData));
      return new Response(
        JSON.stringify({
          mode,
          success: false,
          data: null,
          credits_used: 0,
          error: hunterData?.errors?.[0]?.details || hunterData?.errors?.[0]?.message || `Hunter API returned ${hunterRes.status}`,
        }),
        { status: hunterRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract relevant data per mode
    let data: Record<string, unknown>;
    switch (mode) {
      case "domain_search":
        data = {
          domain: hunterData.data?.domain,
          organization: hunterData.data?.organization,
          emails: (hunterData.data?.emails || []).map((e: Record<string, unknown>) => ({
            email: e.value,
            type: e.type,
            confidence: e.confidence,
            first_name: e.first_name,
            last_name: e.last_name,
            position: e.position,
            department: e.department,
          })),
          total: hunterData.meta?.results,
        };
        break;
      case "email_finder":
        data = {
          email: hunterData.data?.email,
          confidence: hunterData.data?.score,
          sources: hunterData.data?.sources?.length || 0,
          first_name: hunterData.data?.first_name,
          last_name: hunterData.data?.last_name,
          position: hunterData.data?.position,
        };
        break;
      case "email_verifier":
        data = {
          email: hunterData.data?.email,
          result: hunterData.data?.result,
          score: hunterData.data?.score,
          mx_records: hunterData.data?.mx_records,
          smtp_server: hunterData.data?.smtp_server,
          smtp_check: hunterData.data?.smtp_check,
          webmail: hunterData.data?.webmail,
          disposable: hunterData.data?.disposable,
        };
        break;
      case "company_enrichment":
        data = {
          name: hunterData.data?.name,
          domain: hunterData.data?.domain,
          industry: hunterData.data?.industry,
          description: hunterData.data?.description,
          size: hunterData.data?.size,
          founded: hunterData.data?.founded,
          location: hunterData.data?.location,
          social: {
            twitter: hunterData.data?.twitter,
            linkedin: hunterData.data?.linkedin,
            facebook: hunterData.data?.facebook,
          },
        };
        break;
      default:
        data = hunterData.data || {};
    }

    return new Response(
      JSON.stringify({
        mode,
        success: true,
        data,
        credits_used: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("hunter-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
