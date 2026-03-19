import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/hooks/useUserSettings";
import { startOfQuarter, endOfQuarter, differenceInDays } from "date-fns";

export type PaceStatus = "on_track" | "behind_pace" | "at_risk";

export interface QuotaData {
  quota: number;
  closedWon: number;
  gap: number;
  paceStatus: PaceStatus;
  coverageRatio: number;
  daysRemaining: number;
  percentComplete: number;
  quarterPercent: number;
}

export function useQuotaData() {
  const { data: settings } = useUserSettings();
  const quota = settings?.quarterly_quota ?? 500000;

  return useQuery({
    queryKey: ["quota-data", quota],
    queryFn: async () => {
      const now = new Date();
      const qStart = startOfQuarter(now);
      const qEnd = endOfQuarter(now);
      const totalDays = differenceInDays(qEnd, qStart) + 1;
      const elapsed = differenceInDays(now, qStart) + 1;
      const daysRemaining = Math.max(0, differenceInDays(qEnd, now));
      const quarterPercent = Math.round((elapsed / totalDays) * 100);

      // Closed won in current quarter
      const { data: wonDeals, error: wonErr } = await supabase
        .from("deals")
        .select("value")
        .eq("stage", "closed_won")
        .gte("created_at", qStart.toISOString())
        .lte("created_at", qEnd.toISOString());
      if (wonErr) throw wonErr;
      const closedWon = (wonDeals ?? []).reduce((s, d) => s + (d.value ?? 0), 0);

      // Open pipeline
      const { data: openDeals, error: openErr } = await supabase
        .from("deals")
        .select("value")
        .not("stage", "in", "(closed_won,closed_lost)");
      if (openErr) throw openErr;
      const openPipeline = (openDeals ?? []).reduce((s, d) => s + (d.value ?? 0), 0);

      const gap = Math.max(0, quota - closedWon);
      const coverageRatio = gap > 0 ? openPipeline / gap : openPipeline > 0 ? 99 : 0;
      const percentComplete = quota > 0 ? Math.round((closedWon / quota) * 100) : 0;

      // Pace: expected = quarterPercent% of quota
      const expectedPct = quarterPercent;
      const actualPct = percentComplete;
      const diff = expectedPct - actualPct;

      let paceStatus: PaceStatus = "on_track";
      if (diff > 25) paceStatus = "at_risk";
      else if (diff > 10) paceStatus = "behind_pace";

      return {
        quota,
        closedWon,
        gap,
        paceStatus,
        coverageRatio: Math.round(coverageRatio * 10) / 10,
        daysRemaining,
        percentComplete,
        quarterPercent,
      } as QuotaData;
    },
  });
}
