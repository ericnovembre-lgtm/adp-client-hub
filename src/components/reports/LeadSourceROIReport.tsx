import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useLeadSourceROI, type ReportsFilters } from "@/hooks/useReportsData";
import { PieChart as PieChartIcon, Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportCSV";

export default function LeadSourceROIReport({ filters }: { filters: ReportsFilters }) {
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

  const handleExport = () => {
    exportToCSV(data.rows, "lead-source-roi.csv", [
      { header: "Source", accessor: (r) => r.source },
      { header: "Total Leads", accessor: (r) => r.total },
      { header: "Qualified", accessor: (r) => r.qualified },
      { header: "Converted", accessor: (r) => r.converted },
      { header: "Dismissed", accessor: (r) => r.dismissed },
      { header: "Qualify Rate %", accessor: (r) => r.qualifyRate },
      { header: "Convert Rate %", accessor: (r) => r.convertRate },
    ]);
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Lead Source ROI
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
