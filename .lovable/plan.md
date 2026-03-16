

# Switch ai-chat Edge Function to Anthropic Claude API

## Overview
Replace the Lovable AI Gateway (Gemini) with the Anthropic Claude API in the `ai-chat` edge function, matching the pattern already used in `crm-agent`. Transform the Anthropic SSE stream to OpenAI-compatible format for the existing frontend.

## Changes

### `supabase/functions/ai-chat/index.ts`
1. **API key**: Replace `LOVABLE_API_KEY` with `ANTHROPIC_API_KEY`
2. **Fetch call**: Switch endpoint to `https://api.anthropic.com/v1/messages` with Claude headers and `claude-sonnet-4-20250514` model. Move system prompt to `system` field.
3. **Stream transform**: Replace direct `response.body` pass-through with a `ReadableStream` that converts Anthropic events (`content_block_delta` → OpenAI `choices[0].delta.content`, `message_stop` → `[DONE]`)
4. **Error handling**: Keep existing 429/402/500 handling as-is

No frontend changes needed -- the `DraftEmailDialog` already parses OpenAI-format SSE, which the transform preserves.

