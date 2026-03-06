import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  type: string,
  description: string,
  contactId?: string | null,
  dealId?: string | null
) {
  const { error } = await supabase.from("activities").insert({
    type,
    description,
    contact_id: contactId ?? null,
    deal_id: dealId ?? null,
  });
  if (error) console.error("Failed to log activity:", error.message);
}
