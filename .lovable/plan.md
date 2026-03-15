

## Switch CRM Agent from Lovable AI Gateway to Anthropic Claude API

### Prerequisites
**ANTHROPIC_API_KEY** is not currently configured. Before deploying, we need to add this secret. The user will need to provide their Anthropic API key from [console.anthropic.com](https://console.anthropic.com).

### Changes — Single file: `supabase/functions/crm-agent/index.ts`

**1. Constants (lines 9-10)**
- Replace `AI_GATEWAY_URL` / `AI_MODEL` with `ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"` and `AI_MODEL = "claude-sonnet-4-20250514"`

**2. CRM_TOOLS array (lines 14-232)**
- Convert all 12 tools from OpenAI format (`{ type: "function", function: { name, description, parameters } }`) to Anthropic format (`{ name, description, input_schema }`)
- Remove `type: "function"` wrapper and `function:` nesting
- Rename `parameters` → `input_schema`

**3. Main handler (lines 619-656)**
- `lovableApiKey` → `anthropicApiKey`, reading from `ANTHROPIC_API_KEY`
- Update error message to reference Anthropic

**4. `runAgentLoop` function (lines 518-615)**
- Extract system message from conversation array → pass as top-level `system` field
- Change fetch to use Anthropic headers: `x-api-key`, `anthropic-version: "2023-06-01"`
- Parse Anthropic response format: `result.content` (array of text/tool_use blocks), `result.stop_reason` ("end_turn"/"tool_use")
- For tool_use blocks: input is already parsed (not a JSON string)
- Tool results sent back as `{ role: "user", content: [{ type: "tool_result", tool_use_id, content }] }`
- Assistant messages added as `{ role: "assistant", content: result.content }`
- Loop continues on `stop_reason === "tool_use"`, breaks on `"end_turn"`

**5. SSE format to frontend — NO changes**
The SSE events (`text`, `tool_call`, `tool_result`, `error`, `[DONE]`) stay identical. No frontend changes needed.

### Deployment
1. Add `ANTHROPIC_API_KEY` secret
2. Rewrite and deploy the edge function
3. Test with `invoke_edge_function`

