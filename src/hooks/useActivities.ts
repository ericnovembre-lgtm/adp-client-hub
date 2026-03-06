import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "@/types/database";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useActivities({ page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ["activities", page, limit],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("activities")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const total = count ?? 0;
      return { data: data as Activity[], total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  });
}

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: ["activities", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Activity;
    },
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity: TablesInsert<"activities">) => {
      const { data, error } = await supabase.from("activities").insert(activity).select().single();
      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"activities"> & { id: string }) => {
      const { data, error } = await supabase.from("activities").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}
