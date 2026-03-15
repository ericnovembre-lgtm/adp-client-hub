import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentRecommendation {
  id: string;
  user_id: string;
  type: 'stalled_deal' | 'overdue_task' | 'uncontacted_lead' | 'territory_violation' | 'pipeline_gap' | 'follow_up_due';
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  priority: number;
  dismissed: boolean;
  created_at: string;
}

const QUERY_KEY = ['agent-recommendations'];

export function useAgentRecommendations() {
  const queryClient = useQueryClient();

  const { data: recommendations = [], isLoading } = useQuery<AgentRecommendation[]>({
    queryKey: QUERY_KEY,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_recommendations')
        .select('*')
        .eq('dismissed', false)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentRecommendation[];
    },
  });

  const dismissRecommendation = async (id: string) => {
    const { error } = await supabase
      .from('agent_recommendations')
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error("Failed to dismiss recommendation");
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
  };

  const markActedOn = async (id: string) => {
    const { error } = await supabase
      .from('agent_recommendations')
      .update({ acted_on: true, acted_on_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error("Failed to mark recommendation as acted on");
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
  };

  const refreshBrief = async () => {
    const { error } = await supabase.functions.invoke('agent-daily-brief');
    if (error) {
      toast.error("Failed to refresh daily brief");
    } else {
      toast.success("Daily brief refreshed");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
  };

  return {
    recommendations,
    isLoading,
    count: recommendations.length,
    dismissRecommendation,
    markActedOn,
    refreshBrief,
  };
}
