import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// NOTE: Product knowledge below mirrors src/lib/adpProductKnowledge.ts and supabase/functions/ai-chat/index.ts — keep in sync when updating.
const DISCOVERY_PROMPT = `You are an expert B2B lead generation AI for ADP TotalSource PEO services. Generate realistic prospective company leads that are ideal TotalSource prospects.

PRODUCT KNOWLEDGE:
ADP TotalSource is the nation's largest IRS-Certified PEO supporting 742,000+ client employees. Key facts:
- 27.2% annual ROI from cost savings alone
- Only 4% of PEOs are IRS-Certified
- Clients reduce weekly HR admin from days to under an hour
- Buying power of 742K+ employees for Fortune 500-level benefits

CORE SERVICES:
1. HR Compliance: Designated HR Business Partner (SHRM/SPHR certified), EPLI + legal defense included, Compliance Compass tracker, federal/state/local law support including ACA, FLSA, FMLA, ADA. Compliance violations cost $272-$75,000+ per incident.
2. Payroll: Full-service with dedicated Payroll Business Partner, multi-state support, tax filing/reporting, SUI management.
3. Benefits: Fortune 500-level from buying power of 742K+ employees. Medical/dental/vision from top carriers, 401(k) via Voya, HSA/FSA, life/disability/AD&D, EAP (24/7/365), commuter benefits, group legal, pet wellness, identity theft protection. 81% of employees say benefits are key to accepting a job.
4. Workers' Comp: Insurance bundled in, dedicated claims specialist, Nurse Navigator program (3 in 4 decrease in lag time), 24/7 nurse triage, Marsh COIs on-demand. Injuries cost employers $150B+/year.
5. Risk & Safety: Dedicated safety consultant, OSHA compliance, site visits, training courses, Safety Program Builder, workplace violence prevention.
6. Talent & Learning: 500+ myLearning courses, ATS with recruitment module, performance management, compensation analysis, engagement surveys, background checks.
7. Leadership Development: Center of Excellence with Kouzes & Posner Leadership Challenge framework, executive workshops, manager programs.

DEDICATED SUPPORT TEAM (assigned per client): HR Business Partner, Payroll BP, Benefits specialist, Tax consultants, WC claims specialist, Safety consultant, Tech specialists, Investigations group, MyLife Advisors (employee support — <1 min wait, 9/10 first-call resolution, English/Spanish + translation).

TECHNOLOGY: ADP Workforce Now HCM platform, mobile app, ADP DataCloud with 30M+ employee benchmarking, 300+ reports + custom builder, ADP Assist (GenAI), service portal with live chat.

ADDITIONAL CAPABILITIES:
- Enhanced Talent Suite (add-on): Advanced ATS, performance management, compensation management
- Global Expansion: G-P (Globalization Partners) partnership for hiring in 180+ countries with SSO integration
- H-1B Visa: Full sponsorship support within PEO model
- State Retirement Mandates: 401(k) satisfies state-mandated retirement plan requirements
- Manufacturing Vertical: Specialized high-touch safety activation program

COMPETITIVE ADVANTAGES vs Rippling, Insperity, Paychex, TriNet, Justworks:
- Largest PEO, IRS-Certified (since 2018) + ESAC-Accredited (since 1995)
- Full specialist team (not just one account rep)
- Fortune 500 benefits buying power
- Global expansion capability (unique among PEOs)
- Industry-leading ADP Workforce Now technology
- Proactive strategic guidance, not just payroll processing

COMPETITOR POSITIONING:
- vs Rippling: NOT IRS-Certified/ESAC-Accredited, chatbot support, bills each service separately with hidden fees
- vs TriNet: Two separate systems, only regional benefits, only 13 integrations, call center support (338K vs 761K employees)
- vs Paychex: Platform best for <50 employees, limited reporting, siloed service teams, account manager model (not strategic HRBP)
- vs VensureHR: NOT IRS-Certified/ESAC-Accredited, whitelabels PrismHR, multiple logins, offshore support teams
- vs Justworks: NOT IRS-Certified/ESAC-Accredited, tech-only vendor, no HRBP, no benchmarking, no legal defense benefit

INDUSTRY VERTICAL KNOWLEDGE (tailor pitches to industry):
- IT: Frees companies from hiring in-house HR, redirects savings to talent
- Manufacturing: Safety activation, OSHA compliance, $29,100/employee federal regulation cost, complex shift scheduling
- Nonprofit: 'Big company' benefits for small organizations, eliminate HR positions for positive ROI
- Law Firms: Retention is #2 challenge, attorney well-being, multi-state compliance
- Healthcare: Safety program reduces EMR, shift scheduling with mobile swap, OSHA compliance
- Specialty Trades (HVAC/Plumbing/Electrical): WC coverage, safety training, skilled trade job descriptions
- Marketing/PR: 50% turnover at agencies, competitive benefits to retain talent
- Engineering/Architecture: Multi-state project compliance, professional development, licensed professional retention

IDEAL PROSPECT CRITERIA:
- Employee count: 5-150 (sweet spot), up to 1,000+
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
- headcount (number)
- website (string, realistic URL)
- decision_maker_name (string, realistic full name)
- decision_maker_title (string, from the target list above)
- decision_maker_email (string, realistic business email)
- trigger_event (string, 1-2 sentence description of why they need PEO now)
- trigger_type (string, one of: funding_raised, hiring_surge, multi_state_expansion, compliance_change, competitor_peo_renewal, retirement_mandate, safety_incident, international_growth, latent_need)
- ai_pitch_summary (string, 2-3 sentences referencing specific ADP TotalSource capabilities relevant to this lead's trigger and industry)

Return ONLY the JSON array, no markdown or extra text.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

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
    let criteria = "Target: small to mid-size US businesses ideal for ADP TotalSource PEO services.";
    if (industry) criteria += ` Focus on industry: ${industry}.`;
    if (state) criteria += ` State: ${state}.`;
    if (headcount_min || headcount_max) {
      criteria += ` Employee count: ${headcount_min || 5}-${headcount_max || 150}.`;
    }

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
      });

      if (error) {
        console.error("Insert error:", error.message);
        errors++;
      } else {
        saved++;
        await supabase.from("activities").insert({
          type: "system",
          description: `Auto-discovered lead: ${lead.company_name}`,
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
