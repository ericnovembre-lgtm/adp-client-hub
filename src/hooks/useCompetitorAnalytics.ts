import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, differenceInDays } from "date-fns";

interface Filters { range: string; from?: Date; to?: Date }

function getDateBounds(f: Filters) {
  const to = f.to ?? new Date();
  const from = f.range === "custom" ? (f.from ?? startOfDay(subDays(to, 30))) : startOfDay(subDays(to, Number(f.range)));
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface CompetitorRow {
  competitor: string;
  won: number;
  lost: number;
  winRate: number;
  avgDeal: number;
  avgCycle: number;
  revenueWon: number;
}

export function useCompetitorAnalytics(filters: Filters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["competitor-analytics", from, to],
    queryFn: async () => {
      // Get closed deals
      const { data: deals, error: dErr } = await supabase
        .from("deals")
        .select("id, title, stage, value, created_at, closed_at, company_id")
        .in("stage", ["closed_won", "closed_lost"])
        .gte("created_at", from)
        .lte("created_at", to);
      if (dErr) throw dErr;
      if (!deals || deals.length === 0) return { rows: [] as CompetitorRow[], hasData: false };

      // Get companies for name matching
      const companyIds = [...new Set((deals ?? []).filter(d => d.company_id).map(d => d.company_id!))];
      let companyNames = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from("companies").select("id, name").in("id", companyIds);
        for (const c of companies ?? []) companyNames.set(c.id, c.name);
      }

      // Get leads with providers
      const { data: leads } = await supabase.from("leads").select("company_name, current_provider");

      const leadProviders = new Map<string, string>();
      for (const l of leads ?? []) {
        if (l.current_provider) leadProviders.set(l.company_name.toLowerCase(), l.current_provider);
      }

      // Map deals to competitors
      const compMap = new Map<string, { won: number; lost: number; values: number[]; cycles: number[] }>();

      for (const deal of deals ?? []) {
        const companyName = deal.company_id ? companyNames.get(deal.company_id) : null;
        const provider = companyName ? (leadProviders.get(companyName.toLowerCase()) ?? "Unknown") : "Unknown";

        if (!compMap.has(provider)) compMap.set(provider, { won: 0, lost: 0, values: [], cycles: [] });
        const entry = compMap.get(provider)!;

        if (deal.stage === "closed_won") {
          entry.won++;
          entry.values.push(deal.value ?? 0);
        } else {
          entry.lost++;
        }
        if (deal.closed_at && deal.created_at) {
          entry.cycles.push(differenceInDays(new Date(deal.closed_at), new Date(deal.created_at)));
        }
      }

      const rows: CompetitorRow[] = [...compMap.entries()].map(([competitor, d]) => ({
        competitor,
        won: d.won,
        lost: d.lost,
        winRate: d.won + d.lost > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : 0,
        avgDeal: d.values.length > 0 ? Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length) : 0,
        avgCycle: d.cycles.length > 0 ? Math.round(d.cycles.reduce((a, b) => a + b, 0) / d.cycles.length) : 0,
        revenueWon: d.values.reduce((a, b) => a + b, 0),
      })).sort((a, b) => b.revenueWon - a.revenueWon);

      return { rows, hasData: true };
    },
  });
}
