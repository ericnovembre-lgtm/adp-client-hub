import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useDealVelocity } from "@/hooks/useDealVelocity";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";

const fmt = (v: number) => `$${v.toLocaleString()}`;

export default function DealVelocityChart({ filters }: { filters: { range: string; from?: Date; to?: Date } }) {
  const { data, isLoading } = useDealVelocity(filters);

  if (isLoading) return <Card><CardContent className="p-6"><Skeleton className="h-4 w-32 mb-3" /><Skeleton className="h-[250px] w-full" /></CardContent></Card>;

  if (!data?.hasData && (!data?.slowestDeals.length)) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Deal Velocity</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No stage change data yet. As deals progress through stages, velocity metrics will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Deal Velocity</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data?.stageVelocity ?? []} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="d" />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
            <Tooltip formatter={(v: number) => [`${v} days`, "Avg"]} />
            <Bar dataKey="avgDays" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span>Avg Sales Cycle: <strong className="text-foreground">{data?.avgWon ?? 0}d</strong> (won)</span>
          <span className="text-muted-foreground">|</span>
          <span>Avg Sales Cycle: <strong className="text-foreground">{data?.avgLost ?? 0}d</strong> (lost)</span>
        </div>

        {data?.slowestDeals && data.slowestDeals.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground mt-2">Slowest Open Deals</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Deal</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs text-right">Value</TableHead>
                  <TableHead className="text-xs text-right">Age</TableHead>
                  <TableHead className="text-xs text-right">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slowestDeals.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-medium">{d.title}</TableCell>
                    <TableCell className="text-xs">{d.stage}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(d.value)}</TableCell>
                    <TableCell className="text-xs text-right">{d.ageDays}d</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {d.lastActivity ? formatDistanceToNow(new Date(d.lastActivity), { addSuffix: true }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
