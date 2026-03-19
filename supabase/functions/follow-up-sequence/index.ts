import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a follow-up sequence designer for an ADP TotalSource sales rep in the Down Market segment (2-20 employees). Generate a 5-touch follow-up sequence over 14 days. Write in plain text only, no markdown, no emoji, no HTML.

Each touch must use a DIFFERENT angle so the prospect never receives the same message twice:

- Touch 1 (Day 0): Thank you and recap of conversation. Reference something specific discussed.
- Touch 2 (Day 3): Share a relevant insight or statistic tied to their industry. Position ADP as a thought leader.
- Touch 3 (Day 7): Compliance or cost angle. Reference a specific regulation, fine amount, or cost statistic relevant to their state and industry.
- Touch 4 (Day 10): Social proof. Reference how companies like theirs have benefited (use ADP TotalSource stats: 7-9% faster growth, 12-14% lower turnover, 27.2% ROI).
- Touch 5 (Day 14): Break-up email. Acknowledge they may be busy, leave the door open, suggest a specific future date to reconnect.

For each touch provide:
1. Day number and type (email or phone call or LinkedIn)
2. Subject line (for emails)
3. Full message body (3 paragraphs max for emails, or a brief call script for phone)
4. Goal of this touch (what response are you trying to get)

Tailor every touch to the prospect's industry, headcount, trigger event, and state. Use specific ADP product knowledge that matches their situation.`;

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

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { lead_id, first_contact_type, notes } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Fetch lead
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("user_id", user.id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch recent activities
    const { data: activities } = await db
      .from("activities")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build context
    const contextLines = [
      `LEAD RECORD:`,
      `Company: ${lead.company_name}`,
      `Industry: ${lead.industry ?? "Unknown"}`,
      `Headcount: ${lead.headcount ?? "Unknown"}`,
      `State: ${lead.state ?? "Unknown"}`,
      `Website: ${lead.website ?? "None"}`,
      `Status: ${lead.status ?? "new"}`,
      `Trigger Type: ${lead.trigger_type ?? "Unknown"}`,
      `Trigger Event: ${lead.trigger_event ?? "None"}`,
      `AI Pitch Summary: ${lead.ai_pitch_summary ?? "None"}`,
      "",
      `DECISION MAKER:`,
      `Name: ${lead.decision_maker_name ?? "Unknown"}`,
      `Title: ${lead.decision_maker_title ?? "Unknown"}`,
      `Email: ${lead.decision_maker_email ?? "Unknown"}`,
      `Phone: ${lead.decision_maker_phone ?? "Unknown"}`,
      "",
      `FIRST CONTACT TYPE: ${first_contact_type}`,
    ];

    if (notes) {
      contextLines.push(`REP NOTES FROM FIRST CONTACT: ${notes}`);
    }

    contextLines.push("", "RECENT ACTIVITIES:");
    if (activities && activities.length > 0) {
      for (const a of activities) {
        contextLines.push(`- [${a.type}] ${a.description} (${a.created_at})`);
      }
    } else {
      contextLines.push("- No activities recorded");
    }

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
        max_tokens: 2500,
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
    const sequence = aiData.content?.[0]?.text ?? "";

    // Create 5 tasks with day offsets
    const dayOffsets = [0, 3, 7, 10, 14];
    const touchTypes = ["Thank you & recap", "Industry insight", "Compliance angle", "Social proof", "Break-up email"];
    const now = new Date();
    let tasksCreated = 0;

    for (let i = 0; i < 5; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + dayOffsets[i]);

      const { error: taskErr } = await db.from("tasks").insert({
        title: `Follow-up Touch ${i + 1}: ${touchTypes[i]} to ${lead.company_name}`,
        description: `Touch ${i + 1} (Day ${dayOffsets[i]}) — ${touchTypes[i]}\n\nGenerated from follow-up sequence. See the full sequence in the lead detail sheet.`,
        due_date: dueDate.toISOString(),
        priority: (i === 0 || i === 4) ? "high" : "medium",
        status: "pending",
        user_id: user.id,
      });

      if (!taskErr) tasksCreated++;
    }

    // Log activity
    await db.from("activities").insert({
      type: "system",
      description: `Generated 5-touch follow-up sequence for ${lead.company_name}`,
      lead_id: lead_id,
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({ sequence, tasks_created: tasksCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("follow-up-sequence error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
