import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format, getDay, getHours } from "date-fns";

interface Filters { range: string; from?: Date; to?: Date }

function getDateBounds(f: Filters) {
  const to = f.to ?? new Date();
  const from = f.range === "custom"
    ? (f.from ?? startOfDay(subDays(to, 30)))
    : startOfDay(subDays(to, Number(f.range)));
  return { from: from.toISOString(), to: to.toISOString() };
}

const COMPETITOR_KEYWORDS: Record<string, string[]> = {
  QuickBooks: ["quickbooks", "compliance", "hr protection", "intuit"],
  Gusto: ["gusto", "benefits", "modern payroll"],
  Paychex: ["paychex", "payroll provider"],
  Justworks: ["justworks", "reporting", "dedicated account"],
  "DIY/Manual": ["spreadsheet", "manual", "diy", "in-house"],
  TriNet: ["trinet"],
  Insperity: ["insperity"],
};

function detectCompetitor(subject: string): string | null {
  const lower = (subject ?? "").toLowerCase();
  for (const [name, kws] of Object.entries(COMPETITOR_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return name;
  }
  return null;
}

function detectEmailType(subject: string): string {
  const lower = (subject ?? "").toLowerCase();
  if (lower.includes("following up") || lower.includes("checking in") || lower.includes("follow up")) return "follow_up";
  if (lower.includes("intro") || lower.includes("reaching out") || lower.includes("hello")) return "cold_outreach";
  if (detectCompetitor(subject)) return "competitor_displacement";
  return "other";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface OverallMetrics {
  totalSent: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  replyRate: number;
  replies: number;
}

export interface DailyMetric { date: string; sent: number; opens: number; clicks: number; openRate: number }
export interface CompetitorMetric { competitor: string; sent: number; opens: number; clicks: number; openRate: number; clickRate: number }
export interface SubjectMetric { subject: string; sent: number; opens: number; openRate: number; clicks: number; clickRate: number }
export interface TimeSlot { day: number; dayName: string; hour: number; sent: number; opens: number; openRate: number }

export function useOutreachAnalytics(filters: Filters) {
  const { from, to } = getDateBounds(filters);

  const overall = useQuery({
    queryKey: ["outreach-analytics-overall", from, to],
    queryFn: async (): Promise<OverallMetrics> => {
      const { data: emails, error } = await supabase
        .from("email_send_log")
        .select("message_id, contact_id, created_at")
        .eq("status", "sent")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      const totalSent = emails?.length ?? 0;
      if (totalSent === 0) return { totalSent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0, clickToOpenRate: 0, replyRate: 0, replies: 0 };

      const messageIds = emails!.filter(e => e.message_id).map(e => e.message_id!);
      let uniqueOpens = 0, uniqueClicks = 0;
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
        uniqueOpens = openSet.size;
        uniqueClicks = clickSet.size;
      }

      // Replies: activities with type email/call linked to same contact within 7 days
      const contactIds = [...new Set(emails!.filter(e => e.contact_id).map(e => e.contact_id!))];
      let replies = 0;
      if (contactIds.length > 0) {
        const { data: acts } = await supabase
          .from("activities")
          .select("contact_id, created_at, type")
          .in("contact_id", contactIds.slice(0, 200))
          .in("type", ["email", "call"])
          .gte("created_at", from);
        replies = acts?.length ?? 0;
      }

      const openRate = Math.round((uniqueOpens / totalSent) * 100);
      const clickRate = Math.round((uniqueClicks / totalSent) * 100);
      const clickToOpenRate = uniqueOpens > 0 ? Math.round((uniqueClicks / uniqueOpens) * 100) : 0;
      const replyRate = Math.round((replies / totalSent) * 100);
      return { totalSent, uniqueOpens, uniqueClicks, openRate, clickRate, clickToOpenRate, replyRate, replies };
    },
  });

  const timeSeries = useQuery({
    queryKey: ["outreach-analytics-timeseries", from, to],
    queryFn: async (): Promise<DailyMetric[]> => {
      const { data: emails } = await supabase
        .from("email_send_log")
        .select("message_id, created_at")
        .eq("status", "sent")
        .gte("created_at", from)
        .lte("created_at", to);
      if (!emails?.length) return [];

      const messageIds = emails.filter(e => e.message_id).map(e => e.message_id!);
      const openSet = new Set<string>();
      const clickSet = new Set<string>();
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from("email_tracking_events")
          .select("message_id, event_type")
          .in("message_id", messageIds.slice(0, 500));
        for (const ev of events ?? []) {
          if (ev.event_type === "open") openSet.add(ev.message_id);
          if (ev.event_type === "click") clickSet.add(ev.message_id);
        }
      }

      // Build a map: message_id → date
      const msgDateMap = new Map<string, string>();
      const dayMap = new Map<string, { sent: number; opens: number; clicks: number }>();
      for (const e of emails) {
        const day = format(new Date(e.created_at!), "MMM dd");
        if (e.message_id) msgDateMap.set(e.message_id, day);
        if (!dayMap.has(day)) dayMap.set(day, { sent: 0, opens: 0, clicks: 0 });
        dayMap.get(day)!.sent++;
      }
      for (const mid of openSet) {
        const day = msgDateMap.get(mid);
        if (day && dayMap.has(day)) dayMap.get(day)!.opens++;
      }
      for (const mid of clickSet) {
        const day = msgDateMap.get(mid);
        if (day && dayMap.has(day)) dayMap.get(day)!.clicks++;
      }
      return [...dayMap.entries()].map(([date, d]) => ({
        date,
        sent: d.sent,
        opens: d.opens,
        clicks: d.clicks,
        openRate: d.sent > 0 ? Math.round((d.opens / d.sent) * 100) : 0,
      }));
    },
  });

  const competitorPerformance = useQuery({
    queryKey: ["outreach-analytics-competitor", from, to],
    queryFn: async (): Promise<CompetitorMetric[]> => {
      const { data: emails } = await supabase
        .from("email_send_log")
        .select("message_id, subject, created_at")
        .eq("status", "sent")
        .gte("created_at", from)
        .lte("created_at", to);
      if (!emails?.length) return [];

      // Try outreach_queue first for competitor_detected
      const { data: queue } = await supabase
        .from("outreach_queue")
        .select("subject, competitor_detected")
        .gte("created_at", from)
        .lte("created_at", to);

      const queueMap = new Map<string, string>();
      for (const q of queue ?? []) {
        if (q.competitor_detected && q.subject) queueMap.set(q.subject, q.competitor_detected);
      }

      const messageIds = emails.filter(e => e.message_id).map(e => e.message_id!);
      const openSet = new Set<string>();
      const clickSet = new Set<string>();
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from("email_tracking_events")
          .select("message_id, event_type")
          .in("message_id", messageIds.slice(0, 500));
        for (const ev of events ?? []) {
          if (ev.event_type === "open") openSet.add(ev.message_id);
          if (ev.event_type === "click") clickSet.add(ev.message_id);
        }
      }

      const compMap = new Map<string, { sent: number; opens: number; clicks: number }>();
      for (const e of emails) {
        const comp = queueMap.get(e.subject ?? "") ?? detectCompetitor(e.subject ?? "") ?? "No Angle";
        if (!compMap.has(comp)) compMap.set(comp, { sent: 0, opens: 0, clicks: 0 });
        compMap.get(comp)!.sent++;
        if (e.message_id && openSet.has(e.message_id)) compMap.get(comp)!.opens++;
        if (e.message_id && clickSet.has(e.message_id)) compMap.get(comp)!.clicks++;
      }
      return [...compMap.entries()]
        .map(([competitor, d]) => ({
          competitor,
          sent: d.sent,
          opens: d.opens,
          clicks: d.clicks,
          openRate: d.sent > 0 ? Math.round((d.opens / d.sent) * 100) : 0,
          clickRate: d.sent > 0 ? Math.round((d.clicks / d.sent) * 100) : 0,
        }))
        .sort((a, b) => b.openRate - a.openRate);
    },
  });

  const subjectLeaderboard = useQuery({
    queryKey: ["outreach-analytics-subjects", from, to],
    queryFn: async (): Promise<SubjectMetric[]> => {
      const { data: emails } = await supabase
        .from("email_send_log")
        .select("message_id, subject")
        .eq("status", "sent")
        .gte("created_at", from)
        .lte("created_at", to);
      if (!emails?.length) return [];

      const messageIds = emails.filter(e => e.message_id).map(e => e.message_id!);
      const openSet = new Set<string>();
      const clickSet = new Set<string>();
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from("email_tracking_events")
          .select("message_id, event_type")
          .in("message_id", messageIds.slice(0, 500));
        for (const ev of events ?? []) {
          if (ev.event_type === "open") openSet.add(ev.message_id);
          if (ev.event_type === "click") clickSet.add(ev.message_id);
        }
      }

      const subjMap = new Map<string, { sent: number; opens: number; clicks: number }>();
      for (const e of emails) {
        const subj = e.subject ?? "(No Subject)";
        if (!subjMap.has(subj)) subjMap.set(subj, { sent: 0, opens: 0, clicks: 0 });
        subjMap.get(subj)!.sent++;
        if (e.message_id && openSet.has(e.message_id)) subjMap.get(subj)!.opens++;
        if (e.message_id && clickSet.has(e.message_id)) subjMap.get(subj)!.clicks++;
      }
      return [...subjMap.entries()]
        .filter(([, d]) => d.sent >= 3)
        .map(([subject, d]) => ({
          subject,
          sent: d.sent,
          opens: d.opens,
          openRate: d.sent > 0 ? Math.round((d.opens / d.sent) * 100) : 0,
          clicks: d.clicks,
          clickRate: d.sent > 0 ? Math.round((d.clicks / d.sent) * 100) : 0,
        }))
        .sort((a, b) => b.openRate - a.openRate)
        .slice(0, 15);
    },
  });

  const sendTimeHeatmap = useQuery({
    queryKey: ["outreach-analytics-sendtime", from, to],
    queryFn: async (): Promise<TimeSlot[]> => {
      const { data: emails } = await supabase
        .from("email_send_log")
        .select("message_id, created_at")
        .eq("status", "sent")
        .gte("created_at", from)
        .lte("created_at", to);
      if (!emails?.length) return [];

      const messageIds = emails.filter(e => e.message_id).map(e => e.message_id!);
      const openSet = new Set<string>();
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from("email_tracking_events")
          .select("message_id, event_type")
          .in("message_id", messageIds.slice(0, 500));
        for (const ev of events ?? []) {
          if (ev.event_type === "open") openSet.add(ev.message_id);
        }
      }

      const slotMap = new Map<string, { sent: number; opens: number }>();
      for (const e of emails) {
        const d = new Date(e.created_at!);
        const key = `${getDay(d)}-${getHours(d)}`;
        if (!slotMap.has(key)) slotMap.set(key, { sent: 0, opens: 0 });
        slotMap.get(key)!.sent++;
        if (e.message_id && openSet.has(e.message_id)) slotMap.get(key)!.opens++;
      }
      return [...slotMap.entries()].map(([key, d]) => {
        const [day, hour] = key.split("-").map(Number);
        return {
          day,
          dayName: DAYS[day],
          hour,
          sent: d.sent,
          opens: d.opens,
          openRate: d.sent > 0 ? Math.round((d.opens / d.sent) * 100) : 0,
        };
      });
    },
  });

  return { overall, timeSeries, competitorPerformance, subjectLeaderboard, sendTimeHeatmap };
}

