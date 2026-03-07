import { supabase } from "@/integrations/supabase/client";

export interface KnockoutRule {
  id: string;
  industry_name: string;
  tier: "prohibited" | "low_probability" | "bluefield";
  wc_codes: string | null;
  conditions: string | null;
}

export interface KnockoutResult {
  tier: "prohibited" | "low_probability" | "bluefield" | null;
  rule: KnockoutRule | null;
}

/**
 * Check if an industry matches any knockout rule.
 * Uses case-insensitive partial matching on industry_name.
 */
export async function checkIndustryKnockout(
  industry: string | null | undefined,
  _companyName?: string,
  _description?: string
): Promise<KnockoutResult> {
  if (!industry || !industry.trim()) {
    return { tier: null, rule: null };
  }

  const normalised = industry.trim().toLowerCase();

  const { data, error } = await supabase
    .from("knockout_rules")
    .select("*")
    .ilike("industry_name", `%${normalised}%`);

  if (error) {
    console.error("Knockout check error:", error);
    return { tier: null, rule: null };
  }

  if (!data || data.length === 0) {
    return { tier: null, rule: null };
  }

  // Priority: prohibited > low_probability > bluefield
  const priorityOrder: Record<string, number> = {
    prohibited: 0,
    low_probability: 1,
    bluefield: 2,
  };

  const sorted = [...data].sort(
    (a, b) =>
      (priorityOrder[a.tier] ?? 99) - (priorityOrder[b.tier] ?? 99)
  );

  const match = sorted[0];
  return {
    tier: match.tier as KnockoutResult["tier"],
    rule: match as KnockoutRule,
  };
}
