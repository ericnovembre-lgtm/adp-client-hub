import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { usePipelineVelocity, type ReportsFilters } from "@/hooks/useReportsData";
import { Gauge, TrendingUp, Award, Timer } from "lucide-react";

const COLORS: Record<string, string> = {
  lead: "hsl(225, 75%, 55%)",
  qualified: "hsl(200, 65%, 50%)",
  proposal: "hsl(40, 90%, 55%)",
  negotiation: "hsl(30, 80%, 50%)",
  closed_won: "hsl(160, 60%, 45%)",
};

function KPIBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PipelineVelocityReport({ filters }: { filters: { range: string; from?: Date; to?: Date } }) {
  const { data, isLoading } = usePipelineVelocity(filters);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalDeals === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline Velocity</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gauge className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Add deals to see pipeline velocity and conversion rates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Pipeline Velocity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <KPIBox icon={TrendingUp} label="Win Rate" value={`${data.winRate}%`} />
          <KPIBox icon={Timer} label="Avg Days to Close" value={`${data.avgDaysToClose}d`} />
          <KPIBox icon={Award} label="Total Deals" value={String(data.totalDeals)} />
        </div>

        {/* Conversion funnel */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Stage Conversion Rates</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.conversions} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Rate"]} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {data.conversions.map((c) => (
                  <Cell key={c.key} fill={COLORS[c.key] ?? "hsl(var(--primary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline value */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {data.pipelineByStage.filter(p => p.count > 0).map((p) => (
            <span key={p.key} className="bg-muted rounded px-2 py-1">
              {p.stage}: <span className="font-semibold text-foreground">{p.count} deals (${(p.value / 1000).toFixed(0)}k)</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
