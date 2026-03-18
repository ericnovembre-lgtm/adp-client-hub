

## No Changes Needed

The `scheduled-discovery/index.ts` file **already uses the Anthropic API directly** with all the exact patterns you requested:

- **Line 81**: `const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");`
- **Line 83**: `if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY not configured");`
- **Line 116**: Fetches `https://api.anthropic.com/v1/messages` with `x-api-key` header
- **Lines 123-130**: Uses `claude-sonnet-4-20250514`, `system: DISCOVERY_PROMPT`, correct message format
- **Line 140**: `const content = aiData.content?.[0]?.text ?? "[]";` (Anthropic response format)

There is no reference to `LOVABLE_API_KEY`, `ai.gateway.lovable.dev`, or OpenAI-style response parsing anywhere in the file. All requested changes are already in place.

