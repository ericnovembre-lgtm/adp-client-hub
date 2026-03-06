import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company } from "@/types/database";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useCompanies({ page = 1, limit = 50 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ["companies", page, limit],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("companies")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const total = count ?? 0;
      return { data: data as Company[], total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: TablesInsert<"companies">) => {
      const { data, error } = await supabase.from("companies").insert(company).select().single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"companies"> & { id: string }) => {
      const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
