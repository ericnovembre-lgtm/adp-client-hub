import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RENEWAL_DATES: Record<string, { month: number; day: number }> = {
  rippling: { month: 12, day: 1 },
  insperity: { month: 1, day: 1 },
  trinet: { month: 1, day: 1 },
  justworks: { month: 1, day: 1 },
  paychex: { month: 7, day: 1 },
  adp_workforce_now: { month: 1, day: 1 },
  gusto: { month: 1, day: 1 },
  bamboohr: { month: 1, day: 1 },
  vensurehr: { month: 1, day: 1 },
};

const COMPETITOR_KEYWORDS = [
  "rippling",
  "insperity",
  "trinet",
  "justworks",
  "paychex",
  "vensure",
  "gusto",
  "bamboo",
];

function identifyCompetitor(triggerEvent: string | null): string | null {
  if (!triggerEvent) return null;
  const lower = triggerEvent.toLowerCase();
  for (const kw of COMPETITOR_KEYWORDS) {
    if (lower.includes(kw)) {
      if (kw === "vensure") return "vensurehr";
      if (kw === "bamboo") return "bamboohr";
      return kw;
    }
  }
  return null;
}

function daysUntilRenewal(competitor: string): number {
  const renewal = RENEWAL_DATES[competitor];
  if (!renewal) return 365;
  const now = new Date();
  let nextRenewal = new Date(now.getFullYear(), renewal.month - 1, renewal.day);
  if (nextRenewal <= now) {
    nextRenewal = new Date(now.getFullYear() + 1, renewal.month - 1, renewal.day);
  }
  return Math.ceil((nextRenewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function categorize(days: number): string {
  if (days <= 30) return "urgent";
  if (days <= 60) return "approaching";
  if (days <= 90) return "upcoming";
  return "future";
}

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
    const { mode, lead_id } = await req.json();

    if (mode === "single" && lead_id) {
      const { data: lead, error: leadErr } = await authClient
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

      const competitor = identifyCompetitor(lead.trigger_event) || "unknown";
      const days = daysUntilRenewal(competitor);

      const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: `You are a competitive displacement email writer for ADP TotalSource. Write a personalized outreach email to displace their current PEO provider. Write in plain text only, no markdown, no emoji, no HTML. Use these competitive positioning points:
- vs Rippling: Not IRS-Certified, chatbot support, hidden per-module fees
- vs TriNet: Two systems (Zenefits ASO), regional benefits only, 13 integrations
- vs Paychex: SMB platform, limited reporting, account manager model not strategic HRBP
- vs Insperity: Smaller scale, limited carriers in some states
- vs Justworks: Tech-only, no dedicated team, no HRBP, no safety program
- vs VensureHR: Not IRS-Certified, whitelabels PrismHR, offshore support
- vs Gusto/BambooHR: Software only, not a PEO. PEO clients are 50 percent less likely to go out of business.

Lead with the specific pain point of their current provider. Keep email to 3 paragraphs max. Soft CTA.`,
          messages: [
            {
              role: "user",
              content: `Write a competitive displacement email for this prospect:
Company: ${lead.company_name}
Decision Maker: ${lead.decision_maker_name || "Unknown"}
Title: ${lead.decision_maker_title || "Unknown"}
Current Provider: ${competitor}
Days Until Renewal: ${days}
Industry: ${lead.industry || "Unknown"}
Headcount: ${lead.headcount || "Unknown"}
State: ${lead.state || "Unknown"}`,
            },
          ],
        }),
      });

      const aiData = await aiResp.json();
      const emailText = aiData.content?.[0]?.text || "Unable to generate email.";

      return new Response(
        JSON.stringify({
          analysis: emailText,
          urgent_count: 0,
          approaching_count: 0,
          upcoming_count: 0,
          leads: [
            {
              lead_id: lead.id,
              company_name: lead.company_name,
              competitor,
              days_until_renewal: days,
              category: categorize(days),
            },
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SCAN MODE
    const orFilters = COMPETITOR_KEYWORDS.map(
      (kw) => `trigger_event.ilike.%${kw}%`
    );
    orFilters.push("trigger_type.eq.competitor_peo_renewal");

    const { data: leads, error: leadsErr } = await authClient
      .from("leads")
      .select("*")
      .or(orFilters.join(","));

    if (leadsErr) throw leadsErr;

    const categorizedLeads = (leads || [])
      .map((lead: any) => {
        const competitor = identifyCompetitor(lead.trigger_event) || "unknown";
        const days = daysUntilRenewal(competitor);
        return {
          lead_id: lead.id,
          company_name: lead.company_name,
          competitor,
          days_until_renewal: days,
          category: categorize(days),
          industry: lead.industry,
          headcount: lead.headcount,
          state: lead.state,
        };
      })
      .sort((a: any, b: any) => a.days_until_renewal - b.days_until_renewal);

    const urgent = categorizedLeads.filter((l: any) => l.category === "urgent");
    const approaching = categorizedLeads.filter((l: any) => l.category === "approaching");
    const upcoming = categorizedLeads.filter((l: any) => l.category === "upcoming");

    // Auto-create tasks for urgent leads
    for (const lead of urgent) {
      const { data: existingTasks } = await authClient
        .from("tasks")
        .select("id")
        .eq("user_id", user.id)
        .ilike("title", `%${lead.company_name}%renewal%`)
        .in("status", ["pending", "in_progress"])
        .limit(1);

      if (!existingTasks || existingTasks.length === 0) {
        await serviceClient.from("tasks").insert({
          user_id: user.id,
          title: `URGENT: ${lead.company_name} ${lead.competitor} renewal in ${lead.days_until_renewal} days`,
          description: `Competitor renewal approaching. Contact decision maker to discuss ADP TotalSource displacement.`,
          priority: "urgent",
          status: "pending",
        });
      }
    }

    // Send to Anthropic for analysis
    let analysis = "";
    if (categorizedLeads.length > 0) {
      const summaryText = categorizedLeads
        .filter((l: any) => l.category !== "future")
        .map(
          (l: any) =>
            `[${l.category.toUpperCase()}] ${l.company_name} - Current: ${l.competitor} - ${l.days_until_renewal} days until renewal - Industry: ${l.industry || "Unknown"} - Headcount: ${l.headcount || "Unknown"}`
        )
        .join("\n");

      const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: `You are a competitive renewal intelligence analyst for ADP TotalSource. Analyze these leads approaching competitor PEO renewal dates. Write in plain text only, no markdown, no emoji, no HTML.

For each category (urgent, approaching, upcoming), provide:
1. The lead name, competitor, and days until renewal
2. A one-sentence recommendation on what to do right now
3. For urgent leads, draft a short competitive displacement email subject line

End with a summary: total leads tracked, how many are urgent, and your top 3 priority actions for this week.

Use these competitive positioning points:
- vs Rippling: Not IRS-Certified, chatbot support, hidden per-module fees
- vs TriNet: Two systems (Zenefits ASO), regional benefits only, 13 integrations
- vs Paychex: SMB platform, limited reporting, account manager model not strategic HRBP
- vs Insperity: Smaller scale, limited carriers in some states
- vs Justworks: Tech-only, no dedicated team, no HRBP, no safety program
- vs VensureHR: Not IRS-Certified, whitelabels PrismHR, offshore support
- vs Gusto/BambooHR: Software only, not a PEO. PEO clients are 50 percent less likely to go out of business.`,
          messages: [
            {
              role: "user",
              content: `Analyze these leads approaching competitor PEO renewal dates:\n\n${summaryText || "No leads approaching renewal in the next 90 days."}`,
            },
          ],
        }),
      });

      const aiData = await aiResp.json();
      analysis = aiData.content?.[0]?.text || "No analysis available.";
    } else {
      analysis = "No leads with competitor PEO relationships found. Add leads with competitor information in the trigger event field to start tracking renewals.";
    }

    return new Response(
      JSON.stringify({
        analysis,
        urgent_count: urgent.length,
        approaching_count: approaching.length,
        upcoming_count: upcoming.length,
        leads: categorizedLeads,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("renewal-tracker error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
