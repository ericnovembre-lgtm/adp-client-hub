import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
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
    const userId = user.id;

    const apolloKey = Deno.env.get("APOLLO_API_KEY");
    if (!apolloKey) {
      return new Response(
        JSON.stringify({ error: "apollo_not_configured", message: "Apollo API key is not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase
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

    const enriched: Record<string, unknown> = {};
    const enrichedFields: string[] = [];

    // 1. Organization enrichment via Apollo
    try {
      const orgParams = new URLSearchParams({ api_key: apolloKey });
      if (lead.company_name) orgParams.set("organization_name", lead.company_name);
      if (lead.website) orgParams.set("domain", lead.website.replace(/^https?:\/\//, "").replace(/\/$/, ""));

      const orgRes = await fetch(
        `https://api.apollo.io/api/v1/organizations/enrich?${orgParams.toString()}`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const org = orgData.organization;
        if (org) {
          if (!lead.headcount && org.estimated_num_employees) {
            enriched.headcount = org.estimated_num_employees;
            enrichedFields.push(`headcount (${org.estimated_num_employees})`);
          }
          if (!lead.website && org.primary_domain) {
            enriched.website = org.primary_domain;
            enrichedFields.push("website");
          }
          if (!lead.industry && org.industry) {
            enriched.industry = org.industry;
            enrichedFields.push("industry");
          }
          if (!lead.state && org.state) {
            enriched.state = org.state;
            enrichedFields.push("state");
          }
        }
      }
    } catch (e) {
      console.error("Apollo org enrichment failed:", e);
    }

    // 2. People search for decision maker
    if (!lead.decision_maker_email || !lead.decision_maker_name) {
      try {
        const domain = (enriched.website as string) || lead.website;
        const cleanDomain = domain
          ? domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
          : null;

        if (cleanDomain) {
          const peopleRes = await fetch(
            "https://api.apollo.io/api/v1/mixed_people/search",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: apolloKey,
                q_organization_domains: cleanDomain,
                person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
                page: 1,
                per_page: 1,
              }),
            }
          );
          if (peopleRes.ok) {
            const peopleData = await peopleRes.json();
            const person = peopleData.people?.[0];
            if (person) {
              if (!lead.decision_maker_name && person.name) {
                enriched.decision_maker_name = person.name;
                enrichedFields.push("decision maker name");
              }
              if (!lead.decision_maker_title && person.title) {
                enriched.decision_maker_title = person.title;
                enrichedFields.push("decision maker title");
              }
              if (!lead.decision_maker_email && person.email) {
                enriched.decision_maker_email = person.email;
                enrichedFields.push("decision maker email");
              }
              if (!lead.decision_maker_phone && (person.phone_numbers?.[0]?.sanitized_number || person.phone_number)) {
                enriched.decision_maker_phone = person.phone_numbers?.[0]?.sanitized_number || person.phone_number;
                enrichedFields.push("decision maker phone");
              }
            }
          }
        }
      } catch (e) {
        console.error("Apollo people search failed:", e);
      }
    }

    // 3. Update lead if we found anything
    if (Object.keys(enriched).length > 0) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update(enriched)
        .eq("id", lead_id);

      if (updateErr) {
        console.error("Failed to update lead:", updateErr);
        return new Response(JSON.stringify({ error: "Failed to update lead" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log activity
      await supabase.from("activities").insert({
        type: "system",
        description: `Lead enriched via Apollo: added ${enrichedFields.join(", ")}`,
        lead_id,
        user_id: userId,
      });
    }

    return new Response(
      JSON.stringify({
        enriched_fields: enrichedFields,
        enriched_count: enrichedFields.length,
        updates: enriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enrich-lead error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
