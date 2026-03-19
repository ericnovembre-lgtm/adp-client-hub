import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, state, headcount, currently_enrolled, current_carrier, is_self_funded } = await req.json();

    if (!state || !headcount) {
      return new Response(JSON.stringify({ error: "state and headcount are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch lead context if provided
    let leadContext = "";
    if (lead_id) {
      const { data: lead } = await serviceClient
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      if (lead) {
        leadContext = `\n\nLEAD CONTEXT:\n- Company: ${lead.company_name}\n- Industry: ${lead.industry || "Unknown"}\n- Headcount: ${lead.headcount || headcount}\n- State: ${lead.state || state}\n- Decision Maker: ${lead.decision_maker_name || "Unknown"}\n- Trigger Event: ${lead.trigger_event || "None"}`;
      }
    }

    // Fetch knockout rules for industry check
    const { data: knockoutRules } = await serviceClient
      .from("knockout_rules")
      .select("industry_name, tier, conditions");

    let industryContext = "";
    if (knockoutRules && knockoutRules.length > 0) {
      industryContext = "\n\nINDUSTRY KNOCKOUT RULES:\n" + knockoutRules.map(
        (r: any) => `- ${r.industry_name}: ${r.tier}${r.conditions ? ` (${r.conditions})` : ""}`
      ).join("\n");
    }

    const systemPrompt = `You are a quoting readiness checker for ADP TotalSource. Based on the prospect's state, headcount, and enrollment details, generate an exact checklist of what is required to submit this group for quoting through Gallagher. Write in plain text only, no markdown, no emoji, no HTML. Use numbered sections.

You must know these rules:

PRIME vs STANDARD DETERMINATION:
- 2-9 benefit-eligible employees = PRIME group
- 10+ benefit-eligible employees = Standard group
- PRIME is NOT available in HI, ID, MD, MN, WA, OR

PRIME REQUIREMENTS (2-9 eligible):
- ASI must be 1.45 or below
- Minimum 2 enrolled on health benefits
- 50 percent overall participation
- No COBRA participants
- Average wage $65,000 ($75,000 in NYC, DC Metro, SF Metro)
- Average wage includes W2, non-paid participating SEI and K1s
- No exceptions on average wage

STANDARD REQUIREMENTS (10+ eligible):
- ASI 1.45 or below (1.45-1.55 gradient exception only)
- Minimum 5 enrolled in medical (except WA/OR which require 7)
- 50 percent overall participation (except WA/OR which require 75 percent after valid waivers)
- COBRA participation/exposure less than 10 percent

STATE EXCEPTIONS:
- Hawaii: ASI up to 1.75 allowed. All opportunities referred to TS Field. Prepaid Health Care Act applies (EEs working 20+ hours eligible, EE contribution max 1.5 percent of monthly wages)
- Idaho: 10+ eligible and at least 5 enrolling. PRIME excluded.
- Utah: 10+ eligible and at least 5 enrolling. Benefits on exception basis only, contact broker. TS Select also available. PRIME excluded.
- Maryland: Must have 60 EEs enrolled. TS Select available for under 60. PRIME excluded.
- Illinois: Size tiers are Under 50, 51-149, Over 150 (not the standard Under 50, 51-99, Over 100)
- Washington: Min 10 eligible, 7 enrolled, 75 percent participation. PRIME excluded.
- Oregon: Min 10 eligible, 7 enrolled, 75 percent participation. PRIME excluded.
- New York: No PEO in 20 upstate counties (Clinton, Franklin, St. Lawrence, Essex, Jefferson, Lewis, Hamilton, Wayne, Ontario, Seneca, Yates, Livingston, Genesee, Orleans, Wyoming, Erie, Niagara, Allegany, Cattaraugus, Chautauqua)
- Pennsylvania: TS in Philadelphia and eastern counties. TS Select in western counties.

TS NOT AVAILABLE: MT, WY, SD, ND, NM, WV, VT, ME, AK, AL, MS

REQUIRED DOCUMENTS (all groups):
1. Member Level Census including dependent information
2. Current Invoice within 60 days
3. Plan Designs (ACA plan designs not required)
4. Upcoming Renewal if within 60 to 120 days depending on state

ADDITIONAL DOCUMENTS (100+ enrolled or level/self-funded):
5. Current Monthly Claim Report (12 months, 24 preferred)
6. Current Large Claim Report with diagnosis
7. Cobra/FIE Rates and Copy of Self-Funded Contract (self-funded only)

LOW PARTICIPATION:
If under 45 percent overall current participation, must provide surveyed census of expected enrollees plus business case on increasing participation.

Your response must include:
1. GROUP TYPE: PRIME or Standard, and why
2. STATE STATUS: Whether TS is available in this state, and any state-specific rules
3. INDUSTRY CHECK: Whether the industry is clear, bluefield, low probability, or prohibited
4. REQUIRED DOCUMENTS CHECKLIST: Numbered list of every document needed for this specific group
5. STATE-SPECIFIC NOTES: Any special requirements for this state (county restrictions, higher participation thresholds, etc.)
6. CARRIER OPTIONS: Which medical carriers are available in this state
7. RED FLAGS: Any issues that could delay or block submission (wage requirements for PRIME, participation concerns, etc.)`;

    const userMessage = `Prospect details:
- State: ${state}
- Headcount (benefit-eligible): ${headcount}
- Currently enrolled in medical: ${currently_enrolled ?? "Unknown"}
- Current carrier: ${current_carrier ?? "Unknown"}
- Self-funded: ${is_self_funded ? "Yes" : "No"}${leadContext}${industryContext}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await anthropicRes.json();
    const checklist = aiData.content?.[0]?.text ?? "";

    // Determine group type
    const group_type = headcount >= 10 ? "standard" : "prime";

    // Determine state availability
    const unavailableStates = ["MT", "WY", "SD", "ND", "NM", "WV", "VT", "ME", "AK", "AL", "MS"];
    const stateUpper = state.toUpperCase();
    const state_available = !unavailableStates.includes(stateUpper);

    // Determine industry status from knockout rules
    let industry_status = "clear";
    if (lead_id) {
      const { data: lead } = await serviceClient
        .from("leads")
        .select("industry")
        .eq("id", lead_id)
        .single();
      if (lead?.industry && knockoutRules) {
        const match = knockoutRules.find(
          (r: any) => r.industry_name.toLowerCase() === lead.industry.toLowerCase()
        );
        if (match) {
          industry_status = match.tier;
        }
      }
    }

    return new Response(
      JSON.stringify({ checklist, group_type, state_available, industry_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("quote-readiness error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
