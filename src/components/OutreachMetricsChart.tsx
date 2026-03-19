import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useOutreachMetrics } from "@/hooks/useOutreachMetrics";
import { Mail, MousePointerClick, Eye, MessageSquare } from "lucide-react";

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function OutreachMetricsChart({ filters }: { filters: { range: string; from?: Date; to?: Date } }) {
  const { data, isLoading } = useOutreachMetrics(filters);

  if (isLoading) return <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-4 w-32 mb-3" /><Skeleton className="h-[250px] w-full" /></CardContent></Card>;

  if (!data?.hasData) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Outreach Effectiveness</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Send outreach emails to see performance metrics. Use the AI Agent to draft and send personalized emails.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle className="text-base">Outreach Effectiveness</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Emails Sent" value={String(data.totalSent)} icon={Mail} />
          <MetricCard label="Open Rate" value={`${data.openRate}%`} icon={Eye} />
          <MetricCard label="Click Rate" value={`${data.clickRate}%`} icon={MousePointerClick} />
          <MetricCard label="Reply Rate" value={`${data.replyRate}%`} icon={MessageSquare} />
        </div>

        {data.dailyData.length > 1 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Emails Sent" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {data.drafted > 0 && (
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Drafted: <strong className="text-foreground">{data.drafted}</strong></span>
            <span>Approved Rate: <strong className="text-foreground">{data.approvedRate}%</strong></span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
