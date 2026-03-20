import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserSettings, useUpdateUserSettings, type ReportSectionsState } from "@/hooks/useUserSettings";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { BarChart3, CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  CartesianGrid, Legend, FunnelChart, Funnel, LabelList,
} from "recharts";
import {
  useLeadFunnel,
  useDealPipelineValue,
  useActivityOverTime,
  useLeadSources,
  useMonthlyRevenue,
  
  type DateRange,
} from "@/hooks/useReportsData";
import OutreachMetricsChart from "@/components/OutreachMetricsChart";
import DealVelocityChart from "@/components/DealVelocityChart";
import CompetitorWinLossChart from "@/components/CompetitorWinLossChart";
import ScoreDistributionChart from "@/components/ScoreDistributionChart";
import QuotaAttainmentReport from "@/components/reports/QuotaAttainmentReport";
import PipelineVelocityReport from "@/components/reports/PipelineVelocityReport";
import ActivitySummaryReport from "@/components/reports/ActivitySummaryReport";
import RevenueForecastReport from "@/components/reports/RevenueForecastReport";
import LeadSourceROIReport from "@/components/reports/LeadSourceROIReport";
import KPISummaryBar from "@/components/reports/KPISummaryBar";

const STAGE_COLORS: Record<string, string> = {
  lead: "hsl(225, 75%, 55%)",
  qualified: "hsl(200, 65%, 50%)",
  proposal: "hsl(40, 90%, 55%)",
  negotiation: "hsl(30, 80%, 50%)",
  "closed_won": "hsl(160, 60%, 45%)",
  "closed_lost": "hsl(0, 84%, 60%)",
};

const LINE_COLORS = {
  call: "hsl(225, 75%, 55%)",
  email: "hsl(160, 60%, 45%)",
  meeting: "hsl(40, 90%, 55%)",
  note: "hsl(280, 60%, 55%)",
};

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}

export default function ReportsPage() {
  const { data: settings, isSuccess: settingsLoaded } = useUserSettings();
  const { mutate: updateSettings } = useUpdateUserSettings();

  const [range, setRange] = useState<DateRange>("30");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [quotaOpen, setQuotaOpen] = useState(true);
  const [velocityOpen, setVelocityOpen] = useState(true);
  const [activitySummaryOpen, setActivitySummaryOpen] = useState(true);
  const [forecastOpen, setForecastOpen] = useState(true);
  const [roiOpen, setRoiOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Sync from saved settings once on load
  useEffect(() => {
    if (settingsLoaded && !initialized) {
      const rs = settings?.reportSections;
      if (rs) {
        setQuotaOpen(rs.quota ?? true);
        setVelocityOpen(rs.velocity ?? true);
        setActivitySummaryOpen(rs.activitySummary ?? true);
        setForecastOpen(rs.forecast ?? true);
        setRoiOpen(rs.roi ?? true);
      }
      setInitialized(true);
    }
  }, [settingsLoaded, initialized, settings]);

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveState = useCallback((sections: ReportSectionsState) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateSettings({ ...settings, reportSections: sections });
    }, 500);
  }, [settings, updateSettings]);

  // Persist on change (only after initial load)
  useEffect(() => {
    if (!initialized) return;
    saveState({ quota: quotaOpen, velocity: velocityOpen, activitySummary: activitySummaryOpen, forecast: forecastOpen, roi: roiOpen });
  }, [quotaOpen, velocityOpen, activitySummaryOpen, forecastOpen, roiOpen, initialized, saveState]);

  const allOpen = quotaOpen && velocityOpen && activitySummaryOpen && forecastOpen && roiOpen;
  const toggleAll = () => {
    const next = !allOpen;
    setQuotaOpen(next);
    setVelocityOpen(next);
    setActivitySummaryOpen(next);
    setForecastOpen(next);
    setRoiOpen(next);
  };

  const filters = {
    range,
    from: customFrom,
    to: customTo,
  };

  const funnel = useLeadFunnel(filters);
  const pipeline = useDealPipelineValue(filters);
  const activity = useActivityOverTime(filters);
  const sources = useLeadSources(filters);
  const revenue = useMonthlyRevenue();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Data visualizations and analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {range === "custom" && (
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[120px] justify-start text-left text-xs", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customFrom ? format(customFrom, "MMM dd") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={(d) => {
                    if (d && customTo && d > customTo) { setCustomFrom(customTo); setCustomTo(d); } else { setCustomFrom(d); }
                  }} disabled={(date) => !!customTo && date > customTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[120px] justify-start text-left text-xs", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customTo ? format(customTo, "MMM dd") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={(d) => {
                    if (d && customFrom && d < customFrom) { setCustomTo(customFrom); setCustomFrom(d); } else { setCustomTo(d); }
                  }} disabled={(date) => !!customFrom && date < customFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <KPISummaryBar filters={filters} />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allOpen ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quota Attainment */}
        <Collapsible open={quotaOpen} onOpenChange={setQuotaOpen} className="lg:col-span-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
            Quota Attainment
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", quotaOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <QuotaAttainmentReport filters={filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Pipeline Velocity */}
        <Collapsible open={velocityOpen} onOpenChange={setVelocityOpen} className="lg:col-span-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
            Pipeline Velocity
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", velocityOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <PipelineVelocityReport filters={filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Activity Summary */}
        <Collapsible open={activitySummaryOpen} onOpenChange={setActivitySummaryOpen} className="lg:col-span-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
            Activity Summary
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", activitySummaryOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ActivitySummaryReport filters={filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Revenue Forecast */}
        <Collapsible open={forecastOpen} onOpenChange={setForecastOpen} className="lg:col-span-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
            Revenue Forecast
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", forecastOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <RevenueForecastReport filters={filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Lead Source ROI */}
        <Collapsible open={roiOpen} onOpenChange={setRoiOpen} className="lg:col-span-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
            Lead Source ROI
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", roiOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <LeadSourceROIReport filters={filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Lead Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip formatter={(value: number) => [value, "Count"]} />
                  <Funnel dataKey="value" data={funnel.data ?? []} isAnimationActive>
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="stage" fontSize={12} />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                    {(funnel.data ?? []).map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
            {funnel.data && funnel.data.length > 1 && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {funnel.data.slice(0, -1).map((d, i) => {
                  const next = funnel.data![i + 1];
                  const rate = d.value ? ((next.value / d.value) * 100).toFixed(0) : "0";
                  return (
                    <span key={i} className="bg-muted rounded px-2 py-1">
                      {d.stage} → {next.stage}: <span className="font-semibold text-foreground">{rate}%</span>
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Pipeline Value */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pipeline.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, "Value"]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {(pipeline.data ?? []).map((entry) => (
                      <Cell key={entry.key} fill={STAGE_COLORS[entry.key] ?? "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Activity Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={activity.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="call" stroke={LINE_COLORS.call} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="email" stroke={LINE_COLORS.email} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="meeting" stroke={LINE_COLORS.meeting} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="note" stroke={LINE_COLORS.note} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sources.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sources.data ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine
                    fontSize={11}
                  >
                    {(sources.data ?? []).map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend - full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend (Closed Won)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenue.data ?? []}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(160, 60%, 45%)" fill="url(#revenueGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Outreach Effectiveness */}
        <OutreachMetricsChart filters={filters} />

        {/* Deal Velocity + Competitor Win/Loss */}
        <DealVelocityChart filters={filters} />
        <CompetitorWinLossChart filters={filters} />

        {/* Score Distribution */}
        <ScoreDistributionChart />
      </div>
    </div>
  );
}
