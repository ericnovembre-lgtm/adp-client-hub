

## Enforce Down Market Territory (2–20 Employees) Across the App

This is a large cross-cutting change touching 10 files. All headcount logic will reference shared constants.

### Changes

#### 1. `src/lib/constants.ts` — Add territory constants
```typescript
export const HEADCOUNT_MIN = 2;
export const HEADCOUNT_MAX = 20;
export const HEADCOUNT_LABEL = "Down Market (2–20 employees)";
```

#### 2. `src/pages/LeadsPage.tsx` — Visual flagging + territory filter
- Add `territoryOnly` state (default `true`)
- Add toggle button in the header bar: "Show only my territory (2–20)"
- Filter `leads` array client-side: when `territoryOnly`, keep only leads with `headcount` between 2–20 inclusive OR `headcount` is null
- In the headcount `<TableCell>`, add conditional styling:
  - If headcount is outside 2–20: red/orange background + tooltip "Outside your territory (2–20 employees)"
  - If headcount is null: yellow background + tooltip "Headcount unknown — verify before pursuing"
- In `LeadFormDialog`, add a warning below the headcount input when value is outside 2–20: "⚠️ This headcount is outside your down market territory (2–20 employees)" (non-blocking)

#### 3. `src/pages/LeadsPage.tsx` — Convert-to-deal gate
- In `initiateConvert`, before/after knockout check, also check headcount territory
- Add new state `headcountWarningLead` for showing a warning dialog
- Show an `AlertDialog`: "This company has [X] employees, which is outside your down market territory (2–20). Are you sure you want to create a deal?" with Continue/Cancel
- Soft gate — Continue proceeds to existing knockout logic then conversion

#### 4. `src/components/LeadDetailSheet.tsx` — Edit mode warning
- Import constants, watch `editData.headcount`
- Below the headcount input in edit mode, show the same territory warning when value is outside 2–20

#### 5. `src/pages/AIDiscoveryPage.tsx` — Enforce territory range
- Import constants
- Default `headcountMin` to `HEADCOUNT_MIN` (2), `headcountMax` to `HEADCOUNT_MAX` (20)
- Set `min={HEADCOUNT_MIN}` on min input, `max={HEADCOUNT_MAX}` on max input
- Clamp values on change so min can't go below 2, max can't go above 20
- Add note below inputs: "Your territory: Down Market (2–20 employees)"

#### 6. `supabase/functions/scheduled-discovery/index.ts` — Update prompt
- In `DISCOVERY_PROMPT`, change ideal prospect criteria from "5-150" to "2 to 20"
- Add: "CRITICAL: Only generate leads for companies with 2 to 20 employees. This rep works in the ADP TotalSource down market segment."
- In output format section add: "headcount must be between 2 and 20"
- In criteria builder (line ~157), change fallback from `5`/`150` to `2`/`20`

#### 7. `supabase/functions/ai-chat/index.ts` — Update system prompt
- Append to `SYSTEM_PROMPT`: "TERRITORY: The user works in the ADP TotalSource DOWN MARKET segment, which covers companies with 2 to 20 employees. When discussing prospects, strategies, or recommendations, always stay within this segment. If a user asks about a company outside this range, remind them it's outside their territory."

#### 8. `src/pages/SettingsPage.tsx` — Territory display + clamping
- Import constants
- Add a read-only "Territory" badge/card at the top of the Discovery Defaults section
- Clamp headcount min/max inputs to not go outside 2–20

#### 9. `src/pages/DashboardPage.tsx` — Filter top leads
- Import constants
- In the dashboard leads query, add filters: headcount is null OR (headcount >= 2 AND headcount <= 20)
- Uses `.or()` filter on the query

### Files changed (9)
1. `src/lib/constants.ts`
2. `src/pages/LeadsPage.tsx`
3. `src/components/LeadDetailSheet.tsx`
4. `src/pages/AIDiscoveryPage.tsx`
5. `supabase/functions/scheduled-discovery/index.ts`
6. `supabase/functions/ai-chat/index.ts`
7. `src/pages/SettingsPage.tsx`
8. `src/pages/DashboardPage.tsx`

### Edge functions
Both `ai-chat` and `scheduled-discovery` will need redeployment after prompt updates.

