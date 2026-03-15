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

  // Generic words that appear across many industries — skip for keyword matching
  const GENERIC_WORDS = new Set([
    'services', 'service', 'general', 'other', 'operations', 'operation',
    'products', 'product', 'systems', 'system', 'management', 'companies',
    'company', 'work', 'workers', 'professional', 'national', 'state',
    'united', 'american', 'commercial', 'industrial', 'independent',
    'health', 'care', 'home', 'transportation', 'construction',
    'manufacturing', 'processing', 'equipment', 'installation',
  ]);

  const matched = rules.filter(rule => {
    const ruleName = rule.industry_name.toLowerCase().trim();

    // 1. Exact / full phrase match (either direction)
    if (searchText.includes(ruleName) || ruleName.includes(searchText.split(' ').slice(0, 4).join(' '))) {
      // Only match if the search text is specific enough (>= 2 words overlap or exact)
      if (searchText.includes(ruleName)) return true;
      const searchWords = searchText.split(/\s+/).filter(w => w.length > 2);
      const ruleWords = ruleName.split(/[\s\/,()]+/).filter(w => w.length > 2);
      const overlap = ruleWords.filter(w => searchWords.includes(w)).length;
      if (overlap >= 2) return true;
    }

    // 2. Keyword matching — require multiple specific keyword hits
    const keywords = ruleName.split(/[\s\/,()]+/).filter(w => w.length > 3 && !GENERIC_WORDS.has(w));
    if (keywords.length === 0) return false;

    const matchedKeywords = keywords.filter(kw => searchText.includes(kw));

    // Single keyword must be long and specific (>6 chars)
    if (keywords.length === 1) {
      return matchedKeywords.length === 1 && matchedKeywords[0].length > 6;
    }

    // Multiple keywords: require at least 2 matches
    return matchedKeywords.length >= 2;
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
