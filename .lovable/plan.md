

## Replace AIChatWidget with AgentPanel in App.tsx

**File to modify:** `src/App.tsx`

### Changes
1. Remove `import AIChatWidget from "@/components/AIChatWidget"` (line 23)
2. Add `import AgentPanel from "@/components/AgentPanel"`
3. Replace `<AIChatWidget />` (line 93) with `<AgentPanel />`

No other files modified or deleted.

