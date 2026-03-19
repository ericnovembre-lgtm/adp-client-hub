import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flame, Shield, Target } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142 76% 36%)",
  "hsl(47 96% 53%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
  "hsl(var(--muted-foreground))",
];

const DISPLACEMENT_COLORS: Record<string, string> = {
  Easy: "hsl(142 76% 36%)",
  Medium: "hsl(47 96% 53%)",
  Hard: "hsl(var(--destructive))",
  Unknown: "hsl(var(--muted-foreground))",
};

function useCompetitorBreakdown() {
  return useQuery({
    queryKey: ["competitor-breakdown"],
    queryFn: async () => {
      // Get leads with providers
      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, company_name, current_provider, displacement_difficulty, headcount, industry")
        .not("current_provider", "is", null);
      if (error) throw error;

      // Get lead scores
      const { data: scores, error: scoresErr } = await supabase
        .from("lead_scores")
        .select("lead_id, score, grade");
      if (scoresErr) throw scoresErr;

      const scoreMap = new Map(scores?.map((s) => [s.lead_id, s]) ?? []);

      // Provider breakdown
      const providerCounts: Record<string, number> = {};
      const displacementCounts: Record<string, number> = {};
      let hotEasyCount = 0;

      interface TopLead {
        id: string;
        company_name: string;
        current_provider: string;
        score: number;
        grade: string;
        displacement_difficulty: string;
      }

      const topLeads: TopLead[] = [];

      for (const lead of leads ?? []) {
        const provider = lead.current_provider ?? "Unknown";
        providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;

        const disp = lead.displacement_difficulty ?? "Unknown";
        displacementCounts[disp] = (displacementCounts[disp] ?? 0) + 1;

        const s = scoreMap.get(lead.id);
        const score = s?.score ?? 0;
        const grade = (s?.grade ?? "D") as string;

        if (score >= 80 && disp === "Easy") hotEasyCount++;

        topLeads.push({
          id: lead.id,
          company_name: lead.company_name,
          current_provider: provider,
          score,
          grade,
          displacement_difficulty: disp,
        });
      }

      topLeads.sort((a, b) => b.score - a.score);

      return {
        providerData: Object.entries(providerCounts).map(([name, value]) => ({ name, value })),
        displacementData: Object.entries(displacementCounts).map(([name, count]) => ({ name, count })),
        hotEasyCount,
        topLeads: topLeads.slice(0, 10),
      };
    },
  });
}

const pieChartConfig = { value: { label: "Leads" } };
const barChartConfig = { count: { label: "Leads", color: "hsl(var(--primary))" } };

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function CompetitorBreakdownWidget({ onLeadClick }: { onLeadClick?: (leadId: string) => void } = {}) {
  const { data, isLoading } = useCompetitorBreakdown();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Competitor Breakdown</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.providerData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Competitor Breakdown</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No competitor data yet. Enrich leads to detect providers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hot leads counter */}
      {data.hotEasyCount > 0 && (
        <Card className="border-emerald-300 dark:border-emerald-800 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/leads")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <Flame className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">{data.hotEasyCount}</span>
              <p className="text-xs text-muted-foreground">hot leads on easy-to-displace competitors</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: by provider */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Leads by Provider</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[220px] w-full">
              <PieChart>
                <Pie data={data.providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {data.providerData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar: by displacement */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Leads by Displacement Difficulty</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[220px] w-full">
              <BarChart data={data.displacementData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.displacementData.map((entry, i) => (
                    <Cell key={i} fill={DISPLACEMENT_COLORS[entry.name] ?? DISPLACEMENT_COLORS.Unknown} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top leads table */}
      {data.topLeads.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Leads by Score</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Displacement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topLeads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate("/leads")}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{lead.current_provider}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{lead.score}</span>
                        <Badge variant="outline" className={`text-xs ${GRADE_COLORS[lead.grade] ?? ""}`}>{lead.grade}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{lead.displacement_difficulty}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
