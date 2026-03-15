

## Two Changes: DailyBriefWidget on Dashboard + Lead Scores on LeadsPage & LeadDetailSheet

### Change 1 — Add DailyBriefWidget to DashboardPage

**File:** `src/pages/DashboardPage.tsx`

- Add `import DailyBriefWidget from "@/components/DailyBriefWidget"` 
- Insert `<DailyBriefWidget />` as first child inside the top-level `<div className="space-y-6">`, before the `<h1>` tag

### Change 2 — Lead Score badges on LeadsPage

**File:** `src/pages/LeadsPage.tsx`

- Import `useLeadScores` from `@/hooks/useLeadScores`
- Call `const { leadScores } = useLeadScores()` inside `LeadsPage`
- Add a "Score" `<TableHead>` column between "Eligibility" and the actions column (line ~765)
- Add a `<TableCell>` in each row that looks up `leadScores.get(lead.id)` and renders:
  - Grade badge: A=green, B=blue, C=yellow, D=red, missing=outline "—"
  - Numeric score in `text-xs` next to the badge
- Update skeleton/empty colSpan from 11 to 12

### Change 3 — Lead Score section in LeadDetailSheet

**File:** `src/components/LeadDetailSheet.tsx`

- Import `useLeadScore` from `@/hooks/useLeadScores` and `Progress` from `@/components/ui/progress`
- Call `const { score } = useLeadScore(lead.id)` inside the component
- Add a "Lead Score" section after the AI Pitch Summary section:
  - If score exists: large score number (e.g. "78/100") + grade badge, then each factor as name + progress bar (value = points/max * 100) + reason in text-xs
  - If no score: muted message "No score available. Use the AI Agent to score this lead."

### Files Modified
| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Add DailyBriefWidget import + render above stats |
| `src/pages/LeadsPage.tsx` | Add Score column with grade badges |
| `src/components/LeadDetailSheet.tsx` | Add Lead Score section with factor breakdown |

