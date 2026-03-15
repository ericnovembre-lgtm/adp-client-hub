import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERRITORY = { MIN: 2, MAX: 20 };
const STALLED_DEAL_DAYS = 14;
const UNCONTACTED_LEAD_DAYS = 3;
const PIPELINE_COVERAGE_TARGET = 3.0;

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function makeBatchId(): string {
  return `brief-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    let userId: string;

    if (authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error } = await authClient.auth.getUser();
      if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      userId = user.id;
    } else {
      userId = "__all__";
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const currentBatch = makeBatchId();
    const now = new Date();

    let userIds: string[] = [];
    if (userId === "__all__") {
      const { data: users } = await supabase.auth.admin.listUsers();
      userIds = (users?.users ?? []).map((u: any) => u.id);
    } else {
      userIds = [userId];
    }

    const summary: Record<string, any> = {};

    for (const uid of userIds) {
      const recs: any[] = [];

      // Expire old recommendations
      await supabase.from("agent_recommendations").update({ dismissed: true, dismissed_at: now.toISOString() }).eq("user_id", uid).eq("dismissed", false).lt("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // CHECK 1: Stalled Deals
      const { data: openDeals } = await supabase.from("deals").select("id, title, stage, value, created_at, contacts(first_name, last_name), companies(name)").not("stage", "in", "(closed_won,closed_lost)").order("value", { ascending: false });
      if (openDeals) {
        for (const deal of openDeals) {
          const { data: lastActivity } = await supabase.from("activities").select("created_at").eq("deal_id", deal.id).order("created_at", { ascending: false }).limit(1);
          const lastTouch = lastActivity?.[0]?.created_at ? new Date(lastActivity[0].created_at) : new Date(deal.created_at);
          const staleDays = daysBetween(lastTouch, now);
          if (staleDays >= STALLED_DEAL_DAYS) {
            const valueStr = deal.value ? `$${Number(deal.value).toLocaleString()}` : "unknown value";
            const companyName = (deal as any).companies?.name || "no company";
            const contactName = (deal as any).contacts ? `${(deal as any).contacts.first_name} ${(deal as any).contacts.last_name}` : "the contact";
            recs.push({ user_id: uid, type: "stalled_deal", title: `Deal stalled: ${deal.title}`, body: `**${deal.title}** (${companyName}) has had no activity for **${staleDays} days**. Stage: ${deal.stage}, Value: ${valueStr}.\n\nSuggested action: Call ${contactName} to re-engage, or update the stage if the deal has changed status.`, entity_type: "deal", entity_id: deal.id, priority: Math.min(90, 50 + staleDays), batch_id: currentBatch, expires_at: expiresAt });
          }
        }
      }

      // CHECK 2: Overdue Tasks
      const todayStr = now.toISOString().slice(0, 10);
      const { data: overdueTasks } = await supabase.from("tasks").select("id, title, due_date, priority, status").lt("due_date", todayStr).neq("status", "completed").order("due_date", { ascending: true });
      if (overdueTasks) {
        for (const task of overdueTasks) {
          const overdueDays = daysBetween(new Date(task.due_date), now);
          const priorityScore = task.priority === "high" ? 85 : task.priority === "medium" ? 70 : 55;
          recs.push({ user_id: uid, type: "overdue_task", title: `Overdue: ${task.title}`, body: `Task "**${task.title}**" was due **${overdueDays} day${overdueDays !== 1 ? "s" : ""} ago** (${task.due_date}). Priority: ${task.priority || "normal"}.\n\nComplete it today or reschedule if priorities have shifted.`, entity_type: "task", entity_id: task.id, priority: priorityScore, batch_id: currentBatch, expires_at: expiresAt });
        }
      }

      // CHECK 3: Uncontacted New Leads
      const threeDaysAgo = new Date(now.getTime() - UNCONTACTED_LEAD_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: newLeads } = await supabase.from("leads").select("id, company_name, decision_maker_name, trigger_type, ai_pitch_summary, headcount, created_at").eq("status", "new").lt("created_at", threeDaysAgo).order("created_at", { ascending: true });
      if (newLeads) {
        for (const lead of newLeads) {
          const { count } = await supabase.from("activities").select("id", { count: "exact", head: true }).eq("lead_id", lead.id);
          if (!count || count === 0) {
            const ageDays = daysBetween(new Date(lead.created_at), now);
            recs.push({ user_id: uid, type: "uncontacted_lead", title: `Uncontacted: ${lead.company_name}`, body: `**${lead.company_name}** has been sitting in "new" status for **${ageDays} days** with zero outreach.\n\nDecision maker: ${lead.decision_maker_name || "unknown"}\nTrigger: ${lead.trigger_type || "none"}\nHeadcount: ${lead.headcount || "unknown"}`, entity_type: "lead", entity_id: lead.id, priority: Math.min(80, 55 + ageDays * 2), batch_id: currentBatch, expires_at: expiresAt });
          }
        }
      }

      // CHECK 4: Territory Violations
      const { data: violations } = await supabase.from("leads").select("id, company_name, headcount, status").not("status", "eq", "disqualified").not("headcount", "is", null).or(`headcount.lt.${TERRITORY.MIN},headcount.gt.${TERRITORY.MAX}`);
      if (violations) {
        for (const lead of violations) {
          const direction = (lead.headcount ?? 0) < TERRITORY.MIN ? "below" : "above";
          recs.push({ user_id: uid, type: "territory_violation", title: `Territory violation: ${lead.company_name}`, body: `**${lead.company_name}** has **${lead.headcount} employees**, which is ${direction} your Down Market territory range (${TERRITORY.MIN}–${TERRITORY.MAX}).\n\nConsider disqualifying this lead or updating headcount if the data is stale.`, entity_type: "lead", entity_id: lead.id, priority: 75, batch_id: currentBatch, expires_at: expiresAt });
        }
      }

      // CHECK 5: Pipeline Coverage Gap
      const { data: settingsRow } = await supabase.from("user_settings").select("settings").eq("user_id", uid).maybeSingle();
      const settings = (settingsRow?.settings as Record<string, any>) ?? {};
      const quarterlyQuota = settings.quarterly_quota ?? 500000;
      const { data: pipelineDeals } = await supabase.from("deals").select("value").not("stage", "in", "(closed_won,closed_lost)");
      const totalPipeline = (pipelineDeals ?? []).reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);
      const coverage = quarterlyQuota > 0 ? totalPipeline / quarterlyQuota : 0;
      if (coverage < PIPELINE_COVERAGE_TARGET) {
        recs.push({ user_id: uid, type: "pipeline_gap", title: `Pipeline coverage: ${coverage.toFixed(1)}x (target: ${PIPELINE_COVERAGE_TARGET}x)`, body: `Your open pipeline is **$${totalPipeline.toLocaleString()}** against a quarterly target of **$${quarterlyQuota.toLocaleString()}**. That's **${coverage.toFixed(1)}x coverage** — below the recommended ${PIPELINE_COVERAGE_TARGET}x.\n\nRun AI Discovery to generate new leads, or convert existing qualified leads to deals.`, entity_type: null, entity_id: null, priority: coverage < 1.0 ? 95 : coverage < 2.0 ? 80 : 60, batch_id: currentBatch, expires_at: expiresAt });
      }

      // CHECK 6: Follow-ups Due Today
      const { data: todayTasks } = await supabase.from("tasks").select("id, title, priority, status").eq("due_date", todayStr).neq("status", "completed");
      if (todayTasks && todayTasks.length > 0) {
        const taskList = todayTasks.map((t: any) => `- ${t.title} (${t.priority || "normal"} priority)`).join("\n");
        recs.push({ user_id: uid, type: "follow_up_due", title: `${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} due today`, body: `You have **${todayTasks.length}** task${todayTasks.length !== 1 ? "s" : ""} due today:\n\n${taskList}`, entity_type: null, entity_id: null, priority: 65, batch_id: currentBatch, expires_at: expiresAt });
      }

      // WRITE RECOMMENDATIONS
      if (recs.length > 0) {
        const { error: insertErr } = await supabase.from("agent_recommendations").insert(recs);
        if (insertErr) console.error(`Failed to insert recs for user ${uid}:`, insertErr.message);
      }

      summary[uid] = {
        total: recs.length,
        stalled_deals: recs.filter((r) => r.type === "stalled_deal").length,
        overdue_tasks: recs.filter((r) => r.type === "overdue_task").length,
        uncontacted_leads: recs.filter((r) => r.type === "uncontacted_lead").length,
        territory_violations: recs.filter((r) => r.type === "territory_violation").length,
        pipeline_gaps: recs.filter((r) => r.type === "pipeline_gap").length,
        follow_ups: recs.filter((r) => r.type === "follow_up_due").length,
      };
    }

    return new Response(JSON.stringify({ success: true, batch_id: currentBatch, users_processed: userIds.length, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("agent-daily-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
