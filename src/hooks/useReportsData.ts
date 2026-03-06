import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export type DateRange = "7" | "30" | "90" | "custom";

interface ReportsFilters {
  range: DateRange;
  from?: Date;
  to?: Date;
}

function getDateBounds(filters: ReportsFilters) {
  const to = filters.to ?? new Date();
  let from: Date;
  if (filters.range === "custom" && filters.from) {
    from = filters.from;
  } else {
    from = startOfDay(subDays(to, Number(filters.range)));
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useLeadFunnel(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);
  return useQuery({
    queryKey: ["reports", "lead-funnel", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("status")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      const total = data.length;
      const contacted = data.filter((l) => l.status === "contacted" || l.status === "qualified" || l.status === "converted").length;
      const qualified = data.filter((l) => l.status === "qualified" || l.status === "converted").length;
      const converted = data.filter((l) => l.status === "converted").length;
      return [
        { stage: "Total Leads", value: total, fill: "hsl(225, 75%, 55%)" },
        { stage: "Contacted", value: contacted, fill: "hsl(220, 70%, 60%)" },
        { stage: "Qualified", value: qualified, fill: "hsl(200, 65%, 50%)" },
        { stage: "Converted", value: converted, fill: "hsl(160, 60%, 45%)" },
      ];
    },
  });
}

export function useDealPipelineValue(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);
  return useQuery({
    queryKey: ["reports", "deal-pipeline", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("stage, value")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
      return stages.map((stage) => ({
        stage: stage.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: data.filter((d) => d.stage === stage).reduce((sum, d) => sum + (d.value ?? 0), 0),
        key: stage,
      }));
    },
  });
}

export function useActivityOverTime(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);
  return useQuery({
    queryKey: ["reports", "activity-time", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("type, created_at")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at");
      if (error) throw error;

      const dayMap = new Map<string, { date: string; call: number; email: number; meeting: number; note: number }>();
      for (const a of data) {
        const day = format(new Date(a.created_at!), "MMM dd");
        if (!dayMap.has(day)) dayMap.set(day, { date: day, call: 0, email: 0, meeting: 0, note: 0 });
        const entry = dayMap.get(day)!;
        if (a.type in entry) (entry as any)[a.type]++;
      }
      return Array.from(dayMap.values());
    },
  });
}

export function useLeadSources(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);
  return useQuery({
    queryKey: ["reports", "lead-sources", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("source")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const l of data) {
        const src = l.source || "unknown";
        counts[src] = (counts[src] || 0) + 1;
      }
      const colors = ["hsl(225, 75%, 55%)", "hsl(160, 60%, 45%)", "hsl(40, 90%, 55%)", "hsl(0, 84%, 60%)"];
      return Object.entries(counts).map(([name, value], i) => ({
        name: name.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
        fill: colors[i % colors.length],
      }));
    },
  });
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ["reports", "monthly-revenue"],
    queryFn: async () => {
      const from12 = startOfMonth(subMonths(new Date(), 11)).toISOString();
      const { data, error } = await supabase
        .from("deals")
        .select("value, expected_close_date")
        .eq("stage", "closed_won")
        .gte("expected_close_date", from12);
      if (error) throw error;

      const months: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        const label = format(m, "MMM yyyy");
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const rev = data
          .filter((d) => {
            if (!d.expected_close_date) return false;
            const dt = new Date(d.expected_close_date);
            return dt >= start && dt <= end;
          })
          .reduce((s, d) => s + (d.value ?? 0), 0);
        months.push({ month: label, revenue: rev });
      }
      return months;
    },
  });
}
