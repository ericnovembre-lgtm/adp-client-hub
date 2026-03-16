

## Add Copy to Clipboard Button on Agent Responses

### What
Add a small "Copy" icon button that appears on hover over assistant message bubbles in the Agent Panel, allowing users to quickly copy response text (especially email drafts) to their clipboard.

### How

**File: `src/components/AgentPanel.tsx`**

1. Import `Copy` and `Check` icons from lucide-react
2. Modify the `MessageBubble` component for assistant messages:
   - Wrap the content bubble in a `relative group` container
   - Add a copy button that appears on hover (top-right corner)
   - On click, copy `msg.content` to clipboard via `navigator.clipboard.writeText()`
   - Show a brief checkmark icon for 2 seconds after successful copy, then revert to the copy icon
   - Show a "Copied!" toast via sonner on success

### Design
- Button: ghost variant, small icon-only, semi-transparent background
- Position: top-right of the assistant bubble, visible only on hover (`opacity-0 group-hover:opacity-100`)
- Only shown on assistant messages that have text content

