import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInDays } from "date-fns";
import { useUserSettings } from "@/hooks/useUserSettings";

export type DateRange = "7" | "30" | "90" | "custom";

export interface ReportsFilters {
  range: DateRange;
  from?: Date;
  to?: Date;
}

function getDateBounds(filters: ReportsFilters) {
  const to = filters.to ?? new Date();
  let from: Date;
  if (filters.range === "custom") {
    from = filters.from ?? startOfDay(subDays(to, 30));
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

      const dayMap = new Map<string, { date: string; [key: string]: string | number }>();
      for (const a of data) {
        const day = format(new Date(a.created_at!), "MMM dd");
        if (!dayMap.has(day)) dayMap.set(day, { date: day, call: 0, email: 0, meeting: 0, note: 0 });
        const entry = dayMap.get(day)!;
        if (a.type in entry) (entry[a.type] as number)++;
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
      const { data, error } = await supabase
        .from("deals")
        .select("value, expected_close_date, closed_at")
        .eq("stage", "closed_won");
      if (error) throw error;

      const months: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        const label = format(m, "MMM yyyy");
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const rev = data
          .filter((d) => {
            const dateStr = d.closed_at ?? d.expected_close_date;
            if (!dateStr) return false;
            const dt = new Date(dateStr);
            return dt >= start && dt <= end;
          })
          .reduce((s, d) => s + (d.value ?? 0), 0);
        months.push({ month: label, revenue: rev });
      }
      return months;
    },
  });
}

// ─── MODULE 1: Quota Attainment Report ───
export function useQuotaAttainment(filters?: ReportsFilters) {
  const { data: settings } = useUserSettings();
  const quota = settings?.quarterly_quota ?? 500000;
  const bounds = filters ? getDateBounds(filters) : null;

  return useQuery({
    queryKey: ["reports", "quota-attainment", quota, bounds?.from, bounds?.to],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("value, closed_at, created_at")
        .eq("stage", "closed_won");
      if (bounds) {
        query = query.gte("closed_at", bounds.from).lte("closed_at", bounds.to);
      }
      const { data: wonDeals, error } = await query;
      if (error) throw error;

      const now = new Date();
      const quarters: { label: string; quota: number; closed: number; attainment: number; qStart: Date; qEnd: Date }[] = [];

      for (let i = 3; i >= 0; i--) {
        const refDate = subMonths(now, i * 3);
        const qStart = startOfQuarter(refDate);
        const qEnd = endOfQuarter(refDate);
        const label = `Q${Math.ceil((qStart.getMonth() + 1) / 3)} ${qStart.getFullYear()}`;

        const closed = (wonDeals ?? [])
          .filter((d) => {
            const dt = new Date(d.closed_at ?? d.created_at!);
            return dt >= qStart && dt <= qEnd;
          })
          .reduce((s, d) => s + (d.value ?? 0), 0);

        quarters.push({
          label,
          quota,
          closed,
          attainment: quota > 0 ? Math.round((closed / quota) * 100) : 0,
          qStart,
          qEnd,
        });
      }

      // Monthly breakdown for current quarter
      const cqStart = startOfQuarter(now);
      const monthly: { month: string; closed: number; target: number }[] = [];
      const monthlyTarget = Math.round(quota / 3);

      for (let i = 0; i < 3; i++) {
        const mStart = startOfMonth(subMonths(cqStart, -i));
        const mEnd = endOfMonth(mStart);
        const mLabel = format(mStart, "MMM");
        const mClosed = (wonDeals ?? [])
          .filter((d) => {
            const dt = new Date(d.closed_at ?? d.created_at!);
            return dt >= mStart && dt <= mEnd;
          })
          .reduce((s, d) => s + (d.value ?? 0), 0);
        monthly.push({ month: mLabel, closed: mClosed, target: monthlyTarget });
      }

      return { quarters, monthly, quota };
    },
  });
}

// ─── MODULE 2: Pipeline Velocity Report ───
export function usePipelineVelocity(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["reports", "pipeline-velocity", from, to],
    queryFn: async () => {
      const { data: deals, error: dErr } = await supabase
        .from("deals")
        .select("id, stage, value, created_at, closed_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (dErr) throw dErr;

      const allDeals = deals ?? [];
      const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won"];
      const total = allDeals.length;

      // Stage conversion rates
      const stageCounts = stages.map((s) => allDeals.filter((d) => {
        const stageOrder = stages.indexOf(d.stage ?? "lead");
        return stageOrder >= stages.indexOf(s);
      }).length);

      const conversions = stages.map((s, i) => ({
        stage: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: stageCounts[i],
        rate: total > 0 ? Math.round((stageCounts[i] / total) * 100) : 0,
        key: s,
      }));

      // Avg days to close
      const wonDeals = allDeals.filter((d) => d.stage === "closed_won" && d.closed_at);
      const avgDaysToClose = wonDeals.length > 0
        ? Math.round(wonDeals.reduce((s, d) => s + differenceInDays(new Date(d.closed_at!), new Date(d.created_at!)), 0) / wonDeals.length)
        : 0;

      // Win rate
      const closedDeals = allDeals.filter((d) => d.stage === "closed_won" || d.stage === "closed_lost");
      const winRate = closedDeals.length > 0
        ? Math.round((allDeals.filter((d) => d.stage === "closed_won").length / closedDeals.length) * 100)
        : 0;

      // Pipeline value by stage
      const pipelineByStage = ["lead", "qualified", "proposal", "negotiation"].map((s) => ({
        stage: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: allDeals.filter((d) => d.stage === s).reduce((sum, d) => sum + (d.value ?? 0), 0),
        count: allDeals.filter((d) => d.stage === s).length,
        key: s,
      }));

      return { conversions, avgDaysToClose, winRate, pipelineByStage, totalDeals: total };
    },
  });
}

