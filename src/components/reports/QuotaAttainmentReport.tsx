import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useQuotaAttainment, type ReportsFilters } from "@/hooks/useReportsData";
import { Target, Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportCSV";

const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export default function QuotaAttainmentReport({ filters }: { filters?: ReportsFilters }) {
  const { data, isLoading } = useQuotaAttainment(filters);

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

  if (!data) return null;

  const handleExport = () => {
    const rows = data.quarters.map((q) => ({
      quarter: q.label,
      quota: q.quota,
      closed: q.closed,
      attainment: q.attainment,
    }));
    exportToCSV(rows, "quota-attainment.csv", [
      { header: "Quarter", accessor: (r) => r.quarter },
      { header: "Quota", accessor: (r) => r.quota },
      { header: "Closed Won", accessor: (r) => r.closed },
      { header: "Attainment %", accessor: (r) => r.attainment },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Quota Attainment
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.quarters}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmt} />
            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Closed Won"]} />
            <ReferenceLine y={data.quota} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Quota: ${fmt(data.quota)}`, position: "top", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Bar dataKey="closed" radius={[4, 4, 0, 0]}>
              {data.quarters.map((q, i) => (
                <rect key={i} fill={q.attainment >= 100 ? "hsl(160, 60%, 45%)" : q.attainment >= 75 ? "hsl(40, 90%, 55%)" : "hsl(0, 84%, 60%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-2">
          {data.quarters.map((q) => (
            <Badge key={q.label} variant={q.attainment >= 100 ? "default" : "secondary"} className="text-xs">
              {q.label}: {q.attainment}%
            </Badge>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Current Quarter — Monthly</p>
          <div className="grid grid-cols-3 gap-3">
            {data.monthly.map((m) => (
              <div key={m.month} className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{m.month}</p>
                <p className="text-sm font-bold text-foreground">${(m.closed / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-muted-foreground">of ${(m.target / 1000).toFixed(0)}k target</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
