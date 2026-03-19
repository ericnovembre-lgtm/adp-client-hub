import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, subDays, startOfDay } from "date-fns";

interface VelocityFilters {
  range: string;
  from?: Date;
  to?: Date;
}

function getDateBounds(f: VelocityFilters) {
  const to = f.to ?? new Date();
  const from = f.range === "custom" ? (f.from ?? startOfDay(subDays(to, 30))) : startOfDay(subDays(to, Number(f.range)));
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface StageVelocity { stage: string; avgDays: number }
export interface SlowestDeal { id: string; title: string; stage: string; value: number; ageDays: number; lastActivity: string | null }

export function useDealVelocity(filters: VelocityFilters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["deal-velocity", from, to],
    queryFn: async () => {
      // Get all deals
      const { data: deals, error: dErr } = await supabase.from("deals").select("id, title, stage, value, created_at, closed_at");
      if (dErr) throw dErr;

      // Get stage_change activities
      const { data: activities, error: aErr } = await supabase
        .from("activities")
        .select("deal_id, description, created_at")
        .eq("type", "stage_change")
        .not("deal_id", "is", null)
        .order("created_at", { ascending: true });
      if (aErr) throw aErr;

      // Group activities by deal
      const dealActivities = new Map<string, { stage: string; at: Date }[]>();
      for (const a of activities ?? []) {
        if (!a.deal_id) continue;
        // Parse "Stage changed from X to Y"
        const match = a.description.match(/to\s+(\w+)/i);
        if (!match) continue;
        if (!dealActivities.has(a.deal_id)) dealActivities.set(a.deal_id, []);
        dealActivities.get(a.deal_id)!.push({ stage: match[1].toLowerCase(), at: new Date(a.created_at!) });
      }

      // Calculate avg days per stage
      const stageDurations: Record<string, number[]> = {};
      const stages = ["lead", "qualified", "proposal", "negotiation"];
      stages.forEach(s => stageDurations[s] = []);

      for (const deal of deals ?? []) {
        const changes = dealActivities.get(deal.id);
        if (!changes || changes.length === 0) continue;
        // Include creation as first stage
        const timeline = [{ stage: deal.stage === "lead" ? "lead" : "lead", at: new Date(deal.created_at!) }, ...changes];
        for (let i = 0; i < timeline.length - 1; i++) {
          const days = differenceInDays(timeline[i + 1].at, timeline[i].at);
          const s = timeline[i].stage;
          if (s in stageDurations) stageDurations[s].push(Math.max(0, days));
        }
      }

      const stageVelocity: StageVelocity[] = stages.map(s => ({
        stage: s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
        avgDays: stageDurations[s].length > 0 ? Math.round(stageDurations[s].reduce((a, b) => a + b, 0) / stageDurations[s].length) : 0,
      }));

      // Avg days to close (won / lost)
      const wonDeals = (deals ?? []).filter(d => d.stage === "closed_won" && d.closed_at);
      const lostDeals = (deals ?? []).filter(d => d.stage === "closed_lost" && d.closed_at);
      const avgWon = wonDeals.length > 0 ? Math.round(wonDeals.reduce((s, d) => s + differenceInDays(new Date(d.closed_at!), new Date(d.created_at!)), 0) / wonDeals.length) : 0;
      const avgLost = lostDeals.length > 0 ? Math.round(lostDeals.reduce((s, d) => s + differenceInDays(new Date(d.closed_at!), new Date(d.created_at!)), 0) / lostDeals.length) : 0;

      // Top 5 slowest open deals
      const now = new Date();
      const openDeals = (deals ?? [])
        .filter(d => d.stage && !["closed_won", "closed_lost"].includes(d.stage))
        .map(d => {
          const lastAct = (activities ?? []).filter(a => a.deal_id === d.id).pop();
          return {
            id: d.id,
            title: d.title,
            stage: (d.stage ?? "lead").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
            value: d.value ?? 0,
            ageDays: differenceInDays(now, new Date(d.created_at!)),
            lastActivity: lastAct?.created_at ?? null,
          } as SlowestDeal;
        })
        .sort((a, b) => b.ageDays - a.ageDays)
        .slice(0, 5);

      const hasData = (activities ?? []).length > 0;

      return { stageVelocity, avgWon, avgLost, slowestDeals: openDeals, hasData };
    },
  });
}
