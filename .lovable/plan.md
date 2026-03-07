

## Fix False-Positive Knockout Eligibility Badges

### Problem

The AI Discovery correctly avoids generating leads in prohibited industries (no roofing, trucking, mining, etc. appeared). However, the eligibility badges on the Leads page show false positives — "Financial Services", "Software Development", "Healthcare", and "Manufacturing" are incorrectly flagged as "Prohibited" due to overly aggressive fuzzy matching in `knockoutCheck.ts`.

The current matcher splits knockout rule industry names into individual words >3 chars and checks if any single keyword appears in the lead's industry text. Common words like "services", "health", "care", "manufacturing" appear in both prohibited industry names and legitimate ones, causing false matches.

### Fix — `src/lib/knockoutCheck.ts`

Improve the matching algorithm to reduce false positives:

1. **Full phrase matching first** — Check if the rule's full industry name (lowercased) is contained in the search text, or vice versa
2. **Multi-word keyword matching** — Instead of matching any single word, require at least 2 keywords to match (or the single keyword must be >6 chars and specific)
3. **Exclusion list for common words** — Skip generic words like "services", "general", "other", "operations", "products", "systems", "management" from keyword matching since they appear in many industries

### What stays the same

- The `KnockoutResult` interface
- The function signature
- The overall flow (fetch rules, match, return worst tier)
- The scheduled-discovery edge function prompt (already correctly excludes prohibited industries)

### Expected outcome

- "Financial Services" → Eligible (no longer matches "Ambulance Transport Services" via "services")
- "Software Development" → Eligible
- "Healthcare" → Eligible (no longer matches "Home Health Care" via "health"/"care")
- "Manufacturing" → Eligible (no longer matches niche manufacturing knockouts)
- Actual prohibited industries like "Roofing", "Trucking", "Mining" still correctly flagged

