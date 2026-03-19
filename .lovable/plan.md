

## No Changes Needed

Both edge functions already contain comprehensive response formatting rules:

**crm-agent/index.ts** (line 278): Has "RESPONSE FORMATTING RULES (STRICTLY ENFORCED)" section with all the requested constraints -- no markdown, no HTML, no emoji, numbered paragraphs, professional tone, lead summary format with company name/contact/headcount/score.

**ai-chat/index.ts** (lines 15-22 and 123-136): Has TWO formatting sections -- one at the top ("MANDATORY") and a reinforcement section at the bottom ("STRICTLY ENFORCED") covering all the same rules.

If the agent is still outputting markdown despite these prompt instructions, the issue is likely model compliance rather than missing prompt rules. Possible next steps would be:
- Adding even stronger phrasing or few-shot examples
- Post-processing the response on the client side to strip markdown artifacts
- Testing with a different model temperature or system prompt structure

No file modifications required.

