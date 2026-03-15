

## Add Agent Activity Log to Settings Page

**File:** `src/pages/SettingsPage.tsx`

### Changes

1. Add imports: `Bot`, `CheckCircle2`, `XCircle` from lucide-react; `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider` from ui/tooltip
2. Create `AgentActivitySection` component with:
   - `useQuery` fetching from `agent_actions` (limit 50, desc by created_at)
   - `relativeTime` helper for time formatting
   - `formatToolName` helper (underscores → spaces, capitalize)
   - Table with Time, Tool, Risk, Status, Tokens, Latency columns
   - Risk badges: low=green, med=yellow, high=red
   - Status: CheckCircle2 (green) or XCircle (red) with error tooltip
   - Empty state and footer note
3. Insert `<AgentActivitySection />` between the Data Management card and the About card (before line 686)

### Files Modified
| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Add AgentActivitySection component + render |

