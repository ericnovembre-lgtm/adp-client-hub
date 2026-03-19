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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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

    const { period = "all_time" } = await req.json();

    // Calculate period start
    let periodStart: string | null = null;
    const now = new Date();
    if (period === "this_week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      periodStart = d.toISOString();
    } else if (period === "this_month") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart = new Date(now.getFullYear(), qMonth, 1).toISOString();
    }

    // Service role client for aggregation queries
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;

    // Run all queries in parallel
    const [
      industryRes,
      stateRes,
      statusRes,
      sourceRes,
      triggerRes,
      dealsRes,
      activitiesRes,
      tasksRes,
      leadsAllRes,
    ] = await Promise.all([
      // 1. Leads by industry
      serviceClient.from("leads").select("industry").eq("user_id", userId),
      // 2. Leads by state
      serviceClient.from("leads").select("state").eq("user_id", userId),
      // 3. Leads by status
      serviceClient.from("leads").select("status").eq("user_id", userId),
      // 4. Leads by source
      serviceClient.from("leads").select("source").eq("user_id", userId),
      // 5. Leads by trigger_type
      serviceClient.from("leads").select("trigger_type").eq("user_id", userId),
      // 6. Deals with stage and value
      serviceClient.from("deals").select("stage, value").eq("user_id", userId),
      // 7. Activities in period
      (() => {
        let q = serviceClient.from("activities").select("type").eq("user_id", userId);
        if (periodStart) q = q.gte("created_at", periodStart);
        return q;
      })(),
      // 8. Tasks by status
      serviceClient.from("tasks").select("status").eq("user_id", userId),
      // 9+10. All leads for headcount avg and total count
      serviceClient.from("leads").select("headcount").eq("user_id", userId),
    ]);

    // Aggregate helper
    function groupBy(rows: any[] | null, key: string): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const row of rows || []) {
        const val = row[key] || "Unknown";
        counts[val] = (counts[val] || 0) + 1;
      }
      return counts;
    }

    const leadsByIndustry = groupBy(industryRes.data, "industry");
    const leadsByState = groupBy(stateRes.data, "state");
    const leadsByStatus = groupBy(statusRes.data, "status");
    const leadsBySource = groupBy(sourceRes.data, "source");
    const leadsByTrigger = groupBy(triggerRes.data, "trigger_type");

    // Deals aggregation
    const dealsByStage: Record<string, { count: number; value: number }> = {};
    let totalPipelineValue = 0;
    for (const deal of dealsRes.data || []) {
      const stage = deal.stage || "Unknown";
      if (!dealsByStage[stage]) dealsByStage[stage] = { count: 0, value: 0 };
      dealsByStage[stage].count++;
      const val = Number(deal.value) || 0;
      dealsByStage[stage].value += val;
      totalPipelineValue += val;
    }

    const activitiesByType = groupBy(activitiesRes.data, "type");
    const tasksByStatus = groupBy(tasksRes.data, "status");

    // Headcount average
    const headcounts = (leadsAllRes.data || [])
      .map((l: any) => l.headcount)
      .filter((h: any) => h != null);
    const avgHeadcount =
      headcounts.length > 0
        ? Math.round(headcounts.reduce((a: number, b: number) => a + b, 0) / headcounts.length)
        : 0;

    const totalLeads = leadsAllRes.data?.length || 0;
    const totalDeals = dealsRes.data?.length || 0;

    const dataPayload = {
      leads_by_industry: leadsByIndustry,
      leads_by_state: leadsByState,
      leads_by_status: leadsByStatus,
      leads_by_source: leadsBySource,
      leads_by_trigger_type: leadsByTrigger,
      deals_by_stage: dealsByStage,
      activities_by_type: activitiesByType,
      tasks_by_status: tasksByStatus,
      average_headcount: avgHeadcount,
      total_leads: totalLeads,
      total_deals: totalDeals,
      total_pipeline_value: totalPipelineValue,
      period,
    };

    const systemPrompt = `You are a territory analytics strategist for an ADP TotalSource sales rep in the Down Market segment (2-20 employees). Analyze their pipeline data and provide strategic insights. Write in plain text only, no markdown, no emoji, no HTML. Use numbered sections.

Your analysis must cover:

1. TERRITORY HEALTH SCORE: Rate the overall territory as Strong, Healthy, Needs Attention, or Critical. Explain why based on pipeline balance, activity levels, and conversion rates.

2. INDUSTRY CONCENTRATION: Which industries dominate the pipeline? Is there dangerous over-concentration (more than 40 percent in one industry)? Which ADP-friendly industries are completely missing?

3. GEOGRAPHIC GAPS: Which states have leads? Which states in the rep's likely territory have zero coverage? Recommend states to prospect in based on ADP carrier availability.

4. PIPELINE FLOW: How are leads moving through stages? Calculate approximate conversion rates. Flag any stage where leads are getting stuck.

5. ACTIVITY ANALYSIS: Is the rep making enough touches? Compare call/email/meeting activity to pipeline size. A healthy ratio is 3-5 activities per active lead per week.

6. SOURCE EFFECTIVENESS: Which lead sources are producing the most leads? Which produce the highest quality (based on how many advance past 'new' status)?

7. WHITESPACE OPPORTUNITIES: Based on the gaps identified, name 3 specific industries and 3 specific states the rep should focus on next, and explain why each is a good target for ADP TotalSource.

8. WEEKLY ACTION PLAN: Based on everything above, give 5 specific actions for the upcoming week, prioritized by impact.

At the very beginning, output exactly one of these health scores on a line by itself: HEALTH_SCORE:strong or HEALTH_SCORE:healthy or HEALTH_SCORE:needs_attention or HEALTH_SCORE:critical. Then proceed with your analysis.`;

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
            content: `Here is the pipeline data for the ${period} period:\n\n${JSON.stringify(dataPayload, null, 2)}`,
          },
        ],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const analysisText =
      anthropicData.content?.[0]?.text || "Unable to generate analysis.";

    // Parse health score from response
    let healthScore = "needs_attention";
    const healthMatch = analysisText.match(/HEALTH_SCORE:(strong|healthy|needs_attention|critical)/);
    if (healthMatch) {
      healthScore = healthMatch[1];
    }

    // Clean the health score line from the analysis
    const cleanAnalysis = analysisText.replace(/HEALTH_SCORE:\w+\n?/, "").trim();

    return new Response(
      JSON.stringify({
        analysis: cleanAnalysis,
        health_score: healthScore,
        total_leads: totalLeads,
        total_deals: totalDeals,
        total_pipeline_value: totalPipelineValue,
        leads_by_industry: leadsByIndustry,
        leads_by_state: leadsByState,
        deals_by_stage: dealsByStage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Territory analytics error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
