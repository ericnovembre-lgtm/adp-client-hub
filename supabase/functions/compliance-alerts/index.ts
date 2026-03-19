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
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

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

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    let { state, industry } = body;

    let states: string[] = state ? [state] : [];
    let industries: string[] = industry ? [industry] : [];

    if (!state && !industry) {
      const { data: leads } = await serviceClient
        .from("leads")
        .select("state, industry")
        .eq("user_id", user.id)
        .in("status", ["new", "contacted", "qualified"]);

      if (leads) {
        states = [...new Set(leads.map((l: any) => l.state).filter(Boolean))] as string[];
        industries = [...new Set(leads.map((l: any) => l.industry).filter(Boolean))] as string[];
      }
    }

    if (states.length === 0 && industries.length === 0) {
      return new Response(
        JSON.stringify({ alerts: [], outreach_opportunities: "No states or industries found in your pipeline." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a compliance intelligence analyst for ADP TotalSource. Based on the provided states and industries, identify current compliance topics that create urgency for small businesses to consider a PEO. Write in plain text only, no markdown, no emoji, no HTML.

You should be aware of these ongoing compliance areas that affect small businesses in 2026:

FEDERAL:
- ACA reporting requirements (forms 1094-C, 1095-C) for applicable large employers (50+ FTEs)
- FLSA overtime rules and salary thresholds
- I-9 compliance and E-Verify requirements
- OSHA workplace safety standards and reporting
- EEO-1 reporting requirements
- COBRA administration requirements
- SECURE 2.0 Act retirement plan provisions

STATE-LEVEL (common themes):
- Paid family and medical leave laws (expanding to more states each year)
- State retirement mandate programs (requiring employers to offer retirement plans)
- Minimum wage increases (varies by state and locality)
- Pay transparency and salary disclosure laws
- Harassment prevention training requirements
- Data privacy laws affecting employee data
- Workers compensation regulatory changes

For each state in the pipeline, provide:
1. The top 2 compliance topics that are most relevant RIGHT NOW for small businesses
2. A one-sentence explanation of why this creates urgency
3. A suggested outreach angle: how to position ADP TotalSource as the solution

End with a section called OUTREACH OPPORTUNITIES that identifies the 3 most time-sensitive compliance topics across all states and recommends specific action.

Return JSON with two keys:
- "alerts": array of objects with keys: state, topic, urgency (high/medium/low), explanation, outreach_angle
- "outreach_opportunities": a single string summarizing the top 3 outreach opportunities

Return ONLY the JSON object, no other text.`;

    const userContent = `States in pipeline: ${states.join(", ") || "none"}\nIndustries in pipeline: ${industries.join(", ") || "none"}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.status} ${errText}`);
    }

    const aiData = await anthropicRes.json();
    const rawText = aiData.content?.[0]?.text || "{}";

    let result = { alerts: [] as any[], outreach_opportunities: "" };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : result;
    } catch {
      // keep defaults
    }

    // Auto-create tasks for high-urgency alerts
    const highAlerts = (result.alerts || []).filter((a: any) => a.urgency === "high");
    for (const alert of highAlerts) {
      await serviceClient.from("tasks").insert({
        title: `Compliance outreach: ${alert.topic} — contact leads in ${alert.state}`,
        description: `${alert.explanation} Outreach angle: ${alert.outreach_angle}`,
        priority: "high",
        status: "pending",
        user_id: user.id,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
