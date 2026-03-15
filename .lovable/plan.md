

## Automatic Lead Qualification — 5 Steps

### Step 1 — Database Trigger (Migration)
Create a migration with `handle_lead_score_change()` function and trigger on `lead_scores` table. The function:
- Auto-qualifies leads with score >= 60 that are "new" or "contacted"
- Logs auto-qualification as a "system" activity
- Flags low-scoring leads (< 40) with territory violations as warning activities

### Step 2 — "Score All Leads" Button on LeadsPage
- Add a "Score All Leads" outline button (Sparkles icon) in the header area (near Import/Export buttons, ~line 699)
- Use a custom event pattern to communicate with AgentPanel: dispatch a `CustomEvent("agent-panel-message")` with the scoring message
- In `AgentPanel`, listen for this event via `useEffect`, open the panel, and auto-send the message

This avoids prop-drilling through the global App layout. The message: *"Score all my new and contacted leads and tell me which ones I should prioritize..."*

### Step 3 — Visual Qualification Indicators in Leads Table
In the Status `<TableCell>` (~line 838-841), add icons next to the status badge:
- `CheckCircle2` (green, size 14) if status is "qualified" AND score >= 60
- `AlertTriangle` (yellow, size 14) if status is "new"/"contacted" AND score < 40

### Step 4 — Enhance LeadDetailSheet Score Section
In `LeadScoreSection` component (~line 35-72):
- After score display, add conditional banners:
  - Green info banner if lead is "new"/"contacted" and score >= 60
  - Yellow warning banner if lead is "new"/"contacted" and score < 40
- Add a "Re-score" ghost button with RefreshCw icon that dispatches the same custom event with a lead-specific message
- Pass `lead` object to `LeadScoreSection` (currently only receives `leadId`)

### Step 5 — Qualification Threshold Setting in SettingsPage
- Add a "Lead Qualification" subsection inside the existing "AI Configuration" card (~line 695)
- Number input for "Auto-Qualify Threshold" (default 60, min 40, max 100, step 5)
- Save to `user_settings` JSON as `auto_qualify_threshold`
- Helper text explaining the setting is for display/future use

### Files Modified
| File | Change |
|------|--------|
| Migration SQL | `handle_lead_score_change()` function + trigger |
| `src/components/AgentPanel.tsx` | Listen for `agent-panel-message` custom events |
| `src/pages/LeadsPage.tsx` | Add "Score All Leads" button + qualification icons in status column |
| `src/components/LeadDetailSheet.tsx` | Add banners + Re-score button to `LeadScoreSection` |
| `src/pages/SettingsPage.tsx` | Add auto-qualify threshold input |

