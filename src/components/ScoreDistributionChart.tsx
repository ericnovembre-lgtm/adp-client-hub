import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useScoreDistribution } from "@/hooks/useScoreDistribution";
import { Star } from "lucide-react";

export default function ScoreDistributionChart() {
  const { data, isLoading } = useScoreDistribution();

  if (isLoading) return <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-4 w-32 mb-3" /><Skeleton className="h-[250px] w-full" /></CardContent></Card>;

  if (!data?.hasData) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Lead Score Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Run waterfall enrichment on your leads to see score distribution. Scores are calculated automatically during enrichment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle className="text-base">Lead Score Distribution</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donut */}
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.grades} dataKey="count" nameKey="grade" cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                  label={({ grade, pct }) => `${grade} (${pct}%)`} labelLine fontSize={11}>
                  {data.grades.map((g, i) => <Cell key={i} fill={g.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, `Grade ${name}`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
              {data.grades.map(g => (
                <span key={g.grade}><strong className="text-foreground">{g.grade}</strong>: {g.count}</span>
              ))}
            </div>
          </div>

          {/* Conversion rate bars */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Conversion Rate by Grade</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.grades} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis type="category" dataKey="grade" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={30} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Conversion"]} />
                <Bar dataKey="conversionRate" radius={[0, 4, 4, 0]}>
                  {data.grades.map((g, i) => <Cell key={i} fill={g.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Your highest-converting grade is <strong className="text-foreground">{data.bestGrade}</strong>. Focus outreach on {data.bestGrade}-grade leads for best ROI.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
