import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Loader2, Flame, Info, DollarSign } from "lucide-react";

interface BLSTrend {
  industry: string;
  state: string;
  latest_quarter: string;
  employment_level: number | null;
  prior_employment_level: number | null;
  employment_change_pct: number | null;
  avg_weekly_wage: number | null;
  prior_avg_weekly_wage: number | null;
  wage_change_pct: number | null;
  is_hot_market: boolean;
}

interface BLSTrendsSectionProps {
  states: string[];
  industries: string[];
  hasAnalyzed: boolean;
}

export default function BLSTrendsSection({ states, industries, hasAnalyzed }: BLSTrendsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<BLSTrend[]>([]);
  const [dataPeriod, setDataPeriod] = useState("");
  const [hotMarketCount, setHotMarketCount] = useState(0);

  const fetchTrends = async () => {
    if (states.length === 0 || industries.length === 0) {
      toast.error("Select at least one state and one industry first");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bls-trends", {
        body: { states, industries },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTrends(data.trends ?? []);
      setDataPeriod(data.data_period ?? "");
      setHotMarketCount(data.hot_markets ?? 0);
      toast.success(`Fetched BLS trends for ${data.total_pairs} industry-state pairs`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch BLS trends");
    }
    setLoading(false);
  };

  const growthCell = (pct: number | null) => {
    if (pct === null) return <span className="text-muted-foreground">—</span>;
    return (
      <span className={`flex items-center gap-1 ${pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {pct >= 0 ? "+" : ""}{pct}%
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Recent Employment Trends (BLS QCEW)
            </CardTitle>
            <CardDescription>
              Quarterly employment & wage data — fresher than Census CBP (~6 month lag vs ~2 year)
            </CardDescription>
          </div>
          <Button onClick={fetchTrends} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            {trends.length > 0 ? "Refresh Trends" : "Fetch Recent Trends"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trends.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {hasAnalyzed
              ? "Click \"Fetch Recent Trends\" to pull the latest BLS employment signals for your selected markets."
              : "Run the Census analysis first, then fetch BLS trends for real-time signals."}
          </p>
        )}

        {hotMarketCount > 0 && (
          <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-sm">
              <strong>{hotMarketCount} Hot Market{hotMarketCount > 1 ? "s" : ""}</strong> detected — these industry-state pairs show &gt;2% quarterly employment growth.
            </span>
          </div>
        )}

        {trends.length > 0 && (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Industry</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Emp. Change</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Avg Weekly Wage
                      </span>
                    </TableHead>
                    <TableHead>Wage Change</TableHead>
                    <TableHead>Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends.map((row, i) => (
                    <TableRow key={i} className={row.is_hot_market ? "bg-orange-500/5" : ""}>
                      <TableCell className="font-medium">{row.industry}</TableCell>
                      <TableCell>{row.state}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.latest_quarter}</TableCell>
                      <TableCell>{row.employment_level?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell>{growthCell(row.employment_change_pct)}</TableCell>
                      <TableCell>{row.avg_weekly_wage ? `$${row.avg_weekly_wage.toLocaleString()}` : "—"}</TableCell>
                      <TableCell>{growthCell(row.wage_change_pct)}</TableCell>
                      <TableCell>
                        {row.is_hot_market ? (
                          <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30">
                            <Flame className="h-3 w-3 mr-1" /> Hot
                          </Badge>
                        ) : row.employment_change_pct !== null && row.employment_change_pct > 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            Growing
                          </Badge>
                        ) : row.employment_change_pct !== null && row.employment_change_pct < 0 ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Declining
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Data source: Bureau of Labor Statistics, Quarterly Census of Employment and Wages ({dataPeriod}). Updated quarterly.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
