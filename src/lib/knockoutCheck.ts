import { supabase } from "@/integrations/supabase/client";

export interface KnockoutResult {
  isKnockout: boolean;
  tier: 'prohibited' | 'low_probability' | 'bluefield' | 'clear';
  matchedRules: Array<{
    industry_name: string;
    tier: string;
    conditions: string | null;
    wc_codes: string | null;
  }>;
  message: string;
}

export async function checkIndustryKnockout(
  industry: string | null | undefined,
  companyName?: string,
  description?: string
): Promise<KnockoutResult> {
  if (!industry || !industry.trim()) {
    return { isKnockout: false, tier: 'clear', matchedRules: [], message: 'No industry provided.' };
  }

  // Fetch all knockout rules
  const { data: rules, error } = await supabase
    .from("knockout_rules")
    .select("*");

  if (error || !rules) {
    return { isKnockout: false, tier: 'clear', matchedRules: [], message: 'Unable to check knockout rules' };
  }

  const searchText = [industry, companyName, description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check for matches (fuzzy keyword matching)
  const matched = rules.filter(rule => {
    const keywords = rule.industry_name.toLowerCase().split(/[\s\/,()]+/).filter(w => w.length > 3);
    return keywords.some(keyword => searchText.includes(keyword));
  });

  if (matched.length === 0) {
    return { isKnockout: false, tier: 'clear', matchedRules: [], message: 'No knockout rules matched. Industry appears eligible.' };
  }

  // Sort by severity: prohibited > low_probability > bluefield
  const severity: Record<string, number> = { prohibited: 3, low_probability: 2, bluefield: 1 };
  matched.sort((a, b) => (severity[b.tier] || 0) - (severity[a.tier] || 0));

  const worstTier = matched[0].tier as KnockoutResult['tier'];

  const messages: Record<string, string> = {
    prohibited: `⛔ PROHIBITED: This industry is NOT eligible for ADP TotalSource. Matched: ${matched.map(r => r.industry_name).join(', ')}`,
    low_probability: `⚠️ LOW PROBABILITY (95-99% prohibited): This industry is almost certainly ineligible. Best-in-class consideration only. Matched: ${matched.map(r => r.industry_name).join(', ')}`,
    bluefield: `🔵 BLUEFIELD (Conditional): This industry may be eligible with specific conditions. Matched: ${matched.map(r => `${r.industry_name}${r.conditions ? ` — ${r.conditions}` : ''}`).join(', ')}`,
  };

  return {
    isKnockout: worstTier === 'prohibited',
    tier: worstTier,
    matchedRules: matched,
    message: messages[worstTier] || 'Unknown tier',
  };
}
