import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScoreFactor {
  factor: string;
  points: number;
  max: number;
  reason: string;
}

export interface LeadScore {
  id: string;
  lead_id: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: ScoreFactor[];
  scored_at: string;
}

export function useLeadScores() {
  const { data: leadScores = new Map<string, LeadScore>(), isLoading } = useQuery({
    queryKey: ['lead-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scores')
        .select('*');
      if (error) throw error;
      const map = new Map<string, LeadScore>();
      for (const row of data ?? []) {
        map.set(row.lead_id, {
          id: row.id,
          lead_id: row.lead_id,
          score: row.score,
          grade: row.grade as LeadScore['grade'],
          factors: (row.factors ?? []) as unknown as ScoreFactor[],
          scored_at: row.scored_at ?? row.created_at ?? '',
        });
      }
      return map;
    },
  });

  return { leadScores, isLoading };
}

export function useLeadScore(leadId: string) {
  const { data: score = null, isLoading } = useQuery({
    queryKey: ['lead-score', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        lead_id: data.lead_id,
        score: data.score,
        grade: data.grade as LeadScore['grade'],
        factors: (data.factors ?? []) as unknown as ScoreFactor[],
        scored_at: data.scored_at ?? data.created_at ?? '',
      } as LeadScore;
    },
  });

  return { score, isLoading };
}
