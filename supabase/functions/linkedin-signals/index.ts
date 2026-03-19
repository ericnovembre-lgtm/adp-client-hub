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
    const { mode, lead_id, limit } = await req.json();

    let leads: any[] = [];

    if (mode === "single" && lead_id) {
      const { data, error } = await serviceClient
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      leads = [data];
    } else {
      const scanLimit = Math.min(limit || 20, 50);
      const { data, error } = await serviceClient
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["new", "contacted"])
        .order("created_at", { ascending: false })
        .limit(scanLimit);
      if (error) throw error;
      leads = data || [];
    }

    if (leads.length === 0) {
      return new Response(
        JSON.stringify({ signals: [], updated_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadsContext = leads
      .map(
        (l: any) =>
          `Lead ID: ${l.id} | Company: ${l.company_name} | Industry: ${l.industry || "unknown"} | State: ${l.state || "unknown"} | Headcount: ${l.headcount || "unknown"} | Decision Maker: ${l.decision_maker_name || "unknown"} (${l.decision_maker_title || "unknown title"}) | Current Trigger: ${l.trigger_event || "none"}`
      )
      .join("\n");

    const systemPrompt = `You are a sales intelligence analyst for an ADP TotalSource sales rep. Based on the provided company and contact information, identify likely buying signals. Write in plain text only, no markdown, no emoji, no HTML.

For each company, analyze what signals might exist based on:
- Company size and industry (are they in a growth phase typical for their headcount?)
- State (are there new compliance requirements in their state?)
- Decision maker title (has there been a recent leadership change implied by a new title?)
- Industry trends (is their industry experiencing consolidation, regulation changes, or talent wars?)

SIGNAL CATEGORIES:
- HIRING: Company appears to be growing and likely needs HR infrastructure
- COMPLIANCE: New regulations in their state or industry creating urgency
- LEADERSHIP CHANGE: New decision maker suggests fresh evaluation of vendors
- EXPANSION: Multi-state activity suggesting compliance complexity
- RENEWAL WINDOW: Coming up on likely renewal with current provider
- NEGATIVE SENTIMENT: Industry or company facing HR challenges

For each lead provide:
1. The most likely signal category
2. A confidence level (high, medium, low)
3. A one-sentence explanation
4. A suggested action (call, email, or wait)

Return a JSON array of objects with keys: lead_id, company_name, signal_type, confidence, explanation, action. Return ONLY the JSON array, no other text.`;

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
        messages: [
          {
            role: "user",
            content: `Analyze these leads for buying signals:\n\n${leadsContext}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.status} ${errText}`);
    }

    const aiData = await anthropicRes.json();
    const rawText = aiData.content?.[0]?.text || "[]";

    let signals: any[] = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      signals = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      signals = [];
    }

    // Update leads with high-confidence signals
    let updatedCount = 0;
    for (const signal of signals) {
      if (signal.confidence === "high" && signal.lead_id) {
        const lead = leads.find((l: any) => l.id === signal.lead_id);
        if (lead && (!lead.trigger_event || lead.trigger_event === "none" || signal.explanation.length > (lead.trigger_event?.length || 0))) {
          const { error: updateErr } = await serviceClient
            .from("leads")
            .update({ trigger_event: `${signal.signal_type}: ${signal.explanation}` })
            .eq("id", signal.lead_id)
            .eq("user_id", user.id);

          if (!updateErr) {
            updatedCount++;
            await serviceClient.from("activities").insert({
              type: "system",
              description: `Signal detected (${signal.signal_type}, ${signal.confidence}): ${signal.explanation}. Suggested action: ${signal.action}`,
              lead_id: signal.lead_id,
              user_id: user.id,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ signals, updated_count: updatedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
