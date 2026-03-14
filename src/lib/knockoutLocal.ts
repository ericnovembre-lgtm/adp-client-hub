import type { KnockoutRule } from "@/hooks/useKnockoutRules";

export interface LocalKnockoutResult {
  tier: 'prohibited' | 'low_probability' | 'bluefield' | 'clear';
  matchedRules: KnockoutRule[];
  message: string;
}

export function checkKnockoutLocal(industry: string | null | undefined, rules: KnockoutRule[]): LocalKnockoutResult {
  if (!industry?.trim() || rules.length === 0) {
    return { tier: 'clear', matchedRules: [], message: '' };
  }

  const searchText = industry.toLowerCase();

  const matched = rules.filter(rule => {
    const keywords = rule.industry_name.toLowerCase().split(/[\s\/,()]+/).filter(w => w.length > 3);
    return keywords.some(keyword => searchText.includes(keyword));
  });

  if (matched.length === 0) {
    return { tier: 'clear', matchedRules: [], message: 'Industry appears eligible.' };
  }

  const severity: Record<string, number> = { prohibited: 3, low_probability: 2, bluefield: 1 };
  matched.sort((a, b) => (severity[b.tier] || 0) - (severity[a.tier] || 0));
  const worstTier = matched[0].tier as LocalKnockoutResult['tier'];

  const messages: Record<string, string> = {
    prohibited: `⛔ PROHIBITED: ${matched.map(r => r.industry_name).join(', ')}`,
    low_probability: `⚠️ LOW PROBABILITY: ${matched.map(r => r.industry_name).join(', ')}`,
    bluefield: `🔵 BLUEFIELD: ${matched.map(r => `${r.industry_name}${r.conditions ? ` — ${r.conditions}` : ''}`).join(', ')}`,
  };

  return { tier: worstTier, matchedRules: matched, message: messages[worstTier] || '' };
}
