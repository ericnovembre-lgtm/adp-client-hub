import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { competitor, industry, headcount, state, lead_id } = await req.json();

    if (!competitor) {
      return new Response(
        JSON.stringify({ error: "competitor is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let leadContext = "";
    if (lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      if (lead) {
        leadContext = `\n\nPROSPECT CONTEXT:\n- Company: ${lead.company_name}\n- Industry: ${lead.industry || industry || "Unknown"}\n- Headcount: ${lead.headcount || headcount || "Unknown"}\n- State: ${lead.state || state || "Unknown"}\n- Trigger Event: ${lead.trigger_event || "None"}\n- Decision Maker: ${lead.decision_maker_name || "Unknown"} (${lead.decision_maker_title || "Unknown title"})`;
      }
    } else if (industry || headcount || state) {
      leadContext = `\n\nPROSPECT CONTEXT:\n- Industry: ${industry || "Unknown"}\n- Headcount: ${headcount || "Unknown"}\n- State: ${state || "Unknown"}`;
    }

    const systemPrompt = `You are a competitive intelligence analyst for ADP TotalSource. Generate a battlecard against the specified competitor, tailored to the prospect's industry, size, and state. Write in plain text only, no markdown, no emoji, no HTML. Use numbered sections.

COMPETITOR DATABASE:

Rippling: Not IRS-Certified or ESAC-Accredited. Support is chatbot-only with no live phone support. Bills each service as a separate module with hidden fees that add up. Limited scheduling, compensation, and succession planning tools. No dedicated HR Business Partner. No EPLI or legal defense benefit included. No safety program. Founded 2016, significantly smaller scale than ADP.

TriNet: Operates two separate systems after acquiring Zenefits (now TriNet ASO). Only offers regional benefits so costs vary significantly by location. Only 13 third-party integrations versus ADP's 300+. Employee support is call center model, not dedicated MyLife Advisors. Supports approximately 338,000 client employees versus ADP's 742,000+.

Paychex: Platform is designed for companies under 50 employees and does not scale well. Limited reporting capabilities with no Excel compatibility. Siloed service teams lead to longer wait times. Uses an account manager model instead of a strategic HRBP. No proactive compliance guidance.

Insperity: Smaller scale than ADP TotalSource. Limited carrier options in some states compared to ADP's multi-carrier portfolio. No global expansion capability. More traditional PEO model without the same level of technology investment.

Justworks: Not IRS-Certified or ESAC-Accredited. Tech-only vendor with no dedicated HR Business Partner. No benchmarking data (ADP has DataCloud with 30M+ employees). No legal defense benefit. No safety program or risk management. No workers comp claims specialist.

VensureHR: Not IRS-Certified or ESAC-Accredited. Whitelabels PrismHR technology rather than building their own. Requires multiple logins across different systems. Grew primarily through acquisitions rather than organic growth. Offshore support teams.

Gusto and BambooHR: These are HR software platforms, NOT PEOs. They provide self-service software only. No co-employment, no workers comp bundled, no dedicated team, no EPLI. Companies using PEOs are 50 percent less likely to go out of business, grow 7-9 percent faster, and have 12-14 percent lower turnover than those using software alone.

YOUR BATTLECARD MUST INCLUDE:

1. COMPETITOR SUMMARY: 2 sentences on who they are and their model.

2. THREE WEAKNESSES TO HIT: Specific, factual vulnerabilities. Tailor to what matters most for this prospect's industry and size.

3. THREE ADP STRENGTHS TO LEAD WITH: Match each weakness with a corresponding ADP strength. Use specific numbers.

4. TWO DISCOVERY QUESTIONS: Questions to ask the prospect that will expose the competitor's gaps without badmouthing them directly.

5. STATE-SPECIFIC ADVANTAGE: If a state is provided, mention which carriers ADP offers in that state that the competitor may not match.

6. DISPLACEMENT EMAIL: A 3-paragraph email the rep can send, positioned as 'I noticed you are coming up on renewal, here is why companies like yours are switching.'

7. ONE-LINE CLOSER: A single memorable sentence the rep can use in conversation.`;

    const userMessage = `Generate a battlecard against ${competitor}.${leadContext}`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicRes.json();
    const fullText =
      anthropicData.content?.[0]?.text ?? "No battlecard generated.";

    // Extract displacement email (section 6)
    let displacementEmail = "";
    const emailMatch = fullText.match(
      /6\.\s*DISPLACEMENT EMAIL[:\s]*([\s\S]*?)(?=7\.\s*ONE-LINE CLOSER|$)/i
    );
    if (emailMatch) {
      displacementEmail = emailMatch[1].trim();
    }

    return new Response(
      JSON.stringify({
        battlecard: fullText,
        competitor,
        displacement_email: displacementEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Battlecard error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
