import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useCompetitorAnalytics } from "@/hooks/useCompetitorAnalytics";
import { Swords } from "lucide-react";

const fmt = (v: number) => `$${v.toLocaleString()}`;

export default function CompetitorWinLossChart({ filters }: { filters: { range: string; from?: Date; to?: Date } }) {
  const { data, isLoading } = useCompetitorAnalytics(filters);

  if (isLoading) return <Card><CardContent className="p-6"><Skeleton className="h-4 w-32 mb-3" /><Skeleton className="h-[250px] w-full" /></CardContent></Card>;

  if (!data?.hasData) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Competitor Win/Loss</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Swords className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Close some deals to see competitor analytics. Make sure leads have current_provider detected via enrichment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.rows.map(r => ({ name: r.competitor, Won: r.won, Lost: r.lost }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Competitor Win/Loss</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Won" stackId="a" fill="hsl(160, 60%, 45%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Lost" stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Competitor</TableHead>
              <TableHead className="text-xs text-right">Win Rate</TableHead>
              <TableHead className="text-xs text-right">Avg Deal</TableHead>
              <TableHead className="text-xs text-right">Avg Cycle</TableHead>
              <TableHead className="text-xs text-right">Revenue Won</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.competitor}>
                <TableCell className="text-xs font-medium flex items-center gap-1.5">
                  {r.competitor}
                  {r.winRate >= 70 && <Badge variant="default" className="text-[10px] px-1.5 py-0">Easy</Badge>}
                  {r.winRate <= 30 && r.won + r.lost > 1 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hard</Badge>}
                </TableCell>
                <TableCell className="text-xs text-right">{r.winRate}%</TableCell>
                <TableCell className="text-xs text-right">{fmt(r.avgDeal)}</TableCell>
                <TableCell className="text-xs text-right">{r.avgCycle}d</TableCell>
                <TableCell className="text-xs text-right">{fmt(r.revenueWon)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
