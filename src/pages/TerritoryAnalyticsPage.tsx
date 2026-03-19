import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, Handshake, DollarSign, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "this_week" | "this_month" | "this_quarter" | "all_time";
type HealthScore = "strong" | "healthy" | "needs_attention" | "critical";

interface AnalyticsResult {
  analysis: string;
  health_score: HealthScore;
  total_leads: number;
  total_deals: number;
  total_pipeline_value: number;
  leads_by_industry: Record<string, number>;
  leads_by_state: Record<string, number>;
  deals_by_stage: Record<string, { count: number; value: number }>;
}

const healthColors: Record<HealthScore, string> = {
  strong: "bg-green-500/15 text-green-700 border-green-300",
  healthy: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  needs_attention: "bg-orange-500/15 text-orange-700 border-orange-300",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

const healthLabels: Record<HealthScore, string> = {
  strong: "Strong",
  healthy: "Healthy",
  needs_attention: "Needs Attention",
  critical: "Critical",
};

function toChartData(obj: Record<string, number>, limit = 10) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

function dealsToChartData(obj: Record<string, { count: number; value: number }>) {
  return Object.entries(obj).map(([name, d]) => ({
    name,
    count: d.count,
    value: d.value,
  }));
}

export default function TerritoryAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("all_time");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResult | null>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "territory-analytics",
        { body: { period } }
      );
      if (error) throw error;
      setResult(data as AnalyticsResult);
      toast.success("Territory analysis complete");
    } catch (err: any) {
      toast.error(err.message || "Failed to run analysis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Territory Analytics</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{result?.total_leads ?? "—"}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{result?.total_deals ?? "—"}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">
                {result ? `$${result.total_pipeline_value.toLocaleString()}` : "—"}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : result ? (
              <Badge className={healthColors[result.health_score]}>
                {healthLabels[result.health_score]}
              </Badge>
            ) : (
              <p className="text-2xl font-bold">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Industry (Top 10)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartData(result.leads_by_industry)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by State (Top 10)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartData(result.leads_by_state)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deals by Stage</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsToChartData(result.deals_by_stage)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>AI Territory Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed max-h-[600px] overflow-y-auto">
              {result.analysis}
            </pre>
          </CardContent>
        </Card>
      )}

      {!result && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Click "Run Analysis" to generate your territory insights.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
