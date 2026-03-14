import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";

export interface StatItem {
  value: number;
  previousValue: number;
  trend: number;
  isPositive: boolean;
}

export interface DashboardStats {
  totalLeads: StatItem;
  activeDeals: StatItem;
  totalRevenue: StatItem;
  tasksDueToday: StatItem;
}

function computeTrend(current: number, previous: number): { trend: number; isPositive: boolean } {
  if (previous === 0) return { trend: current > 0 ? 100 : 0, isPositive: current >= 0 };
  const trend = Math.round(((current - previous) / previous) * 100);
  return { trend: Math.abs(trend), isPositive: trend >= 0 };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const _thisMonthStart = startOfMonth(now).toISOString();
      const _thisMonthEnd = endOfMonth(now).toISOString();
      const lastMonth = subMonths(now, 1);
      const lastMonthEnd = endOfMonth(lastMonth).toISOString();
      const sameDayLastMonth = subMonths(now, 1);
      const sameDayLastMonthStart = startOfDay(sameDayLastMonth).toISOString();
      const sameDayLastMonthEnd = endOfDay(sameDayLastMonth).toISOString();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();

      const [
        leadsNow, leadsPrev,
        dealsNow, dealsPrev,
        revenueNow, revenuePrev,
        tasksNow, tasksPrev,
      ] = await Promise.all([
        // Leads count (status != dismissed)
        supabase.from("leads").select("id", { count: "exact", head: true }).neq("status", "dismissed"),
        supabase.from("leads").select("id", { count: "exact", head: true }).neq("status", "dismissed").lte("created_at", lastMonthEnd),

        // Active deals (stage not closed)
        supabase.from("deals").select("id", { count: "exact", head: true }).not("stage", "in", "(closed_won,closed_lost)"),
        supabase.from("deals").select("id", { count: "exact", head: true }).not("stage", "in", "(closed_won,closed_lost)").lte("created_at", lastMonthEnd),

        // Revenue (closed_won deals)
        supabase.from("deals").select("value").eq("stage", "closed_won"),
        supabase.from("deals").select("value").eq("stage", "closed_won").lte("created_at", lastMonthEnd),

        // Tasks due today
        supabase.from("tasks").select("id", { count: "exact", head: true }).gte("due_date", todayStart).lte("due_date", todayEnd).neq("status", "completed"),
        // Tasks that were due "today" last month — approximate by counting tasks due in last month
        supabase.from("tasks").select("id", { count: "exact", head: true }).gte("due_date", lastMonthStart).lte("due_date", lastMonthEnd).neq("status", "completed"),
      ]);

      const revNowTotal = (revenueNow.data ?? []).reduce((s, d) => s + (d.value ?? 0), 0);
      const revPrevTotal = (revenuePrev.data ?? []).reduce((s, d) => s + (d.value ?? 0), 0);

      const leadsCount = leadsNow.count ?? 0;
      const leadsPrevCount = leadsPrev.count ?? 0;
      const dealsCount = dealsNow.count ?? 0;
      const dealsPrevCount = dealsPrev.count ?? 0;
      const tasksCount = tasksNow.count ?? 0;
      const tasksPrevCount = tasksPrev.count ?? 0;

      return {
        totalLeads: { value: leadsCount, previousValue: leadsPrevCount, ...computeTrend(leadsCount, leadsPrevCount) },
        activeDeals: { value: dealsCount, previousValue: dealsPrevCount, ...computeTrend(dealsCount, dealsPrevCount) },
        totalRevenue: { value: revNowTotal, previousValue: revPrevTotal, ...computeTrend(revNowTotal, revPrevTotal) },
        tasksDueToday: { value: tasksCount, previousValue: tasksPrevCount, ...computeTrend(tasksCount, tasksPrevCount) },
      } as DashboardStats;
    },
    staleTime: 30_000,
  });
}

export function usePipelineData() {
  return useQuery({
    queryKey: ["dashboard-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("stage");
      if (error) throw error;

      const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
      const counts: Record<string, number> = {};
      stages.forEach((s) => (counts[s] = 0));
      (data ?? []).forEach((d) => {
        const s = d.stage ?? "lead";
        if (s in counts) counts[s]++;
        else counts[s] = (counts[s] ?? 0) + 1;
      });

      return stages.map((stage) => ({
        stage: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: counts[stage],
      }));
    },
    staleTime: 30_000,
  });
}
