import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a deal coaching AI for an ADP TotalSource sales rep in the Down Market segment (2-20 employees). Analyze this deal and provide actionable coaching. Your response must follow these rules: write in plain text only, no markdown, no emoji, no HTML. Use numbered paragraphs.

For each deal, provide:
1. DEAL HEALTH: Rate as Hot (likely to close this month), Warm (progressing but needs action), Stale (no activity in 7+ days), or At Risk (14+ days no activity or past expected close date). Explain why.
2. NEXT BEST ACTION: One specific thing the rep should do today or this week. Be precise — name the person to call, the email to send, or the meeting to schedule.
3. TALK TRACK: If recommending a call, provide 2-3 specific talking points tailored to this prospect's industry, trigger event, and deal stage.
4. OBJECTION PREP: Based on the deal stage and industry, name the most likely objection they will face and provide a response.
5. TIMELINE CHECK: Is the expected close date realistic? If not, suggest a new one and explain why.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth check
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { deal_id } = await req.json();
    if (!deal_id) {
      return new Response(JSON.stringify({ error: "deal_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get deal with contact and company
    const { data: deal, error: dealErr } = await db
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .eq("user_id", user.id)
      .single();

    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let contact = null;
    if (deal.contact_id) {
      const { data } = await db.from("contacts").select("*").eq("id", deal.contact_id).single();
      contact = data;
    }

    let company = null;
    if (deal.company_id) {
      const { data } = await db.from("companies").select("*").eq("id", deal.company_id).single();
      company = data;
    }

    // 2. Last 10 activities for this deal
    const { data: activities } = await db
      .from("activities")
      .select("*")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Open tasks for this deal
    const { data: tasks } = await db
      .from("tasks")
      .select("*")
      .eq("deal_id", deal_id)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true });

    // 4. Calculate metrics
    const now = new Date();

    // days_in_current_stage: find most recent stage_change activity
    const stageChangeActivity = (activities ?? []).find((a: any) => a.type === "stage_change");
    const stageStart = stageChangeActivity ? new Date(stageChangeActivity.created_at) : new Date(deal.created_at);
    const daysInCurrentStage = Math.floor((now.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24));

    // days_since_last_activity
    const lastActivity = (activities ?? [])[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24));

    // Build context message
    const contextLines = [
      `DEAL: ${deal.title}`,
      `Stage: ${deal.stage ?? "lead"}`,
      `Value: ${deal.value != null ? "$" + deal.value : "Not set"}`,
      `Expected Close Date: ${deal.expected_close_date ?? "Not set"}`,
      `Created: ${deal.created_at}`,
      `Days in current stage: ${daysInCurrentStage}`,
      `Days since last activity: ${daysSinceLastActivity}`,
      `Notes: ${deal.notes ?? "None"}`,
      "",
      contact ? `CONTACT: ${contact.first_name} ${contact.last_name}, ${contact.job_title ?? "No title"}, ${contact.email ?? "No email"}, ${contact.phone ?? "No phone"}` : "CONTACT: None assigned",
      company ? `COMPANY: ${company.name}, Industry: ${company.industry ?? "Unknown"}, Employees: ${company.employees ?? "Unknown"}, Revenue: ${company.revenue ?? "Unknown"}` : "COMPANY: None assigned",
      "",
      `RECENT ACTIVITIES (last 10):`,
      ...(activities ?? []).map((a: any) => `- [${a.type}] ${a.description} (${a.created_at})`),
      (activities ?? []).length === 0 ? "- No activities recorded" : "",
      "",
      `OPEN TASKS:`,
      ...(tasks ?? []).map((t: any) => `- [${t.priority}] ${t.title} (due: ${t.due_date ?? "no date"}, status: ${t.status})`),
      (tasks ?? []).length === 0 ? "- No open tasks" : "",
    ];

    const userMessage = contextLines.join("\n");

    // Call Anthropic
    const aiResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const coaching = aiData.content?.[0]?.text ?? "";

    // Parse deal_health from coaching text
    let deal_health: "hot" | "warm" | "stale" | "at_risk" = "warm";
    const healthMatch = coaching.toLowerCase();
    if (healthMatch.includes("deal health:") || healthMatch.includes("1.")) {
      if (/\bhot\b/.test(healthMatch.substring(0, 500))) deal_health = "hot";
      else if (/\bat risk\b/.test(healthMatch.substring(0, 500))) deal_health = "at_risk";
      else if (/\bstale\b/.test(healthMatch.substring(0, 500))) deal_health = "stale";
      else if (/\bwarm\b/.test(healthMatch.substring(0, 500))) deal_health = "warm";
    }

    // Extract next action (section 2)
    let next_action = "";
    const nextActionMatch = coaching.match(/2\.\s*NEXT BEST ACTION[:\s]*([\s\S]*?)(?=\n\s*3\.|$)/i);
    if (nextActionMatch) {
      next_action = nextActionMatch[1].trim().substring(0, 300);
    }

    return new Response(
      JSON.stringify({ coaching, deal_health, next_action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("deal-coach error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
