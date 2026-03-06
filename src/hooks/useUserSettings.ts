import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserSettings {
  aiModel?: string;
  aiChatEnabled?: boolean;
  defaultIndustry?: string;
  defaultState?: string;
  defaultHeadcountMin?: number;
  defaultHeadcountMax?: number;
}

export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.settings ?? {}) as UserSettings;
    },
  });
}

export function useUpdateUserSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: user!.id, settings: settings as any, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-settings"] }),
  });
}
