import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KNOWLEDGE_VERSION = "2026-03-14-v1";

// NOTE: Product knowledge below mirrors src/lib/adpProductKnowledge.ts and supabase/functions/ai-chat/index.ts — keep in sync when updating.
const DISCOVERY_PROMPT = `You are an expert B2B lead generation AI for ADP TotalSource PEO services. Generate realistic prospective company leads that are ideal TotalSource prospects.

CRITICAL: Only generate leads for companies with 2 to 20 employees. This rep works in the ADP TotalSource DOWN MARKET segment. Never suggest companies with fewer than 2 or more than 20 employees.

IDEAL PROSPECT CRITERIA:
- Employee count: 2-20 (down market segment — this is a hard requirement)
- Industries: professional services, technology, healthcare offices (not hospitals), financial services, retail, light manufacturing, construction (non-heavy), real estate, private education, marketing/PR, law firms, engineering/architecture, nonprofit, specialty trades (HVAC/plumbing/electrical)
- Decision makers: CEO, COO, CFO, VP of HR, HR Director, Office Manager, Controller
- Companies experiencing trigger events that create PEO need

TRIGGER EVENTS (assign one per lead as trigger_type and describe in trigger_event):
- funding_raised: Company just raised funding → needs to scale HR quickly, onboard fast, offer competitive benefits
- hiring_surge: Rapid hiring → needs ATS, onboarding, benefits administration at scale
- multi_state_expansion: Expanding to new states → multi-state compliance complexity (tax, labor law, WC)
- compliance_change: Industry regulation changes → new federal/state/local compliance requirements
- competitor_peo_renewal: Current PEO contract renewing (Rippling Dec 1, Insperity/TriNet/Justworks Jan 1) → opportunity to win
- retirement_mandate: State mandating retirement plans → need 401(k) solution (ADP via Voya)
- safety_incident: OSHA incidents or workplace safety concerns → need risk & safety program
- international_growth: Going international → need G-P/EOR solution for hiring in 180+ countries

AI PITCH SUMMARY GUIDANCE (generate 2-3 sentences per lead referencing specific ADP capabilities from the product knowledge above):
- For compliance triggers: mention EPLI coverage, Compliance Compass tracker, dedicated SHRM/SPHR-certified HR Business Partner, $272-$75K+ fine avoidance per violation
- For benefits triggers: mention Fortune 500-level benefits from 742K+ employee buying power, 401(k) via Voya, EAP 24/7/365, medical/dental/vision from top carriers
- For safety triggers: mention Nurse Navigator program (3 in 4 decrease in lag time), 24/7 nurse triage, Safety Program Builder, dedicated safety consultant
- For growth triggers: mention multi-state payroll/compliance support, dedicated team that scales with them, G-P partnership for 180+ countries
- For talent triggers: mention 500+ myLearning courses, Enhanced Talent Suite (ATS, performance, compensation), ADP DataCloud benchmarking with 30M+ employees
- For renewal triggers: mention IRS-Certified + ESAC-Accredited (only 4% of PEOs), largest PEO = best rates, full specialist team vs single account rep, specific weaknesses of competitor being replaced

PROHIBITED INDUSTRIES (NEVER generate leads for these):
Adult entertainment, aircraft operations, ambulance ER transport, armed security, asbestos/lead, atomic development, bail bondsmen, billboard installation, bridge construction, bus companies, casinos, commercial laundry, courier/delivery/bike messengers, crane operations, dam construction, flammable delivery, on-demand food delivery, door-to-door solicitation, driving schools, explosives/fireworks/ammunition, farm labor contractors, fertilizer manufacturing, firing ranges, first responders (police/fire), flatbed fleets, foundries/smelting, garbage collectors, government/public entities, grain mill operations, group transportation, gutter installation, Habitat for Humanity (volunteer construction), hazardous waste/chemicals, highway construction, home health care/hospice, insulation contractors, Jones Act/maritime, kratom/vape with kratom, livestock/horse ranches, lumber/logging, massage therapy (primary operations), Meals on Wheels, mining, nanotechnology, nuclear, oil/gas drilling/refining, vessels/barges over 26ft, sovereign immunity, pile driving, Planned Parenthood type facilities, poultry processing, power generation/utility, prison operations, other PEO/leasing companies, pyrolysis, quarries, radioactive isotopes, railroad/FELA, rent-to-own, vessel repair for petroleum, repossession, residential framing, residential housekeeping, residential moving, roadside assistance/flagging, roofing, satellite dish installation, sawmills, scaffolding, scrap metal recycling, sewer pipeline construction, slaughterhouses, non-ground solar installation, steel erection, steel rolling, stevedoring, tanker trucking, taxicab/livery/limo/black car, temp/staffing companies (except IT outsourcing), pest control tenting, tire recapping, tower climbing, towing, tree trimming/removal, trucking with independent operators, trucking of livestock/oversized loads, tunnel/subway construction, virus manufacturing, waxing studios, wind turbines, exterior multi-story window washing, wrecking/demolition.

LOW PROBABILITY INDUSTRIES (avoid unless specifically requested):
Acoustical ceiling tiles, agriculture/crops, alcohol/drug rehab, heavy seasonal employment, asphalt paving, battery manufacturing, boiler/furnace manufacturing, bars/taverns/nightclubs, boarding schools, cannabis/hemp/CBD, carpet/flooring installation, chemical blending, concrete pumping, electroplating, elevator contractors, fish processing, freight handling, gas stations (no 24hr), height exposure over 25ft, homeless shelters/halfway houses, hospitals (no acute trauma), land grading, mobile home manufacturing, non-residential moving, nursing homes, pallet manufacturing, pawn shops, professional sports teams, public universities, ship/hull construction, siding installation, sign installation (no height over 15ft), silica exposure, standalone convenience stores, structural concrete, tank/trailer cleaning, tire dealers, USL&H, valet services, vineyard operations.

OUTPUT FORMAT:
Return a JSON array of exactly 5 lead objects. Each must have:
- company_name (string, realistic)
- industry (string)
- state (string, US state abbreviation)
- headcount (number, must be between 2 and 20)
- website (string, realistic URL)
- decision_maker_name (string, realistic full name)
- decision_maker_title (string, from the target list above)
- decision_maker_email (string, realistic business email)
- trigger_event (string, 1-2 sentence description of why they need PEO now)
- trigger_type (string, one of: funding_raised, hiring_surge, multi_state_expansion, compliance_change, competitor_peo_renewal, retirement_mandate, safety_incident, international_growth, latent_need)
- ai_pitch_summary (string, 2-3 sentences referencing specific ADP TotalSource capabilities relevant to this lead's trigger and industry)

Return ONLY the JSON array, no markdown or extra text.

[Knowledge Version: ${KNOWLEDGE_VERSION}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Authenticate caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { industry, state, headcount_min, headcount_max } = body;

    // Build criteria prompt
    let criteria = "Target: small US businesses in the down market segment (2-20 employees) ideal for ADP TotalSource PEO services.";
    if (industry) criteria += ` Focus on industry: ${industry}.`;
    if (state) criteria += ` State: ${state}.`;
    criteria += ` Employee count: ${headcount_min || 2}-${headcount_max || 20}. All leads MUST have headcount between 2 and 20.`;

    // Call AI
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

    // Parse JSON (handle markdown code blocks)
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

    if (!Array.isArray(leads)) throw new Error("AI response is not an array");

    // Service role client for DB writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let saved = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of leads) {
      // Duplicate detection: case-insensitive match on company_name
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .ilike("company_name", lead.company_name)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

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
        trigger_type: lead.trigger_type || "latent_need",
        ai_pitch_summary: lead.ai_pitch_summary || null,
        source: "auto_discovery",
        status: "new",
        user_id: user.id,
      });

      if (error) {
        console.error("Insert error:", error.message);
        errors++;
      } else {
        saved++;
        await supabase.from("activities").insert({
          type: "system",
          description: `Auto-discovered lead: ${lead.company_name}`,
          user_id: user.id,
        });
      }
    }

    // Update scheduler state
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentSettings = (existingSettings?.settings as Record<string, any>) ?? {};
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        settings: {
          ...currentSettings,
          scheduler_last_run: new Date().toISOString(),
          scheduler_last_count: saved,
          scheduler_status: errors > 0 ? "error" : "idle",
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ found: leads.length, saved, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scheduled-discovery error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", found: 0, saved: 0, skipped: 0, errors: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
