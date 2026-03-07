import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCOVERY_PROMPT = `You are a B2B lead generation expert for ADP TotalSource PEO services.
Generate realistic prospective company leads based on the given criteria.
Return a JSON array of lead objects. Each lead must have these fields:
- company_name (string, realistic company name)
- industry (string)
- state (string, US state abbreviation)
- headcount (number, employee count)
- website (string, realistic URL)
- decision_maker_name (string, realistic full name)
- decision_maker_title (string, e.g. "CEO", "VP of HR", "CFO")
- decision_maker_email (string, realistic business email)
- trigger_event (string, a brief reason why this company might need PEO services now)

Generate exactly 5 leads. Return ONLY the JSON array, no markdown or extra text.

CRITICAL RULE: Do NOT generate leads for any of these prohibited industries: adult entertainment, aircraft operations, ambulance transport, armed security, asbestos/lead, casinos, courier/delivery services, crane operations, explosives, first responders, garbage collection, government entities, hazardous waste, home health care, logging, mining, oil/gas, roofing, slaughterhouses, steel erection, taxicab/livery, temp staffing, towing, tree removal, trucking with independent operators, wrecking/demolition. Focus only on small businesses in industries that are eligible for PEO services, such as: professional services, technology, healthcare offices (not hospitals), financial services, retail, manufacturing (light/non-hazardous), construction (non-heavy), real estate, education (private), and similar white-collar or light-commercial operations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Parse request body (optional overrides)
    const body = await req.json().catch(() => ({}));
    const { industry, state, headcount_min, headcount_max, user_id } = body;

    // Build criteria prompt
    let criteria = "Target: small to mid-size businesses that could benefit from PEO services.";
    if (industry) criteria += ` Industry: ${industry}.`;
    if (state) criteria += ` State: ${state}.`;
    if (headcount_min || headcount_max) {
      criteria += ` Employee count: ${headcount_min || 5}-${headcount_max || 100}.`;
    }

    // Call AI to generate leads
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: DISCOVERY_PROMPT },
          { role: "user", content: criteria },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI service returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "[]";

    // Parse JSON from AI response (handle markdown code blocks)
    let rawJson = content.trim();
    if (rawJson.startsWith("```")) {
      rawJson = rawJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let leads: any[];
    try {
      leads = JSON.parse(rawJson);
    } catch {
      console.error("Failed to parse AI response:", rawJson);
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(leads)) {
      throw new Error("AI response is not an array");
    }

    // Save leads to database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let saved = 0;
    let errors = 0;

    for (const lead of leads) {
      const { error } = await supabase.from("leads").insert({
        company_name: lead.company_name,
        industry: lead.industry || null,
        state: lead.state || null,
        headcount: lead.headcount || null,
        website: lead.website || null,
        decision_maker_name: lead.decision_maker_name || null,
        decision_maker_title: lead.decision_maker_title || null,
        decision_maker_email: lead.decision_maker_email || null,
        trigger_event: lead.trigger_event || null,
        trigger_type: "latent_need",
        source: "auto_discovery",
        status: "new",
      });

      if (error) {
        console.error("Insert error:", error.message);
        errors++;
      } else {
        saved++;
        // Log activity
        await supabase.from("activities").insert({
          type: "system",
          description: `Auto-discovered lead: ${lead.company_name}`,
        });
      }
    }

    // Update scheduler state if user_id provided
    if (user_id) {
      const { data: existing } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", user_id)
        .maybeSingle();

      const currentSettings = (existing?.settings as Record<string, any>) ?? {};
      await supabase
        .from("user_settings")
        .upsert({
          user_id,
          settings: {
            ...currentSettings,
            scheduler_last_run: new Date().toISOString(),
            scheduler_last_count: saved,
            scheduler_status: errors > 0 ? "error" : "idle",
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    return new Response(
      JSON.stringify({ found: leads.length, saved, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scheduled-discovery error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", found: 0, saved: 0, errors: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
