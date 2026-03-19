import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.lead411.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LEAD411_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "lead411_not_configured",
          message:
            "LEAD411_API_KEY is not set. Sign up at lead411.com, then add your API key as a project secret named LEAD411_API_KEY.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { mode } = body;

    const apiHeaders = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // MODE: search_companies
    if (mode === "search_companies") {
      const payload: Record<string, unknown> = {};
      if (body.industry) payload.industry = body.industry;
      if (body.location) payload.location = body.location;
      if (body.headcount_min) payload.employee_count_min = body.headcount_min;
      if (body.headcount_max) payload.employee_count_max = body.headcount_max;
      if (body.limit) payload.limit = body.limit;

      const res = await fetch(`${API_BASE}/search/company`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ mode, success: false, error: `Lead411 API error ${res.status}: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await res.json();
      const companies = (result.data || result.results || result.companies || []).map((c: any) => ({
        company_name: c.company_name || c.name || "",
        domain: c.domain || c.website || "",
        industry: c.industry || "",
        employee_count: c.employee_count || c.employees || null,
        revenue: c.revenue || "",
        location: c.location || c.city || "",
        description: c.description || "",
      }));

      return new Response(
        JSON.stringify({ mode, success: true, data: companies, count: companies.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: get_triggers
    if (mode === "get_triggers") {
      const payload: Record<string, unknown> = {};
      if (body.trigger_types?.length) payload.trigger_types = body.trigger_types;
      if (body.industry) payload.industry = body.industry;
      if (body.location) payload.location = body.location;
      if (body.headcount_min) payload.employee_count_min = body.headcount_min;
      if (body.headcount_max) payload.employee_count_max = body.headcount_max;
      if (body.limit) payload.limit = body.limit || 25;

      const res = await fetch(`${API_BASE}/search/triggers`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ mode, success: false, error: `Lead411 API error ${res.status}: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await res.json();
      const triggers = (result.data || result.results || result.triggers || []).map((t: any) => ({
        company_name: t.company_name || t.company?.name || "",
        domain: t.domain || t.company?.domain || "",
        trigger_type: t.trigger_type || t.type || "",
        trigger_date: t.trigger_date || t.date || "",
        trigger_description: t.trigger_description || t.description || t.summary || "",
        employee_count: t.employee_count || t.company?.employee_count || null,
        industry: t.industry || t.company?.industry || "",
        location: t.location || t.company?.location || "",
      }));

      return new Response(
        JSON.stringify({
          mode,
          success: true,
          data: triggers,
          count: triggers.length,
          triggers_found: triggers.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: search_contacts
    if (mode === "search_contacts") {
      const payload: Record<string, unknown> = {};
      if (body.company_name) payload.company_name = body.company_name;
      if (body.domain) payload.domain = body.domain;
      if (body.title) payload.title = body.title;
      if (body.department) payload.department = body.department;
      if (body.limit) payload.limit = body.limit || 10;

      const res = await fetch(`${API_BASE}/search/contact`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ mode, success: false, error: `Lead411 API error ${res.status}: ${errText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await res.json();
      const contacts = (result.data || result.results || result.contacts || []).map((c: any) => ({
        name: c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
        title: c.title || c.job_title || "",
        email: c.email || "",
        phone: c.phone || c.direct_dial || "",
        company: c.company_name || c.company || "",
        linkedin_url: c.linkedin_url || c.linkedin || "",
      }));

      return new Response(
        JSON.stringify({ mode, success: true, data: contacts, count: contacts.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode. Use: search_companies, get_triggers, search_contacts" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
