import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useQuotaAttainment } from "@/hooks/useReportsData";
import { Target } from "lucide-react";

const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export default function QuotaAttainmentReport() {
  const { data, isLoading } = useQuotaAttainment();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Quota Attainment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quarterly bars */}
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

        {/* Attainment badges */}
        <div className="flex flex-wrap gap-2">
          {data.quarters.map((q) => (
            <Badge
              key={q.label}
              variant={q.attainment >= 100 ? "default" : "secondary"}
              className="text-xs"
            >
              {q.label}: {q.attainment}%
            </Badge>
          ))}
        </div>

        {/* Monthly breakdown */}
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
