import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { usePipelineVelocity, type ReportsFilters } from "@/hooks/useReportsData";
import { Gauge, TrendingUp, Award, Timer, Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportCSV";

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

export default function PipelineVelocityReport({ filters }: { filters: ReportsFilters }) {
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

  const handleExport = () => {
    const rows = [
      ...data.conversions.map((c) => ({ metric: `${c.stage} Conversion`, value: `${c.rate}%`, count: String(c.count) })),
      { metric: "Win Rate", value: `${data.winRate}%`, count: "" },
      { metric: "Avg Days to Close", value: `${data.avgDaysToClose}`, count: "" },
      ...data.pipelineByStage.map((p) => ({ metric: `${p.stage} Pipeline`, value: `$${p.value}`, count: String(p.count) })),
    ];
    exportToCSV(rows, "pipeline-velocity.csv", [
      { header: "Metric", accessor: (r) => r.metric },
      { header: "Value", accessor: (r) => r.value },
      { header: "Count", accessor: (r) => r.count },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Pipeline Velocity
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <KPIBox icon={TrendingUp} label="Win Rate" value={`${data.winRate}%`} />
          <KPIBox icon={Timer} label="Avg Days to Close" value={`${data.avgDaysToClose}d`} />
          <KPIBox icon={Award} label="Total Deals" value={String(data.totalDeals)} />
        </div>

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
