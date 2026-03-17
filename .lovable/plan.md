

## Already Implemented — Minor Cleanup Only

The `ai-chat/index.ts` file **already uses the Anthropic API directly** with `ANTHROPIC_API_KEY` and `api.anthropic.com/v1/messages`. There is no reference to `LOVABLE_API_KEY` or `ai.gateway.lovable.dev`.

The current code matches your requested changes with only these minor differences:

1. **Error message text** (line 156): Currently says `"ANTHROPIC_API_KEY not configured. Get your key from console.anthropic.com..."` — you want just `"ANTHROPIC_API_KEY is not configured"`
2. **402 handler** (lines 181-186): Currently has a `402` status check for "AI credits exhausted" — your version removes this (not relevant for direct Anthropic calls)
3. **Error log label** (line 188): Says `"AI gateway error"` — should say `"Anthropic API error"`
4. **Messages mapping** (line 168): Currently passes `messages` directly — your version explicitly maps to `{ role, content }`
5. **Stream delta check** (line 218): Currently checks `event.delta?.type === "text_delta"` — your version checks `event.delta?.text` (both work, yours is simpler)
6. **message_stop handling** (lines 220-221): Currently handles `message_stop` event — your version omits it (the `done` check handles stream end)
7. **Stream close** (lines 226-230): Currently uses `try/catch/finally` with `controller.close()` in finally — your version closes in the `done` branch and catch

### Plan

Apply these small alignment changes to match your exact specification:

**File: `supabase/functions/ai-chat/index.ts`**
- Line 156: Simplify error message
- Lines 181-186: Remove 402 handler
- Line 188: Change log label to "Anthropic API error"
- Line 168: Map messages explicitly to `{ role, content }`
- Lines 218-222: Simplify delta check to `event.delta?.text`, remove `message_stop` handler
- Lines 204-230: Restructure stream loop to close on `done` and in catch, remove `finally`

