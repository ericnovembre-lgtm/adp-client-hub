import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format } from "date-fns";

interface Filters { range: string; from?: Date; to?: Date }

function getDateBounds(f: Filters) {
  const to = f.to ?? new Date();
  const from = f.range === "custom" ? (f.from ?? startOfDay(subDays(to, 30))) : startOfDay(subDays(to, Number(f.range)));
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface DailyEmail { date: string; sent: number; openRate: number }

export interface OutreachData {
  totalSent: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  dailyData: DailyEmail[];
  drafted: number;
  approvedRate: number;
  hasData: boolean;
}

export function useOutreachMetrics(filters: Filters) {
  const { from, to } = getDateBounds(filters);

  return useQuery({
    queryKey: ["outreach-metrics", from, to],
    queryFn: async () => {
      const { data: emails, error: eErr } = await supabase
        .from("email_send_log")
        .select("message_id, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (eErr) throw eErr;
      if (!emails || emails.length === 0) return { totalSent: 0, openRate: 0, clickRate: 0, replyRate: 0, dailyData: [], drafted: 0, approvedRate: 0, hasData: false } as OutreachData;

      const messageIds = emails.filter(e => e.message_id).map(e => e.message_id!);

      let opens = 0, clicks = 0;
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from("email_tracking_events")
          .select("message_id, event_type")
          .in("message_id", messageIds.slice(0, 500));

        const openSet = new Set<string>();
        const clickSet = new Set<string>();
        for (const ev of events ?? []) {
          if (ev.event_type === "open") openSet.add(ev.message_id);
          if (ev.event_type === "click") clickSet.add(ev.message_id);
        }
        opens = openSet.size;
        clicks = clickSet.size;
      }

      const totalSent = emails.length;
      const openRate = totalSent > 0 ? Math.round((opens / totalSent) * 100) : 0;
      const clickRate = totalSent > 0 ? Math.round((clicks / totalSent) * 100) : 0;

      // Daily breakdown
      const dayMap = new Map<string, { sent: number; opened: number }>();
      for (const e of emails) {
        const day = format(new Date(e.created_at!), "MMM dd");
        if (!dayMap.has(day)) dayMap.set(day, { sent: 0, opened: 0 });
        dayMap.get(day)!.sent++;
      }
      const dailyData: DailyEmail[] = [...dayMap.entries()].map(([date, d]) => ({
        date, sent: d.sent, openRate: 0,
      }));

      // Outreach queue stats
      const { data: queue } = await supabase
        .from("outreach_queue")
        .select("status")
        .gte("created_at", from)
        .lte("created_at", to);
      const drafted = (queue ?? []).length;
      const approved = (queue ?? []).filter(q => q.status === "approved" || q.status === "sent").length;
      const approvedRate = drafted > 0 ? Math.round((approved / drafted) * 100) : 0;

      return { totalSent, openRate, clickRate, replyRate: 0, dailyData, drafted, approvedRate, hasData: true } as OutreachData;
    },
  });
}
