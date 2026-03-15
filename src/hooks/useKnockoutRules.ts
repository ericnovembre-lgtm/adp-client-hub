import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkIndustryKnockout } from "@/lib/checkKnockoutFromDB";

export interface KnockoutRule {
  id: string;
  industry_name: string;
  tier: string;
  wc_codes: string | null;
  conditions: string | null;
  created_at: string | null;
  user_id: string;
}

export function useKnockoutRules(tier?: string) {
  return useQuery({
    queryKey: ["knockout-rules", tier],
    queryFn: async () => {
      let query = supabase.from("knockout_rules").select("*").order("industry_name");
      if (tier) {
        query = query.eq("tier", tier);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as KnockoutRule[];
    },
  });
}

export function useCheckKnockout(industry: string | null | undefined) {
  return useQuery({
    queryKey: ["knockout-check", industry],
    enabled: !!industry?.trim(),
    queryFn: () => checkIndustryKnockout(industry),
  });
}

export function useCreateKnockoutRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: { industry_name: string; tier: string; wc_codes?: string | null; conditions?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("knockout_rules").insert({ ...rule, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knockout-rules"] });
    },
  });
}

export function useUpdateKnockoutRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; industry_name?: string; tier?: string; wc_codes?: string | null; conditions?: string | null }) => {
      const { data, error } = await supabase.from("knockout_rules").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knockout-rules"] });
    },
  });
}

export function useDeleteKnockoutRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knockout_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knockout-rules"] });
    },
  });
}
