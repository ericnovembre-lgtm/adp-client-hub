

## Follow-Up Sequence Agent

### Overview
Create an edge function that generates a 5-touch follow-up sequence using Anthropic, auto-creates tasks for each touch, and a panel component to trigger it from the Lead Detail Sheet.

### 1. Edge Function: `supabase/functions/follow-up-sequence/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS headers, Anthropic API setup, `claude-sonnet-4-20250514`
- Auth via `supabase.auth.getUser()` with Bearer token
- Accepts POST `{ lead_id, first_contact_type, notes? }`
- Fetches lead record + recent activities from DB (scoped to user)
- Sends to Anthropic with the detailed system prompt (5-touch sequence over 14 days, each touch a different angle)
- Parses response, creates 5 tasks in `tasks` table with calculated `due_date` (today + day offset), appropriate priority
- Logs activity: "Generated 5-touch follow-up sequence for [company]"
- Returns `{ sequence: string, tasks_created: number }`

Config: add `[functions.follow-up-sequence] verify_jwt = false` to `supabase/config.toml`

### 2. Component: `src/components/FollowUpSequencePanel.tsx`

- Props: `lead_id: string`
- Radio buttons for `first_contact_type` (call / email / meeting)
- Optional notes textarea
- "Generate Sequence" button with loading state
- Displays generated sequence in a timeline layout (day markers, touch type badges, message content)
- Shows "5 tasks created" confirmation badge after completion
- Invalidates `tasks` and `activities` query caches

### 3. Update: `src/components/LeadDetailSheet.tsx`

- Add `showFollowUp` state toggle (same pattern as `showCallPrep`)
- Add "Follow-Up Sequence" button in the action buttons section
- When toggled, render `<FollowUpSequencePanel lead_id={lead.id} />` with a section header

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/follow-up-sequence/index.ts` — new edge function
- `src/components/FollowUpSequencePanel.tsx` — new component
- `src/components/LeadDetailSheet.tsx` — add button + panel toggle

