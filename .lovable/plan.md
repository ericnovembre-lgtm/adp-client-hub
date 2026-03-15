

## Plan: Persist AI Chat Messages in localStorage

### Changes to `src/components/AIChatWidget.tsx`

1. **Add timestamp to Msg type**: Extend to `{ role; content; timestamp: string }`

2. **Load on mount**: Initialize `messages` state from `localStorage.getItem("saveplus24_chat_history")`, parsed as JSON, falling back to `[]`

3. **Save on change**: `useEffect` watching `messages` — serialize and write to localStorage. If length > 50, slice to keep last 50 before saving.

4. **Clear button**: The Trash2 button already exists in the header — update its `onClick` to also call `localStorage.removeItem("saveplus24_chat_history")`

5. **Add timestamp**: When creating user/assistant messages, include `timestamp: new Date().toISOString()`

Single file change: `src/components/AIChatWidget.tsx`

