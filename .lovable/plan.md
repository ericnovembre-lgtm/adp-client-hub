

## Add Formatting Rules After Opening Lines in Both Edge Functions

### Current State
- **ai-chat/index.ts**: Already has "RESPONSE FORMATTING RULES" at lines 15-24, immediately after the opening line. These rules match what you requested (plain text, no markdown, no HTML, no emoji, numbered paragraphs, conversational tone, etc.).
- **crm-agent/index.ts**: Has "RESPONSE FORMATTING RULES" at lines 278-287, but at the **end** of the system prompt, not right after the opening line.

### What Needs to Change

**ai-chat/index.ts** — No change needed. The formatting rules are already positioned right after the opening line.

**crm-agent/index.ts** — Insert the following paragraph on line 206, right after the opening line ("You are the SavePlus24 AI Agent..."):

```
RESPONSE FORMAT RULES — follow these in every response:
1. Write in plain text only. Do not use markdown syntax like **, ##, |---|, or triple backticks.
2. Do not use HTML tags like <br>, <b>, or <table>.
3. Do not use emoji or emoji codes.
4. Use numbered paragraphs for multi-point responses.
5. For comparisons, write them as numbered items with the name followed by a colon and comparison in sentence form. Do not use tables.
6. Keep a professional, conversational tone.
7. When presenting data, put numbers naturally into sentences instead of using tables or bullet lists.
```

The existing formatting rules block at lines 278-287 will be preserved (not removed), per your instruction.

### Files Modified
1. `supabase/functions/crm-agent/index.ts` — Insert formatting paragraph after line 205's opening sentence

