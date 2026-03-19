import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useLeadSourceROI } from "@/hooks/useReportsData";
import { PieChart as PieChartIcon } from "lucide-react";

export default function LeadSourceROIReport({ filters }: { filters: { range: string; from?: Date; to?: Date } }) {
  const { data, isLoading } = useLeadSourceROI(filters);

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

  if (!data || data.totalLeads === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Lead Source ROI</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PieChartIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Discover leads from multiple sources to compare performance across channels.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Lead Source ROI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar: qualify vs convert rates */}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="source" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="qualified" name="Qualified" fill="hsl(200, 65%, 50%)" stackId="a" />
            <Bar dataKey="converted" name="Converted" fill="hsl(160, 60%, 45%)" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-right">Qualify %</TableHead>
              <TableHead className="text-xs text-right">Convert %</TableHead>
              <TableHead className="text-xs text-right">Dismissed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.source}>
                <TableCell className="text-xs font-medium">{r.source}</TableCell>
                <TableCell className="text-xs text-right">{r.total}</TableCell>
                <TableCell className="text-xs text-right">{r.qualifyRate}%</TableCell>
                <TableCell className="text-xs text-right">{r.convertRate}%</TableCell>
                <TableCell className="text-xs text-right">{r.dismissed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground">
          📊 {data.totalLeads} total leads across {data.rows.length} sources
          {data.totalWonRevenue > 0 && ` • $${(data.totalWonRevenue / 1000).toFixed(0)}k won revenue in period`}
        </p>
      </CardContent>
    </Card>
  );
}
