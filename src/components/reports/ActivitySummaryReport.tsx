import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { useActivitySummary, type ReportsFilters } from "@/hooks/useReportsData";
import { Activity, Phone, Mail, Users, StickyNote, Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportCSV";

const TYPE_COLORS: Record<string, string> = {
  call: "hsl(225, 75%, 55%)",
  email: "hsl(160, 60%, 45%)",
  meeting: "hsl(40, 90%, 55%)",
  note: "hsl(280, 60%, 55%)",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
};

export default function ActivitySummaryReport({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useActivitySummary(filters);

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

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Activity Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Log calls, emails, meetings, and notes to see your activity breakdown.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.typeCounts.filter((t) => t.count > 0).map((t) => ({
    ...t,
    fill: TYPE_COLORS[t.key] ?? "hsl(var(--primary))",
  }));

  const handleExport = () => {
    const rows = data.weekly.map((w) => ({
      week: w.week,
      calls: w.call,
      emails: w.email,
      meetings: w.meeting,
      notes: w.note,
      total: w.total,
    }));
    exportToCSV(rows, "activity-summary.csv", [
      { header: "Week", accessor: (r) => r.week },
      { header: "Calls", accessor: (r) => r.calls },
      { header: "Emails", accessor: (r) => r.emails },
      { header: "Meetings", accessor: (r) => r.meetings },
      { header: "Notes", accessor: (r) => r.notes },
      { header: "Total", accessor: (r) => r.total },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Activity Summary
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{data.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          {data.typeCounts.map((t) => {
            const Icon = TYPE_ICONS[t.key] ?? Activity;
            return (
              <div key={t.key} className="rounded-lg border bg-card p-3 text-center">
                <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-lg font-bold text-foreground">{t.count}</p>
                <p className="text-xs text-muted-foreground">{t.type}s</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                label={({ type, count }) => `${type}: ${count}`} fontSize={11}>
                {pieData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {data.weekly.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="call" stackId="a" fill={TYPE_COLORS.call} />
                <Bar dataKey="email" stackId="a" fill={TYPE_COLORS.email} />
                <Bar dataKey="meeting" stackId="a" fill={TYPE_COLORS.meeting} />
                <Bar dataKey="note" stackId="a" fill={TYPE_COLORS.note} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          📊 Avg <strong className="text-foreground">{data.avgPerDay}</strong> activities/day over this period
        </p>
      </CardContent>
    </Card>
  );
}
