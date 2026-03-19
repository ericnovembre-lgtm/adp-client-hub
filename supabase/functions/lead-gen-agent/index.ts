import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

const EMAIL_SYSTEM_PROMPT = `You are a sales email writer for Eric, an ADP TotalSource sales rep in the Down Market segment (2-20 employees). Write personalized cold outreach emails.

RULES:
- Subject line under 50 characters
- Lead with prospect's pain point, not ADP features
- Include one specific statistic relevant to their situation
- Soft CTA (coffee chat, quick call — not "buy now")
- Maximum 3 short paragraphs
- Sign off as Eric
- If a competitor is detected, reference specific displacement advantages WITHOUT naming ADP TotalSource in the subject line
- If a trigger event exists, open with it
- Use the prospect's first name and company name naturally
- Do NOT use markdown, emoji, or HTML

COMPETITOR-SPECIFIC ANGLES:
- QuickBooks: "You're one compliance incident away from needing real HR. QB payroll ≠ HR protection."
- Justworks: "At your size, you've outgrown 20 pre-built reports and no dedicated account manager."
- Gusto: "Gusto is software — you ARE the HR department. One DOL audit changes everything."
- Paychex: "Is your payroll vendor also your co-employer with skin in the compliance game?"
- DIY/None: "Companies your size face $272-$75K+ per compliance violation. A PEO shares that liability."

ADP STATS TO REFERENCE (pick ONE per email):
- 27.2% annual ROI from PEO cost savings
- 742,000+ worksite employees (Fortune 500 benefits buying power)
- 7-9% faster growth for PEO clients vs non-PEO
- 12-14% lower employee turnover
- IRS-Certified + ESAC-Accredited (only 4% of PEOs)
- 98.2% in-network healthcare utilization
- 3 in 4 decrease in workers' comp lag time

Return your response as JSON with two fields: "subject" and "body". Nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    let userId: string;

    const token = authHeader.replace("Bearer ", "");
    // Allow service role key for internal calls (e.g. from crm-agent)
    if (token === serviceKey) {
      // Internal call — user_id must be provided in the request body
      const bodyPeek = await req.clone().json().catch(() => ({}));
      if (!bodyPeek.user_id) {
        return new Response(JSON.stringify({ error: "user_id required for service role calls" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = bodyPeek.user_id;
    } else if (authHeader.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await authClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const triggerType = body.trigger_type ?? "manual";
    const config = body.config ?? {};
    const skipDiscovery = config.skip_discovery ?? false;
    const maxLeads = Math.min(config.max_leads ?? 10, 10);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Create run record
    const { data: run, error: runErr } = await supabase.from("lead_gen_runs").insert({
      user_id: userId,
      status: "pending",
      trigger_type: triggerType,
      config,
    }).select().single();

    if (runErr || !run) {
      return new Response(JSON.stringify({ error: "Failed to create run: " + runErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runId = run.id;

    // Run pipeline asynchronously but respond immediately with run_id
    const pipelinePromise = runPipeline(supabase, supabaseUrl, authHeader, userId, runId, config, skipDiscovery, maxLeads, anthropicKey);

    // Don't await — let it run in background
    pipelinePromise.catch((err) => {
      console.error("Pipeline error:", err);
      supabase.from("lead_gen_runs").update({
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      }).eq("id", runId).then(() => {});
    });

    return new Response(JSON.stringify({ success: true, run_id: runId, status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-gen-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function runPipeline(
  supabase: any, supabaseUrl: string, authHeader: string,
  userId: string, runId: string, config: any,
  skipDiscovery: boolean, maxLeads: number, anthropicKey: string
) {
  let discoveredCount = 0;
  let enrichedCount = 0;
  let scoredCount = 0;
  let emailsDrafted = 0;

  // STAGE 1: DISCOVER
  if (!skipDiscovery) {
    await supabase.from("lead_gen_runs").update({ status: "discovering" }).eq("id", runId);
    try {
      const discoverBody: any = {};
      if (config.industry) discoverBody.industry = config.industry;
      if (config.state) discoverBody.state = config.state;

      const resp = await fetch(`${supabaseUrl}/functions/v1/scheduled-discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(discoverBody),
      });
      if (resp.ok) {
        const result = await resp.json();
        discoveredCount = result.saved ?? result.leads_saved ?? 0;
      } else {
        console.error("Discovery failed:", resp.status, await resp.text());
      }
    } catch (err) {
      console.error("Discovery error:", err);
    }
    await supabase.from("lead_gen_runs").update({ discovered_count: discoveredCount }).eq("id", runId);
  }

  // STAGE 2: ENRICH
  await supabase.from("lead_gen_runs").update({ status: "enriching" }).eq("id", runId);

  // Find unenriched leads: status='new', no decision_maker_email, no enrichment activity
  const { data: newLeads } = await supabase
    .from("leads")
    .select("id, company_name, decision_maker_name, decision_maker_email, industry, state, headcount, trigger_event, trigger_type, current_provider")
    .eq("user_id", userId)
    .eq("status", "new")
    .is("decision_maker_email", null)
    .order("created_at", { ascending: false })
    .limit(maxLeads);

  const leadsToEnrich: any[] = [];
  for (const lead of newLeads ?? []) {
    const { count } = await supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id)
      .ilike("description", "Waterfall enrichment completed%");
    if (!count || count === 0) leadsToEnrich.push(lead);
    if (leadsToEnrich.length >= maxLeads) break;
  }

  const enrichedLeadIds: string[] = [];
  for (const lead of leadsToEnrich) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/waterfall-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      if (resp.ok) {
        enrichedCount++;
        enrichedLeadIds.push(lead.id);
      } else {
        console.error(`Enrich failed for ${lead.id}:`, resp.status);
      }
    } catch (err) {
      console.error(`Enrich error for ${lead.id}:`, err);
    }
  }

  await supabase.from("lead_gen_runs").update({ enriched_count: enrichedCount }).eq("id", runId);

  // STAGE 3: SCORE & PRIORITIZE
  await supabase.from("lead_gen_runs").update({ status: "scoring" }).eq("id", runId);

  let qualifiedLeads: any[] = [];
  if (enrichedLeadIds.length > 0) {
    const { data: scores } = await supabase
      .from("lead_scores")
      .select("lead_id, score, grade")
      .in("lead_id", enrichedLeadIds)
      .gte("score", 60)
      .order("score", { ascending: false });

    scoredCount = (scores ?? []).length;

    // Get full lead data for qualified leads
    if (scores && scores.length > 0) {
      const qualifiedIds = scores.map((s: any) => s.lead_id);
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .in("id", qualifiedIds);

      qualifiedLeads = (leads ?? []).map((lead: any) => {
        const scoreData = scores.find((s: any) => s.lead_id === lead.id);
        return { ...lead, score: scoreData?.score, grade: scoreData?.grade };
      });
    }
  }

  await supabase.from("lead_gen_runs").update({ scored_count: scoredCount }).eq("id", runId);

  // STAGE 4: DRAFT OUTREACH
  await supabase.from("lead_gen_runs").update({ status: "drafting" }).eq("id", runId);

  for (const lead of qualifiedLeads) {
    try {
      const emailType = lead.current_provider && lead.current_provider !== "Unknown"
        ? (lead.current_provider === "DIY/None" ? "trigger_based" : "competitor_displacement")
        : "cold_outreach";

      const prompt = buildEmailPrompt(lead, emailType);

      const resp = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          system: EMAIL_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
        }),
      });

      if (!resp.ok) {
        console.error(`Email draft failed for ${lead.id}:`, resp.status);
        continue;
      }

      const result = await resp.json();
      const textBlock = result.content?.find((b: any) => b.type === "text");
      if (!textBlock?.text) continue;

      let emailData: { subject: string; body: string };
      try {
        // Try to parse JSON from the response
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        emailData = JSON.parse(jsonMatch?.[0] ?? textBlock.text);
      } catch {
        // Fallback: use raw text
        emailData = { subject: `Outreach to ${lead.company_name}`, body: textBlock.text };
      }

      await supabase.from("outreach_queue").insert({
        user_id: userId,
        lead_id: lead.id,
        run_id: runId,
        subject: emailData.subject,
        body: emailData.body,
        recipient_email: lead.decision_maker_email,
        recipient_name: lead.decision_maker_name,
        company_name: lead.company_name,
        competitor_detected: lead.current_provider,
        lead_score: lead.score,
        lead_grade: lead.grade,
        email_type: emailType,
        status: "pending_review",
      });

      emailsDrafted++;
    } catch (err) {
      console.error(`Draft error for ${lead.id}:`, err);
    }
  }

  await supabase.from("lead_gen_runs").update({
    emails_drafted: emailsDrafted,
    status: "review_ready",
  }).eq("id", runId);

  // STAGE 5: NOTIFY
  if (emailsDrafted > 0) {
    await supabase.from("agent_recommendations").insert({
      user_id: userId,
      type: "follow_up_due",
      title: `${emailsDrafted} outreach emails ready for review`,
      body: `Lead gen pipeline completed. Discovered ${discoveredCount} leads, enriched ${enrichedCount}, qualified ${scoredCount}, and drafted ${emailsDrafted} personalized outreach emails.\n\nOpen the AI Agent and say "Review outreach" to approve, edit, or skip each email before sending.`,
      priority: 90,
      batch_id: `leadgen-${runId}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  await supabase.from("lead_gen_runs").update({
    status: emailsDrafted > 0 ? "review_ready" : "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
}

function buildEmailPrompt(lead: any, emailType: string): string {
  const parts = [
    `Write a personalized ${emailType.replace(/_/g, " ")} email for:`,
    `Company: ${lead.company_name}`,
    `Contact: ${lead.decision_maker_name ?? "Decision Maker"}`,
    `Title: ${lead.decision_maker_title ?? "Owner/Manager"}`,
    `Industry: ${lead.industry ?? "unknown"}`,
    `Headcount: ${lead.headcount ?? "unknown"}`,
    `State: ${lead.state ?? "unknown"}`,
  ];

  if (lead.trigger_event) parts.push(`Trigger Event: ${lead.trigger_event}`);
  if (lead.trigger_type) parts.push(`Trigger Type: ${lead.trigger_type}`);

  if (lead.current_provider && lead.current_provider !== "Unknown") {
    parts.push(`Current Provider: ${lead.current_provider}`);
    parts.push(`Provider Type: ${lead.provider_type ?? "unknown"}`);
    parts.push(`Displacement Difficulty: ${lead.displacement_difficulty ?? "unknown"}`);
  }

  if (lead.ai_pitch_summary) parts.push(`AI Pitch Summary: ${lead.ai_pitch_summary}`);

  parts.push("\nReturn JSON with subject and body fields only.");
  return parts.join("\n");
}
