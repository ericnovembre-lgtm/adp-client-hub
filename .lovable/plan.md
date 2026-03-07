

## Add Quick-Action Buttons to AI Chat Widget

Add a set of quick-action suggestion chips to the chat widget that appear when the conversation is empty, giving users one-click access to common CRM tasks.

### Changes

**`src/components/AIChatWidget.tsx`**

1. Define a constant array of quick actions with label and pre-filled prompt:
   - "Draft cold email" → sends a prompt asking the assistant to draft a cold outreach email
   - "Suggest follow-up" → asks for follow-up strategy suggestions
   - "Qualifying questions" → asks for prospect qualifying questions
   - "Sales pitch ideas" → asks for pitch angles for PEO services

2. Render these as clickable chips/buttons in the empty state (where the welcome message currently is), below the intro text.

3. Clicking a chip calls `send()` with the chip's prompt text pre-filled, triggering the AI response immediately.

4. The chips disappear once the conversation has messages (they only show in the empty state).

### UI Design
- Small outline/secondary buttons arranged in a flex-wrap grid below the welcome text
- Use subtle styling consistent with the existing muted empty state

