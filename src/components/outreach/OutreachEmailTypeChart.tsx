import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { EmailTypeMetric } from "@/hooks/useOutreachAnalytics";

interface Props {
  data: EmailTypeMetric[] | undefined;
  isLoading: boolean;
}

export default function OutreachEmailTypeChart({ data, isLoading }: Props) {
  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  if (!data?.length || data.length < 2) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Email Type Performance</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={160} />
              <Tooltip />
              <Legend />
              <Bar dataKey="openRate" name="Open Rate %" fill="hsl(var(--chart-2))" />
              <Bar dataKey="clickRate" name="Click Rate %" fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          {data.map(d => (
            <span key={d.type}>{d.label}: <strong>{d.sent}</strong> sent</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