// ─── MODULE 3: Activity Summary ───
export function useActivitySummary(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["reports", "activity-summary", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("type, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;

      const types = ["call", "email", "meeting", "note"];
      const typeCounts = types.map((t) => ({
        type: t.replace(/\b\w/g, (c) => c.toUpperCase()),
        count: data.filter((a) => a.type === t).length,
        key: t,
      }));

      const total = data.length;

      // Weekly breakdown
      const weekMap = new Map<string, Record<string, number>>();
      for (const a of data) {
        const week = format(new Date(a.created_at!), "'W'w yyyy");
        if (!weekMap.has(week)) weekMap.set(week, { call: 0, email: 0, meeting: 0, note: 0 });
        const entry = weekMap.get(week)!;
        if (a.type in entry) entry[a.type]++;
      }

      const weekly = Array.from(weekMap.entries()).map(([week, counts]) => ({
        week,
        ...counts,
        total: Object.values(counts).reduce((s, v) => s + v, 0),
      }));

      // Avg per day
      const rangeDays = Math.max(1, differenceInDays(new Date(to), new Date(from)));
      const avgPerDay = Math.round((total / rangeDays) * 10) / 10;

      return { typeCounts, total, weekly, avgPerDay };
    },
  });
}

// ─── MODULE 4: Revenue Forecast ───
const STAGE_WEIGHTS: Record<string, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
};

export function useRevenueForecast() {
  return useQuery({
    queryKey: ["reports", "revenue-forecast"],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from("deals")
        .select("stage, value, expected_close_date")
        .not("stage", "in", "(closed_won,closed_lost)");
      if (error) throw error;

      const openDeals = deals ?? [];
      const totalUnweighted = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
      const totalWeighted = openDeals.reduce((s, d) => {
        const weight = STAGE_WEIGHTS[d.stage ?? "lead"] ?? 0.1;
        return s + (d.value ?? 0) * weight;
      }, 0);

      // By stage
      const byStage = Object.keys(STAGE_WEIGHTS).map((s) => {
        const stageDeals = openDeals.filter((d) => d.stage === s);
        const raw = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
        return {
          stage: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          raw,
          weighted: Math.round(raw * STAGE_WEIGHTS[s]),
          count: stageDeals.length,
          key: s,
        };
      });

      // Monthly forecast (by expected_close_date)
      const now = new Date();
      const monthlyForecast: { month: string; forecast: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const m = subMonths(now, -i);
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const label = format(m, "MMM yyyy");
        const fc = openDeals
          .filter((d) => {
            if (!d.expected_close_date) return false;
            const dt = new Date(d.expected_close_date);
            return dt >= mStart && dt <= mEnd;
          })
          .reduce((s, d) => {
            const weight = STAGE_WEIGHTS[d.stage ?? "lead"] ?? 0.1;
            return s + (d.value ?? 0) * weight;
          }, 0);
        monthlyForecast.push({ month: label, forecast: Math.round(fc) });
      }

      return {
        totalUnweighted: Math.round(totalUnweighted),
        totalWeighted: Math.round(totalWeighted),
        byStage,
        monthlyForecast,
        dealCount: openDeals.length,
      };
    },
  });
}

// ─── MODULE 5: Lead Source ROI ───
export function useLeadSourceROI(filters: ReportsFilters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["reports", "lead-source-roi", from, to],
    queryFn: async () => {
      // Get leads with source
      const { data: leads, error: lErr } = await supabase
        .from("leads")
        .select("id, source, status")
        .gte("created_at", from)
        .lte("created_at", to);
      if (lErr) throw lErr;

      // Get deals with value for conversion revenue tracking
      const { data: deals, error: dErr } = await supabase
        .from("deals")
        .select("value, stage, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (dErr) throw dErr;

      const sources = new Map<string, { total: number; qualified: number; converted: number; dismissed: number }>();

      for (const l of leads ?? []) {
        const src = l.source || "unknown";
        if (!sources.has(src)) sources.set(src, { total: 0, qualified: 0, converted: 0, dismissed: 0 });
        const entry = sources.get(src)!;
        entry.total++;
        if (l.status === "qualified" || l.status === "converted") entry.qualified++;
        if (l.status === "converted") entry.converted++;
        if (l.status === "dismissed") entry.dismissed++;
      }

      const colors = [
        "hsl(225, 75%, 55%)", "hsl(160, 60%, 45%)", "hsl(40, 90%, 55%)",
        "hsl(280, 60%, 55%)", "hsl(0, 84%, 60%)", "hsl(200, 65%, 50%)",
      ];

      const rows = Array.from(sources.entries())
        .map(([source, counts], i) => ({
          source: source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          ...counts,
          qualifyRate: counts.total > 0 ? Math.round((counts.qualified / counts.total) * 100) : 0,
          convertRate: counts.total > 0 ? Math.round((counts.converted / counts.total) * 100) : 0,
          fill: colors[i % colors.length],
        }))
        .sort((a, b) => b.total - a.total);

      // Total deals revenue for context
      const totalWonRevenue = (deals ?? [])
        .filter((d) => d.stage === "closed_won")
        .reduce((s, d) => s + (d.value ?? 0), 0);

      return { rows, totalWonRevenue, totalLeads: (leads ?? []).length };
    },
  });
}
