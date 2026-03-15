

## Create `src/components/AgentPanel.tsx`

A Sheet-based AI Agent chat interface using `useAgentChat` and `useAgentRecommendations`.

### Structure

1. **Trigger**: Fixed bottom-right circular button (Bot icon, gradient bg, recommendation count badge)
2. **Sheet** (right side, 480px): Full-height flex column with header, messages, quick actions, input
3. **Header**: Title with Sparkles, subtitle, New Chat button
4. **Messages**: Scrollable area with user (right, blue) and assistant (left, gray) bubbles. Tool calls rendered as collapsible cards with contextual icons and color-coded borders
5. **Quick Actions**: Horizontal scrolling pills above input
6. **Input**: Textarea-like input with Send button, loading dots

### Tool call icon mapping
- `search_*` → Search
- `get_pipeline`/`get_activity` → BarChart3
- `check_knockout` → ShieldCheck
- `update_*` → Pencil
- `create_task` → Plus
- `log_activity` → FileText
- `draft_email` → Mail
- Default → Wrench

### Files
| File | Action |
|------|--------|
| `src/components/AgentPanel.tsx` | Create |

No existing files modified.

