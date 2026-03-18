

## Add Plain-Text Formatting Rules to AI System Prompts

Insert the formatting rules block into both edge function system prompts, right after the first sentence and before existing content.

### Changes

**1. `supabase/functions/ai-chat/index.ts` — line 13**

After the first sentence (`...strategize deals.`), insert the formatting rules block before `PRODUCT KNOWLEDGE:`. The prompt string will become:

```
...sales consultant AI assistant embedded in the SavePlus24 CRM. You help the sales rep craft outreach, answer product questions, and strategize deals.

RESPONSE FORMATTING RULES (MANDATORY — follow these in every response):
1. Write in plain text only. Never use markdown syntax (no **, no ##, no |---|, no ```).
2. Never use HTML tags (no <br>, no <b>, no <table>).
3. Never use emoji or emoji codes.
4. Use numbered paragraphs for multi-point responses...
5. For comparisons, write them as numbered items...
6. Keep a professional, conversational tone...
7. When presenting data, integrate numbers naturally...

These rules apply to ALL responses with no exceptions.

PRODUCT KNOWLEDGE:
...
```

**2. `supabase/functions/scheduled-discovery/index.ts` — line 13**

After the first sentence (`...ideal TotalSource prospects.`), insert the same formatting rules block before the `CRITICAL:` line. Same block verbatim.

No other changes — all existing prompt content stays intact.

