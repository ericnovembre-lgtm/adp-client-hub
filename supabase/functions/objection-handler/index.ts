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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { objection, industry, headcount, context } = await req.json();

    if (!objection) {
      return new Response(JSON.stringify({ error: "objection is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an objection handling coach for an ADP TotalSource sales rep in the Down Market segment (2-20 employees). The rep just heard an objection from a prospect and needs an instant response. Write in plain text only, no markdown, no emoji, no HTML.

COMMON OBJECTION PATTERNS AND RESPONSES:

'We are too small for a PEO' — ADP TotalSource serves companies with as few as 2 employees. In fact, smaller companies benefit the most because they get access to Fortune 500 benefits and a full HR team they could never afford to hire.

'It is too expensive' or 'We cannot afford it' — ADP TotalSource clients see a 27.2 percent annual ROI from cost savings alone. When you add up what you currently pay for payroll processing, benefits administration, workers comp, HR software, compliance support, and the time your team spends on HR admin, TotalSource typically costs less than doing it yourself.

'We do not want to lose control' — You maintain 100 percent control over all hiring, firing, management decisions, and day-to-day operations. ADP handles the administrative burden so you can focus on running your business.

'We are happy with our current provider' — I hear that a lot. Quick question: when was the last time your current provider proactively called you about a compliance change that affects your business? When did they last benchmark your benefits against your competitors? That is the difference between a vendor and a strategic partner.

'We need to think about it' — I completely understand. What specific questions do you want to make sure we answer before making a decision? I want to make sure I give you everything you need.

'We just renewed with [competitor]' — No problem at all. When does your current agreement end? I would love to set up a time 90 days before your renewal to show you what ADP can offer so you can make an informed comparison.

'I need to talk to my partner/board' — Absolutely. Would it be helpful if I put together a one-page summary you can share with them? I can include the specific cost savings and benefits that are most relevant to your business.

YOUR RESPONSE MUST INCLUDE:

1. IMMEDIATE RESPONSE: 2-3 sentences the rep can say right now. Conversational, not scripted.
2. SUPPORTING DATA POINT: One specific statistic or fact that reinforces the response.
3. REDIRECT QUESTION: A question to ask immediately after responding that moves the conversation forward.
4. IF THEY PUSH BACK AGAIN: A second-level response in case the first one does not land.

Return ONLY valid JSON with these keys: { "response": "...", "data_point": "...", "redirect_question": "...", "fallback": "..." }`;

    let userMessage = `The prospect said: "${objection}"`;
    if (industry) userMessage += `\nIndustry: ${industry}`;
    if (headcount) userMessage += `\nHeadcount: ${headcount}`;
    if (context) userMessage += `\nAdditional context: ${context}`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
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

    const anthropicData = await anthropicRes.json();
    const text = anthropicData.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { response: text, data_point: "", redirect_question: "", fallback: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("objection-handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
