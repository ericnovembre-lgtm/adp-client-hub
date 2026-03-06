import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/types/database";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useDeals({ page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ["deals", page, limit],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("deals")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const total = count ?? 0;
      return { data: data as Deal[], total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Deal;
    },
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deal: TablesInsert<"deals">) => {
      const { data, error } = await supabase.from("deals").insert(deal).select().single();
      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"deals"> & { id: string }) => {
      const { data, error } = await supabase.from("deals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
