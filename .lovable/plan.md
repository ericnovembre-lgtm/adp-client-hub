

# Switch scheduled-discovery to Anthropic Claude API

## Overview
Same migration as ai-chat: replace Lovable AI Gateway (Gemini) with Anthropic Claude API in `supabase/functions/scheduled-discovery/index.ts`.

## Changes in `supabase/functions/scheduled-discovery/index.ts`

1. **API key**: `LOVABLE_API_KEY` → `ANTHROPIC_API_KEY`
2. **Fetch endpoint**: `ai.gateway.lovable.dev/v1/chat/completions` → `api.anthropic.com/v1/messages` with Anthropic headers (`x-api-key`, `anthropic-version`)
3. **Request body**: Move system prompt to top-level `system` field, use `claude-sonnet-4-20250514`, add `max_tokens: 4096`
4. **Response parsing**: `aiData.choices?.[0]?.message?.content` → `aiData.content?.[0]?.text` (non-streaming)

No other files affected. The `ANTHROPIC_API_KEY` secret is already configured from the previous crm-agent/ai-chat migrations.

