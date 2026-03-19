import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutreachAnalytics, generateInsights } from "@/hooks/useOutreachAnalytics";
import { Mail, Send, TrendingUp, MousePointerClick, MessageSquareReply, Copy, Lightbulb, ArrowRight, Star } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Cell } from "recharts";
import { toast } from "sonner";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rateColor(rate: number, green: number, yellow: number) {
  if (rate >= green) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= yellow) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function OutreachAnalyticsPage() {
  const [range, setRange] = useState("30");
  const filters = { range };
  const { overall, timeSeries, competitorPerformance, subjectLeaderboard, sendTimeHeatmap } = useOutreachAnalytics(filters);

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

  // Best send time
  const bestSlots = [...(sendTimeHeatmap.data ?? [])].filter(s => s.sent >= 2).sort((a, b) => b.openRate - a.openRate).slice(0, 3);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outreach Intelligence</h1>
          <p className="text-sm text-muted-foreground">Analyze email performance to optimize your outreach strategy</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
        )) : (
          <>
            <KPICard title="Total Sent" value={metrics?.totalSent ?? 0} icon={Send} benchmark="" />
            <KPICard title="Open Rate" value={`${metrics?.openRate ?? 0}%`} icon={TrendingUp} colorClass={rateColor(metrics?.openRate ?? 0, 25, 15)} benchmark="Benchmark: 20-25%" />
            <KPICard title="Click Rate" value={`${metrics?.clickRate ?? 0}%`} icon={MousePointerClick} colorClass={rateColor(metrics?.clickRate ?? 0, 5, 2)} benchmark="Benchmark: 2-5%" />
            <KPICard title="Reply Rate" value={`${metrics?.replyRate ?? 0}%`} icon={MessageSquareReply} colorClass={rateColor(metrics?.replyRate ?? 0, 3, 1)} benchmark="Benchmark: 1-3%" />
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

      {/* Subject Line Leaderboard */}
      {subjectLeaderboard.data && subjectLeaderboard.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Subject Line Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Line</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Open Rate</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Click Rate</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectLeaderboard.data.map((s, i) => {
                    const isTop = i < 5;
                    const isBottom = i >= subjectLeaderboard.data!.length - 3 && subjectLeaderboard.data!.length > 5;
                    return (
                      <TableRow key={s.subject} className={cn(isTop && "bg-emerald-500/5", isBottom && "bg-red-500/5")}>
                        <TableCell className="max-w-[300px] truncate font-medium">{s.subject}</TableCell>
                        <TableCell className="text-right">{s.sent}</TableCell>
                        <TableCell className="text-right">{s.opens}</TableCell>
                        <TableCell className="text-right"><Badge variant={isTop ? "default" : isBottom ? "destructive" : "secondary"}>{s.openRate}%</Badge></TableCell>
                        <TableCell className="text-right">{s.clicks}</TableCell>
                        <TableCell className="text-right">{s.clickRate}%</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(s.subject); toast.success("Copied!"); }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Time Heatmap */}
      {sendTimeHeatmap.data && sendTimeHeatmap.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Best Send Time</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left pr-2 text-muted-foreground font-medium">Day</th>
                    {HOURS.map(h => <th key={h} className="text-center w-8 text-muted-foreground font-normal">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((dayName, dayIdx) => (
                    <tr key={dayName}>
                      <td className="pr-2 py-0.5 font-medium text-muted-foreground">{dayName}</td>
                      {HOURS.map(h => {
                        const slot = sendTimeHeatmap.data!.find(s => s.day === dayIdx && s.hour === h);
                        const rate = slot?.openRate ?? 0;
                        const isBest = bestSlots.some(b => b.day === dayIdx && b.hour === h);
                        const opacity = slot ? Math.max(0.1, rate / 100) : 0;
                        return (
                          <td key={h} className="p-0.5" title={slot ? `${slot.sent} sent, ${rate}% open rate` : "No data"}>
                            <div
                              className={cn("w-6 h-6 rounded-sm flex items-center justify-center", isBest && "ring-2 ring-primary")}
                              style={{ backgroundColor: slot ? `hsl(var(--chart-2) / ${opacity})` : "hsl(var(--muted) / 0.3)" }}
                            >
                              {isBest && <Star className="h-3 w-3 text-primary" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bestSlots.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Best time to send: <strong>{bestSlots[0].dayName} at {bestSlots[0].hour}:00</strong> ({bestSlots[0].openRate}% open rate)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> AI Insights</CardTitle></CardHeader>
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

function KPICard({ title, value, icon: Icon, colorClass, benchmark }: { title: string; value: string | number; icon: React.ElementType; colorClass?: string; benchmark: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", colorClass ?? "text-foreground")}>{value}</p>
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
