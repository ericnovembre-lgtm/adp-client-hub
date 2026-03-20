import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Target, Clock, Layers } from "lucide-react";
import { useReportsSummaryKPIs, type ReportsFilters } from "@/hooks/useReportsData";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const kpis = [
  { key: "totalRevenue" as const, label: "Closed Revenue", icon: DollarSign, format: (v: number) => fmt.format(v) },
  { key: "winRate" as const, label: "Win Rate", icon: TrendingUp, format: (v: number) => `${v}%` },
  { key: "totalDeals" as const, label: "Total Deals", icon: Target, format: (v: number) => String(v) },
  { key: "openPipeline" as const, label: "Open Pipeline", icon: Layers, format: (v: number) => fmt.format(v) },
  { key: "avgDaysToClose" as const, label: "Avg Days to Close", icon: Clock, format: (v: number) => `${v}d` },
];

export default function KPISummaryBar({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useReportsSummaryKPIs(filters);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map(({ key, label, icon: Icon, format: fmtFn }) => (
        <Card key={key}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              {isLoading ? (
                <Skeleton className="h-5 w-16 mt-1" />
              ) : (
                <p className="text-lg font-semibold truncate">{fmtFn(data?.[key] ?? 0)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
