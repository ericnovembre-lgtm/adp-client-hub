import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutreachAnalytics, generateInsights } from "@/hooks/useOutreachAnalytics";
import { Mail, Send, TrendingUp, TrendingDown, Minus, MousePointerClick, MessageSquareReply, Copy, Lightbulb, ArrowRight, Download, BarChart3 } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Cell } from "recharts";
import { toast } from "sonner";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/exportCSV";
import OutreachSubjectLeaderboard from "@/components/outreach/OutreachSubjectLeaderboard";
import OutreachSendTimeHeatmap from "@/components/outreach/OutreachSendTimeHeatmap";
import OutreachEmailTypeChart from "@/components/outreach/OutreachEmailTypeChart";

function rateColor(rate: number, green: number, yellow: number) {
  if (rate >= green) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= yellow) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

interface TrendInfo { delta: number; direction: "up" | "down" | "flat" }

function computeTrend(current: number, previous: number): TrendInfo {
  const delta = current - previous;
  if (delta > 0) return { delta, direction: "up" };
  if (delta < 0) return { delta: Math.abs(delta), direction: "down" };
  return { delta: 0, direction: "flat" };
}

export default function OutreachAnalyticsPage() {
  const [range, setRange] = useState("30");
  const filters = { range };
  const { overall, timeSeries, competitorPerformance, subjectLeaderboard, sendTimeHeatmap, emailTypePerformance } = useOutreachAnalytics(filters);

  const metrics = overall.data;
  const isLoading = overall.isLoading;
  const insights = generateInsights(metrics, competitorPerformance.data, subjectLeaderboard.data, sendTimeHeatmap.data);

  // Empty state
  if (!isLoading && metrics && metrics.totalSent < 5) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Mail className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">No outreach data yet</h2>
        <p className="text-muted-foreground max-w-md">Send emails from the Lead detail page or via the AI Agent to start seeing analytics.</p>
        <div className="flex gap-3 mt-2">
          <Link href="/leads"><Button>Go to Leads</Button></Link>
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("agent-panel-message", { detail: "Show me leads to contact" }))}>
            Open AI Agent
          </Button>
        </div>
      </div>
    );
  }

  const bestSlots = [...(sendTimeHeatmap.data ?? [])].filter(s => s.sent >= 2).sort((a, b) => b.openRate - a.openRate).slice(0, 3);

  const hasPrev = (metrics?.prevTotalSent ?? 0) > 0;

  function handleExportReport() {
    if (!metrics) return;
    const rows = [
      { metric: "Total Sent", value: metrics.totalSent, benchmark: "—", trend: hasPrev ? `${computeTrend(metrics.totalSent, metrics.prevTotalSent).direction} ${computeTrend(metrics.totalSent, metrics.prevTotalSent).delta}` : "—" },
      { metric: "Open Rate", value: `${metrics.openRate}%`, benchmark: "20-25%", trend: hasPrev ? `${computeTrend(metrics.openRate, metrics.prevOpenRate).direction} ${computeTrend(metrics.openRate, metrics.prevOpenRate).delta}%` : "—" },
      { metric: "Click Rate", value: `${metrics.clickRate}%`, benchmark: "2-5%", trend: hasPrev ? `${computeTrend(metrics.clickRate, metrics.prevClickRate).direction} ${computeTrend(metrics.clickRate, metrics.prevClickRate).delta}%` : "—" },
      { metric: "Reply Rate", value: `${metrics.replyRate}%`, benchmark: "1-3%", trend: hasPrev ? `${computeTrend(metrics.replyRate, metrics.prevReplyRate).direction} ${computeTrend(metrics.replyRate, metrics.prevReplyRate).delta}%` : "—" },
      { metric: "Click-to-Open Rate", value: `${metrics.clickToOpenRate}%`, benchmark: "10-15%", trend: hasPrev ? `${computeTrend(metrics.clickToOpenRate, metrics.prevClickToOpenRate).direction} ${computeTrend(metrics.clickToOpenRate, metrics.prevClickToOpenRate).delta}%` : "—" },
    ];
    exportToCSV(rows, `outreach-report-${range}d.csv`, [
      { header: "Metric", accessor: r => r.metric },
      { header: "Value", accessor: r => r.value },
      { header: "Benchmark", accessor: r => r.benchmark },
      { header: "Trend vs Previous Period", accessor: r => r.trend },
    ]);
    toast.success("Report downloaded!");
  }

  function handleCopyInsights() {
    if (!insights.length) return;
    navigator.clipboard.writeText(insights.join("\n"));
    toast.success("Insights copied to clipboard!");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outreach Intelligence</h1>
          <p className="text-sm text-muted-foreground">Analyze email performance to optimize your outreach strategy</p>
        </div>
        <div className="flex items-center gap-2">
          {metrics && metrics.totalSent > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards — 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
        )) : (
          <>
            <KPICard title="Total Sent" value={metrics?.totalSent ?? 0} icon={Send} benchmark="" trend={hasPrev ? computeTrend(metrics!.totalSent, metrics!.prevTotalSent) : undefined} />
            <KPICard title="Open Rate" value={`${metrics?.openRate ?? 0}%`} icon={TrendingUp} colorClass={rateColor(metrics?.openRate ?? 0, 25, 15)} benchmark="Benchmark: 20-25%" trend={hasPrev ? computeTrend(metrics!.openRate, metrics!.prevOpenRate) : undefined} />
            <KPICard title="Click Rate" value={`${metrics?.clickRate ?? 0}%`} icon={MousePointerClick} colorClass={rateColor(metrics?.clickRate ?? 0, 5, 2)} benchmark="Benchmark: 2-5%" trend={hasPrev ? computeTrend(metrics!.clickRate, metrics!.prevClickRate) : undefined} />
            <KPICard title="Reply Rate" value={`${metrics?.replyRate ?? 0}%`} icon={MessageSquareReply} colorClass={rateColor(metrics?.replyRate ?? 0, 3, 1)} benchmark="Benchmark: 1-3%" trend={hasPrev ? computeTrend(metrics!.replyRate, metrics!.prevReplyRate) : undefined} />
            <KPICard title="CTO Rate" value={`${metrics?.clickToOpenRate ?? 0}%`} icon={BarChart3} colorClass={rateColor(metrics?.clickToOpenRate ?? 0, 15, 8)} benchmark="Benchmark: 10-15%" trend={hasPrev ? computeTrend(metrics!.clickToOpenRate, metrics!.prevClickToOpenRate) : undefined} />
          </>
        )}
      </div>

      {/* Engagement Funnel */}
      {metrics && metrics.totalSent > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Engagement Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelStep label="Sent" count={metrics.totalSent} />
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <FunnelStep label="Opened" count={metrics.uniqueOpens} pct={metrics.openRate} />
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <FunnelStep label="Clicked" count={metrics.uniqueClicks} pct={metrics.clickRate} />
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <FunnelStep label="Replied" count={metrics.replies} pct={metrics.replyRate} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Over Time */}
      {timeSeries.data && timeSeries.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Performance Over Time</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeries.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="sent" fill="hsl(var(--primary))" opacity={0.7} name="Sent" />
                  <Line yAxisId="right" type="monotone" dataKey="openRate" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Open Rate %" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitor Angle Performance */}
      {competitorPerformance.data && competitorPerformance.data.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Competitor Angle Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={competitorPerformance.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="competitor" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="openRate" name="Open Rate %" fill="hsl(var(--chart-1))">
                    {competitorPerformance.data.map((entry, i) => (
                      <Cell key={i} fill={entry.openRate >= 22 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {competitorPerformance.data[0] && competitorPerformance.data[0].competitor !== "No Angle" && (
              <p className="text-sm text-muted-foreground mt-3">
                <Lightbulb className="inline h-4 w-4 mr-1" />
                Your <strong>{competitorPerformance.data[0].competitor}</strong> displacement emails have a {competitorPerformance.data[0].openRate}% open rate. Consider using this angle more.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Module 1: Email Type Performance */}
      <OutreachEmailTypeChart data={emailTypePerformance.data} isLoading={emailTypePerformance.isLoading} />

      {/* Subject Line Leaderboard */}
      <OutreachSubjectLeaderboard data={subjectLeaderboard.data} isLoading={subjectLeaderboard.isLoading} />

      {/* Send Time Heatmap */}
      <OutreachSendTimeHeatmap data={sendTimeHeatmap.data} isLoading={sendTimeHeatmap.isLoading} bestSlots={bestSlots} />

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> AI Insights</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCopyInsights}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, colorClass, benchmark, trend }: { title: string; value: string | number; icon: React.ElementType; colorClass?: string; benchmark: string; trend?: TrendInfo }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="flex items-center gap-1.5">
              <p className={cn("text-2xl font-bold", colorClass ?? "text-foreground")}>{value}</p>
              {trend && trend.direction !== "flat" && (
                <span className={cn("flex items-center text-xs font-medium", trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {trend.direction === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend.delta}{typeof value === "string" && value.includes("%") ? "%" : ""}
                </span>
              )}
              {trend && trend.direction === "flat" && (
                <span className="flex items-center text-xs text-muted-foreground">
                  <Minus className="h-3 w-3 mr-0.5" /> 0
                </span>
              )}
            </div>
            {benchmark && <p className="text-[10px] text-muted-foreground">{benchmark}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ label, count, pct }: { label: string; count: number; pct?: number }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted/50 rounded-lg px-4 py-3 min-w-[80px]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-foreground">{count}</span>
      {pct !== undefined && <span className="text-[10px] text-muted-foreground">{pct}%</span>}
    </div>
  );
}
