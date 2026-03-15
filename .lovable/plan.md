

## Create `src/hooks/useAgentChat.ts`

### What will be created

A new hook file that manages SSE-streamed conversations with the `crm-agent` edge function. It uses `useAuth()` to get the session, raw `fetch` for the POST, and parses SSE events for text, tool calls, tool results, and errors.

### Key details
- Interfaces: `AgentToolCall`, `AgentMessage`
- State: `messages`, `isLoading`, `sessionId` (UUID per conversation)
- `sendMessage(text)`: appends user msg, fetches SSE stream from `crm-agent`, parses `data:` lines into text/tool_call/tool_result/error events, builds assistant message incrementally
- `clearChat()`: resets messages, new sessionId
- Auth from `useAuth()` — session access token in Authorization header
- No existing files modified

### Files
| File | Action |
|------|--------|
| `src/hooks/useAgentChat.ts` | Create |

