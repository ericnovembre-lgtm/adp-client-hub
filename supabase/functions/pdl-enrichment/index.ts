import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PDL_BASE = "https://api.peopledatalabs.com/v5";

function extractPerson(p: any) {
  return {
    full_name: p.full_name || null,
    first_name: p.first_name || null,
    last_name: p.last_name || null,
    job_title: p.job_title || null,
    job_company_name: p.job_company_name || null,
    job_company_industry: p.job_company_industry || null,
    job_company_size: p.job_company_size || null,
    work_email: p.work_email || null,
    personal_emails: p.personal_emails || [],
    phone_numbers: p.phone_numbers || [],
    linkedin_url: p.linkedin_url || null,
    location_name: p.location_name || null,
    experience: (p.experience || []).map((e: any) => ({
      title: e.title?.name || null,
      company: e.company?.name || null,
      start_date: e.start_date || null,
      end_date: e.end_date || null,
      is_primary: e.is_primary || false,
    })),
    education: (p.education || []).map((e: any) => ({
      school: e.school?.name || null,
      degrees: e.degrees || [],
      start_date: e.start_date || null,
      end_date: e.end_date || null,
    })),
    skills: p.skills || [],
  };
}

function extractCompany(c: any) {
  return {
    name: c.name || null,
    display_name: c.display_name || null,
    size: c.size || null,
    industry: c.industry || null,
    location: c.location ? {
      name: c.location.name || null,
      country: c.location.country || null,
      region: c.location.region || null,
      locality: c.location.locality || null,
    } : null,
    founded: c.founded || null,
    description: c.summary || c.description || null,
    linkedin_url: c.linkedin_url || null,
    employee_count: c.employee_count || null,
    tags: c.tags || [],
    recent_exec_hires: c.recent_exec_hires || [],
    technologies: c.technologies || [],
  };
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

    const pdlKey = Deno.env.get("PDL_API_KEY");
    if (!pdlKey) {
      return new Response(
        JSON.stringify({
          error: "pdl_not_configured",
          message: "PDL_API_KEY is not configured. Sign up at peopledatalabs.com (free tier: 100 lookups/month), then add your API key as PDL_API_KEY in project secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { mode, email, phone, name, company, domain, linkedin_url, location, title, limit } = body;

    if (!mode) {
      return new Response(
        JSON.stringify({ error: "mode is required (person_enrich, company_enrich, person_search)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdlHeaders = {
      "X-Api-Key": pdlKey,
      "Content-Type": "application/json",
    };

    // MODE: person_enrich
    if (mode === "person_enrich") {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);
      if (name) params.set("name", name);
      if (company) params.set("company", company);
      if (linkedin_url) params.set("profile", linkedin_url);
      if (location) params.set("location", location);

      if ([...params.keys()].length === 0) {
        return new Response(
          JSON.stringify({ error: "At least one identifier (email, phone, name, company, linkedin_url) is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${PDL_BASE}/person/enrich?${params.toString()}`, { headers: pdlHeaders });
      const data = await res.json();

      if (!res.ok || data.status === 404) {
        return new Response(
          JSON.stringify({ mode, success: true, data: null, match_likelihood: 0, found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          mode,
          success: true,
          data: extractPerson(data.data || data),
          match_likelihood: data.likelihood || 0,
          found: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: company_enrich
    if (mode === "company_enrich") {
      const params = new URLSearchParams();
      if (domain) params.set("website", domain.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      else if (company) params.set("name", company);
      else {
        return new Response(
          JSON.stringify({ error: "domain or company name is required for company_enrich" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${PDL_BASE}/company/enrich?${params.toString()}`, { headers: pdlHeaders });
      const data = await res.json();

      if (!res.ok || data.status === 404) {
        return new Response(
          JSON.stringify({ mode, success: true, data: null, found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          mode,
          success: true,
          data: extractCompany(data),
          found: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: person_search
    if (mode === "person_search") {
      const must: any[] = [];
      if (company) must.push({ term: { job_company_name: company } });
      if (title) must.push({ term: { job_title: title } });
      if (location) must.push({ term: { location_name: location } });
      if (domain) must.push({ term: { job_company_website: domain.replace(/^https?:\/\//, "").replace(/\/$/, "") } });

      if (must.length === 0) {
        return new Response(
          JSON.stringify({ error: "At least one filter (company, title, location, domain) is required for person_search" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${PDL_BASE}/person/search`, {
        method: "POST",
        headers: pdlHeaders,
        body: JSON.stringify({
          query: { bool: { must } },
          size: limit || 10,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return new Response(
          JSON.stringify({ mode, success: false, error: data.error?.message || "PDL search failed", data: null }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = (data.data || []).map(extractPerson);
      return new Response(
        JSON.stringify({
          mode,
          success: true,
          data: results,
          total: data.total || results.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}. Use person_enrich, company_enrich, or person_search.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("pdl-enrichment error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
