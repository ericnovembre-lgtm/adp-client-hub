import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GradeData { grade: string; count: number; pct: number; fill: string; conversionRate: number }

const GRADE_COLORS: Record<string, string> = {
  A: "hsl(160, 60%, 45%)",
  B: "hsl(225, 75%, 55%)",
  C: "hsl(40, 90%, 55%)",
  D: "hsl(0, 84%, 60%)",
};

export function useScoreDistribution() {
  return useQuery({
    queryKey: ["score-distribution"],
    queryFn: async () => {
      const { data: scores, error: sErr } = await supabase.from("lead_scores").select("lead_id, grade, score");
      if (sErr) throw sErr;
      if (!scores || scores.length === 0) return { grades: [] as GradeData[], avgScore: 0, hasData: false, bestGrade: "A" };

      const { data: leads } = await supabase.from("leads").select("id, status");
      const statusMap = new Map<string, string>();
      for (const l of leads ?? []) statusMap.set(l.id, l.status ?? "new");

      const gradeMap: Record<string, { count: number; converted: number }> = { A: { count: 0, converted: 0 }, B: { count: 0, converted: 0 }, C: { count: 0, converted: 0 }, D: { count: 0, converted: 0 } };
      let totalScore = 0;

      for (const s of scores) {
        const g = s.grade as string;
        if (!(g in gradeMap)) continue;
        gradeMap[g].count++;
        totalScore += s.score;
        const st = statusMap.get(s.lead_id);
        if (st === "converted" || st === "qualified") gradeMap[g].converted++;
      }

      const total = scores.length;
      const grades: GradeData[] = ["A", "B", "C", "D"].map(g => ({
        grade: g,
        count: gradeMap[g].count,
        pct: total > 0 ? Math.round((gradeMap[g].count / total) * 100) : 0,
        fill: GRADE_COLORS[g],
        conversionRate: gradeMap[g].count > 0 ? Math.round((gradeMap[g].converted / gradeMap[g].count) * 100) : 0,
      }));

      const bestGrade = grades.reduce((best, g) => g.conversionRate > best.conversionRate ? g : best, grades[0]);

      return { grades, avgScore: Math.round(totalScore / total), hasData: true, bestGrade: bestGrade.grade };
    },
  });
}