export function generateInsights(
  metrics: OverallMetrics | undefined,
  competitors: CompetitorMetric[] | undefined,
  subjects: SubjectMetric[] | undefined,
  heatmap: TimeSlot[] | undefined,
): string[] {
  if (!metrics || metrics.totalSent < 5) return [];
  const insights: string[] = [];

  // Benchmark comparison
  const benchmark = metrics.openRate >= 22 ? "above" : "below";
  insights.push(`Your open rate is ${metrics.openRate}% — ${benchmark} the B2B benchmark of 22%.`);

  // Best day
  if (heatmap?.length) {
    const dayTotals = new Map<string, { sent: number; opens: number }>();
    for (const s of heatmap) {
      if (!dayTotals.has(s.dayName)) dayTotals.set(s.dayName, { sent: 0, opens: 0 });
      dayTotals.get(s.dayName)!.sent += s.sent;
      dayTotals.get(s.dayName)!.opens += s.opens;
    }
    const sorted = [...dayTotals.entries()]
      .map(([day, d]) => ({ day, rate: d.sent > 0 ? Math.round((d.opens / d.sent) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);
    if (sorted.length >= 2) {
      insights.push(`Emails sent on ${sorted[0].day} perform ${sorted[0].rate - sorted[sorted.length - 1].rate}% better than ${sorted[sorted.length - 1].day}.`);
    }
  }

  // Best competitor angle
  if (competitors?.length && competitors[0].competitor !== "No Angle") {
    insights.push(`${competitors[0].competitor} displacement emails have your highest open rate at ${competitors[0].openRate}%.`);
  }

  // Best subject
  if (subjects?.length) {
    insights.push(`Your top subject line "${subjects[0].subject.slice(0, 50)}${subjects[0].subject.length > 50 ? "..." : ""}" has a ${subjects[0].openRate}% open rate.`);
    if (subjects.length >= 2) {
      const worst = subjects[subjects.length - 1];
      insights.push(`Consider A/B testing: "${subjects[0].subject.slice(0, 40)}..." vs "${worst.subject.slice(0, 40)}...".`);
    }
  }

  return insights.slice(0, 5);
}
