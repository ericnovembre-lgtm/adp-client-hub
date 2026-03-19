import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a call prep AI for an ADP TotalSource sales rep in the Down Market segment (2-20 employees). Generate a concise pre-call briefing. Write in plain text only, no markdown, no emoji, no HTML. Use numbered sections.

Structure your briefing as:

1. COMPANY SNAPSHOT: Company name, industry, headcount, state, website. One sentence on what they do.

2. DECISION MAKER: Name, title, email. If available, note what kind of personality to expect based on their title (CEOs want ROI and big picture, CFOs want cost data, HR Directors want compliance and process improvement).

3. WHY THEY NEED ADP: Based on their trigger event and industry, explain the specific pain they are likely experiencing. Reference ADP capabilities that directly address it.

4. THREE TALKING POINTS: Specific, numbered talking points tailored to their industry and situation. Each should reference a real ADP statistic or capability from the product knowledge.

5. LIKELY OBJECTIONS: The 2 most probable objections based on their company size and industry, with a prepared response for each.

6. RECOMMENDED CTA: What specific next step to push for at the end of the call (Executive Overview, benefits analysis, intro to HRBP, etc.) based on where they are in the sales cycle.

7. INDUSTRY ELIGIBILITY: State whether the industry is clear, bluefield, low probability, or prohibited for ADP TotalSource.

Keep the entire briefing under 400 words. This should be scannable in 60 seconds before the call.`;

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

    const { lead_id, contact_id } = await req.json();
    if (!lead_id && !contact_id) {
      return new Response(JSON.stringify({ error: "lead_id or contact_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);
    const contextLines: string[] = [];
    let industry = "";

    if (lead_id) {
      const { data: lead, error: leadErr } = await db
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user.id)
        .single();

      if (leadErr || !lead) {
        return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      industry = lead.industry ?? "";
      contextLines.push(
        `LEAD RECORD:`,
        `Company: ${lead.company_name}`,
        `Industry: ${lead.industry ?? "Unknown"}`,
        `Headcount: ${lead.headcount ?? "Unknown"}`,
        `State: ${lead.state ?? "Unknown"}`,
        `Website: ${lead.website ?? "None"}`,
        `Status: ${lead.status ?? "new"}`,
        `Source: ${lead.source ?? "Unknown"}`,
        `Trigger Type: ${lead.trigger_type ?? "Unknown"}`,
        `Trigger Event: ${lead.trigger_event ?? "None"}`,
        `AI Pitch Summary: ${lead.ai_pitch_summary ?? "None"}`,
        "",
        `DECISION MAKER:`,
        `Name: ${lead.decision_maker_name ?? "Unknown"}`,
        `Title: ${lead.decision_maker_title ?? "Unknown"}`,
        `Email: ${lead.decision_maker_email ?? "Unknown"}`,
        `Phone: ${lead.decision_maker_phone ?? "Unknown"}`,
      );

      // Activities for this lead
      const { data: activities } = await db
        .from("activities")
        .select("*")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(10);

      contextLines.push("", "RECENT ACTIVITIES:");
      if (activities && activities.length > 0) {
        for (const a of activities) {
          contextLines.push(`- [${a.type}] ${a.description} (${a.created_at})`);
        }
      } else {
        contextLines.push("- No activities recorded");
      }
    }

    if (contact_id) {
      const { data: contact, error: contactErr } = await db
        .from("contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("user_id", user.id)
        .single();

      if (contactErr || !contact) {
        return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      contextLines.push(
        `CONTACT RECORD:`,
        `Name: ${contact.first_name} ${contact.last_name}`,
        `Title: ${contact.job_title ?? "Unknown"}`,
        `Email: ${contact.email ?? "Unknown"}`,
        `Phone: ${contact.phone ?? "Unknown"}`,
        `Company: ${contact.company ?? "Unknown"}`,
        `Status: ${contact.status ?? "lead"}`,
        `Source: ${contact.source ?? "Unknown"}`,
        `Notes: ${contact.notes ?? "None"}`,
      );

      // Related deals
      const { data: deals } = await db
        .from("deals")
        .select("*")
        .eq("contact_id", contact_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (deals && deals.length > 0) {
        contextLines.push("", "RELATED DEALS:");
        for (const d of deals) {
          contextLines.push(`- ${d.title} | Stage: ${d.stage ?? "lead"} | Value: ${d.value != null ? "$" + d.value : "N/A"} | Expected Close: ${d.expected_close_date ?? "N/A"}`);
        }
      }

      // Company info if linked
      if (contact.company_id) {
        const { data: company } = await db.from("companies").select("*").eq("id", contact.company_id).single();
        if (company) {
          industry = company.industry ?? "";
          contextLines.push("", `COMPANY: ${company.name}, Industry: ${company.industry ?? "Unknown"}, Employees: ${company.employees ?? "Unknown"}, Revenue: ${company.revenue ?? "Unknown"}`);
        }
      }

      // Activities for this contact
      const { data: activities } = await db
        .from("activities")
        .select("*")
        .eq("contact_id", contact_id)
        .order("created_at", { ascending: false })
        .limit(10);

      contextLines.push("", "RECENT ACTIVITIES:");
      if (activities && activities.length > 0) {
        for (const a of activities) {
          contextLines.push(`- [${a.type}] ${a.description} (${a.created_at})`);
        }
      } else {
        contextLines.push("- No activities recorded");
      }

      // Open tasks
      const { data: tasks } = await db
        .from("tasks")
        .select("*")
        .eq("contact_id", contact_id)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true });

      if (tasks && tasks.length > 0) {
        contextLines.push("", "OPEN TASKS:");
        for (const t of tasks) {
          contextLines.push(`- [${t.priority}] ${t.title} (due: ${t.due_date ?? "no date"})`);
        }
      }
    }

    // Check knockout rules for industry
    let industryStatus = "clear";
    if (industry) {
      const { data: rules } = await db.from("knockout_rules").select("*");
      if (rules && rules.length > 0) {
        const lowerIndustry = industry.toLowerCase();
        const match = rules.find((r: any) => lowerIndustry.includes(r.industry_name.toLowerCase()) || r.industry_name.toLowerCase().includes(lowerIndustry));
        if (match) {
          industryStatus = match.tier;
          contextLines.push("", `INDUSTRY ELIGIBILITY: ${match.tier.toUpperCase()} — ${match.conditions ?? "See knockout rules"}`);
        } else {
          contextLines.push("", "INDUSTRY ELIGIBILITY: CLEAR — No knockout rules match this industry");
        }
      }
    }

    const userMessage = contextLines.join("\n");

    const aiResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1200,
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
    const briefing = aiData.content?.[0]?.text ?? "";

    // Try to extract industry status from AI response if not already set
    if (industryStatus === "clear" && briefing.toLowerCase().includes("prohibited")) {
      industryStatus = "prohibited";
    } else if (industryStatus === "clear" && briefing.toLowerCase().includes("low probability")) {
      industryStatus = "low_probability";
    } else if (industryStatus === "clear" && briefing.toLowerCase().includes("bluefield")) {
      industryStatus = "bluefield";
    }

    return new Response(
      JSON.stringify({ briefing, industry_status: industryStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("call-prep error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
