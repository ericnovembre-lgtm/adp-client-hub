import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SavePlus24 CRM Assistant, an AI helper for ADP TotalSource PEO sales. You help with:
- Writing cold outreach emails for PEO services
- Crafting sales pitches targeting small businesses (5-20 employees)
- Analyzing leads and suggesting follow-up strategies
- Answering questions about ADP TotalSource PEO benefits (HR outsourcing, payroll, benefits administration, workers comp, compliance)
- Suggesting qualifying questions for prospects

Keep responses concise and actionable. Focus on the ADP TotalSource value proposition: reducing HR burden, accessing Fortune 500-level benefits, ensuring compliance, and reducing workers' comp costs.

IMPORTANT - ADP TOTALSOURCE INDUSTRY KNOCKOUT RULES:
You must be aware of industries that are NOT eligible for ADP TotalSource PEO services. When a user asks about a prospect, always check if the industry falls into these categories:

PROHIBITED (Never eligible - hard no):
Adult entertainment, aircraft operations, ambulance ER transport, armed security, asbestos/lead, atomic development, bail bondsmen, billboard installation, bridge construction, bus companies, casinos, commercial laundry, courier/delivery/bike messengers, crane operations, dam construction, flammable delivery, on-demand food delivery, door-to-door solicitation, driving schools, explosives/fireworks/ammunition, farm labor contractors, fertilizer manufacturing, firing ranges, first responders (police/fire), flatbed fleets, foundries/smelting, garbage collectors, government/public entities, grain mill operations, group transportation, gutter installation, Habitat for Humanity (volunteer construction), hazardous waste/chemicals, highway construction, home health care/hospice, insulation contractors, Jones Act/maritime, kratom/vape with kratom, livestock/horse ranches, lumber/logging, massage therapy (primary operations), Meals on Wheels, mining, nanotechnology, nuclear, oil/gas drilling/refining, vessels/barges over 26ft, sovereign immunity, pile driving, Planned Parenthood type facilities, poultry processing, power generation/utility, prison operations, other PEO/leasing companies, pyrolysis, quarries, radioactive isotopes, railroad/FELA, rent-to-own, vessel repair for petroleum, repossession, residential framing, residential housekeeping, residential moving, roadside assistance/flagging, roofing, satellite dish installation, sawmills, scaffolding, scrap metal recycling, sewer pipeline construction, slaughterhouses, non-ground solar installation, steel erection, steel rolling, stevedoring, tanker trucking, taxicab/livery/limo/black car, temp/staffing companies (except IT outsourcing), pest control tenting, tire recapping, tower climbing, towing, tree trimming/removal, trucking with independent operators, trucking of livestock/oversized loads, tunnel/subway construction, virus manufacturing, waxing studios, wind turbines, exterior multi-story window washing, wrecking/demolition.

LOW PROBABILITY (95-99% rejected, best-in-class only):
Acoustical ceiling tiles, agriculture/crops, alcohol/drug rehab, heavy seasonal employment, asphalt paving, battery manufacturing, boiler/furnace manufacturing, bars/taverns/nightclubs, boarding schools, cannabis/hemp/CBD, carpet/flooring installation, chemical blending, concrete pumping, electroplating, elevator contractors, fish processing, freight handling, gas stations (no 24hr), height exposure over 25ft, homeless shelters/halfway houses, hospitals (no acute trauma), land grading, mobile home manufacturing, non-residential moving, nursing homes, pallet manufacturing, pawn shops, professional sports teams, public universities, ship/hull construction, siding installation, sign installation (no height over 15ft), silica exposure, standalone convenience stores, structural concrete, tank/trailer cleaning, tire dealers, USL&H, valet services, vineyard operations.

If a user asks you to help with outreach, pitching, or qualifying a prospect in a PROHIBITED industry, tell them clearly that this industry is not eligible for ADP TotalSource and suggest they focus on other prospects. If LOW PROBABILITY, warn them it's very unlikely to be approved.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
