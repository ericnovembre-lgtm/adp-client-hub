import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats, usePipelineData, useTerritoryStats, type StatItem } from "@/hooks/useDashboardStats";
import { useUserSettings } from "@/hooks/useUserSettings";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  TrendingUp, TrendingDown, Phone, Mail, Calendar, FileText, Activity,
  Users, DollarSign, Target, CheckSquare, Sparkles, MapPin,
} from "lucide-react";
import { HEADCOUNT_MIN, HEADCOUNT_MAX } from "@/lib/constants";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function StatCard({ label, value, stat, icon: Icon, isLoading }: {
  label: string;
  value: string;
  stat: StatItem | undefined;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {stat && stat.trend > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {stat.isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={`text-xs font-medium ${stat.isPositive ? "text-emerald-500" : "text-red-500"}`}>
              {stat.trend}% vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  dismissed: "destructive",
};

const pipelineChartConfig = {
  count: { label: "Deals", color: "hsl(var(--primary))" },
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: pipeline, isLoading: pipelineLoading } = usePipelineData();
  const { data: territory, isLoading: territoryLoading } = useTerritoryStats();
  const { data: userSettings } = useUserSettings();
  const [, navigate] = useLocation();

  const schedulerEnabled = userSettings?.scheduler_enabled;
  const lastRun = userSettings?.scheduler_last_run;
  const lastCount = userSettings?.scheduler_last_count;

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .neq("status", "dismissed")
        .or(`headcount.is.null,and(headcount.gte.${HEADCOUNT_MIN},headcount.lte.${HEADCOUNT_MAX})`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={String(stats?.totalLeads.value ?? 0)} stat={stats?.totalLeads} icon={Target} isLoading={statsLoading} />
        <StatCard label="Active Deals" value={String(stats?.activeDeals.value ?? 0)} stat={stats?.activeDeals} icon={Users} isLoading={statsLoading} />
        <StatCard label="Total Revenue" value={formatCurrency(stats?.totalRevenue.value ?? 0)} stat={stats?.totalRevenue} icon={DollarSign} isLoading={statsLoading} />
        <StatCard label="Tasks Due Today" value={String(stats?.tasksDueToday.value ?? 0)} stat={stats?.tasksDueToday} icon={CheckSquare} isLoading={statsLoading} />
      </div>

      {/* Territory Coverage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Territory Coverage</CardTitle>
            {!territoryLoading && territory && (
              <span className="text-xs text-muted-foreground ml-auto">{territory.total} total leads</span>
            )}
          </div>
          {territoryLoading ? (
            <Skeleton className="h-4 w-full rounded-full" />
          ) : territory && territory.total > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted mb-3">
                {territory.inPct > 0 && (
                  <div className="bg-emerald-500 transition-all" style={{ width: `${territory.inPct}%` }} />
                )}
                {territory.outPct > 0 && (
                  <div className="bg-destructive transition-all" style={{ width: `${territory.outPct}%` }} />
                )}
                {territory.unknownPct > 0 && (
                  <div className="bg-yellow-500 transition-all" style={{ width: `${territory.unknownPct}%` }} />
                )}
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">In-Territory</span>
                  <span className="font-semibold text-foreground">{territory.inTerritory} ({territory.inPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Out</span>
                  <span className="font-semibold text-foreground">{territory.outOfTerritory} ({territory.outPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Unknown</span>
                  <span className="font-semibold text-foreground">{territory.unknown} ({territory.unknownPct}%)</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No leads yet</p>
          )}
        </CardContent>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activitiesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : activities?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              activities?.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] ?? Activity;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Top Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : leads?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              leads?.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/leads")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{lead.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.decision_maker_name ?? "—"} · {lead.headcount ? `${lead.headcount} employees` : "—"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[lead.status ?? "new"] ?? "secondary"} className="ml-2 shrink-0">
                    {lead.status ?? "new"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auto-Discovery Status */}
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/ai-discovery")}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Auto-Discovery</span>
              <Badge variant={schedulerEnabled ? "default" : "outline"} className="text-xs">
                {schedulerEnabled ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRun
                ? `Last run ${formatDistanceToNow(new Date(lastRun), { addSuffix: true })}${lastCount !== undefined ? ` · ${lastCount} leads found` : ""}`
                : "No runs yet"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deals Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ChartContainer config={pipelineChartConfig} className="h-[250px] w-full">
              <BarChart data={pipeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
