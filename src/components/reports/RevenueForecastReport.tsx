import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area } from "recharts";
import { useRevenueForecast } from "@/hooks/useReportsData";
import { TrendingUp, DollarSign } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  lead: "hsl(225, 75%, 55%)",
  qualified: "hsl(200, 65%, 50%)",
  proposal: "hsl(40, 90%, 55%)",
  negotiation: "hsl(30, 80%, 50%)",
};

const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export default function RevenueForecastReport() {
  const { data, isLoading } = useRevenueForecast();

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.dealCount === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Revenue Forecast</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Add open deals with values to see weighted revenue forecasts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Revenue Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Pipeline (Raw)</p>
            <p className="text-lg font-bold text-foreground">${(data.totalUnweighted / 1000).toFixed(0)}k</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Weighted Forecast</p>
            <p className="text-lg font-bold text-foreground">${(data.totalWeighted / 1000).toFixed(0)}k</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Open Deals</p>
            <p className="text-lg font-bold text-foreground">{data.dealCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weighted by stage */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Weighted Value by Stage</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmt} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Weighted"]} />
                <Bar dataKey="weighted" radius={[0, 4, 4, 0]}>
                  {data.byStage.map((s) => (
                    <Cell key={s.key} fill={STAGE_COLORS[s.key] ?? "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly forecast */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">6-Month Forecast</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.monthlyForecast}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(225, 75%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(225, 75%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmt} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Forecast"]} />
                <Area type="monotone" dataKey="forecast" stroke="hsl(225, 75%, 55%)" fill="url(#forecastGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Weights: Lead 10%, Qualified 25%, Proposal 50%, Negotiation 75%
        </p>
      </CardContent>
    </Card>
  );
}
