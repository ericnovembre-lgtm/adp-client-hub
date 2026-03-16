

# Fix: Add Plain-Text Formatting Rules to Agent Prompts

## Problem
The CRM agent and AI chat return markdown/HTML formatting (tables, bold markers, emoji) that renders as raw code in the plain-text agent panel.

## Changes

### 1. `supabase/functions/crm-agent/index.ts` (line 276)
Insert formatting rules block just before the closing `\`;` of `SYSTEM_PROMPT` (after "recommend broker/field team consultation" on line 276). The rules instruct the model to use plain text only — no markdown, no HTML, no emoji, numbered paragraphs for leads, priority tier headers in plain text.

Also update line 229 to remove the instruction "use tables for multi-record results" (contradicts plain-text rule) and replace with "use numbered paragraphs for multi-record results".

### 2. `supabase/functions/ai-chat/index.ts` (line 112)
Insert the same formatting rules block just before the closing `\`;` of `SYSTEM_PROMPT` (after the benefits questions section, before `[Knowledge Version:...`).

### 3. No changes to `scheduled-discovery` (outputs JSON, not user-facing text).

### Formatting Rules Content (appended to both prompts)
Plain-text only output rules covering: no markdown syntax, no HTML tags, no emoji, no markdown tables; leads presented as numbered summary paragraphs with company name/contact/headcount/score/action; priority tiers as plain header lines; professional conversational tone.

