import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkIndustryKnockout, type KnockoutRule } from "@/lib/knockoutCheck";

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
