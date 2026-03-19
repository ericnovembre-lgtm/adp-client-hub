

## Quote Readiness Checker

### Overview
Create a quote readiness edge function + UI component that checks whether a prospect is ready for Gallagher quoting submission, and add it to both the LeadDetailSheet and as a standalone page.

### 1. Edge Function: `supabase/functions/quote-readiness/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS, Anthropic API (`claude-sonnet-4-20250514`), auth via `supabase.auth.getUser()`
- Accepts POST `{ lead_id?, state, headcount, currently_enrolled?, current_carrier?, is_self_funded? }`
- If `lead_id` provided, fetches lead record for additional context (industry, company name, etc.)
- Queries `knockout_rules` to check industry eligibility
- Sends all data to Anthropic with the full system prompt from the request (PRIME vs Standard rules, state exceptions, required documents, carrier options, red flags)
- Returns `{ checklist: string, group_type: "prime" | "standard", state_available: boolean, industry_status: string }`

Add `[functions.quote-readiness] verify_jwt = false` to `supabase/config.toml`.

### 2. Component: `src/components/QuoteReadinessPanel.tsx`

- Props: `lead_id?: string, defaultState?: string, defaultHeadcount?: number`
- Inputs: state dropdown (all 50 US states), headcount number, currently enrolled number, current carrier text, self-funded checkbox
- "Check Readiness" button with loading state
- Displays result in a Card with:
  - Group type badge (PRIME/Standard)
  - State availability indicator (green/red)
  - Industry status badge (clear/bluefield/low_probability/prohibited with appropriate colors)
  - Checklist text in a pre-formatted block
- Color-coded sections based on keywords in the response (green for met, yellow for warnings, red for blockers)

### 3. Update: `src/components/LeadDetailSheet.tsx`

- Add `showQuoteReadiness` state toggle
- Add "Quote Readiness" button in the action buttons section (next to Follow-Up Sequence)
- Render `<QuoteReadinessPanel lead_id={lead.id} defaultState={lead.state} defaultHeadcount={lead.headcount} />` when toggled

### 4. Standalone Page: `src/pages/QuoteReadinessPage.tsx`

- Simple page wrapper rendering `<QuoteReadinessPanel />` without pre-filled lead data
- Add to `src/App.tsx` routes as `/quote-readiness`
- Add to `src/components/AppSidebar.tsx` nav items with `ClipboardCheck` icon

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/quote-readiness/index.ts` — new edge function
- `src/components/QuoteReadinessPanel.tsx` — new component
- `src/components/LeadDetailSheet.tsx` — add button + panel toggle
- `src/pages/QuoteReadinessPage.tsx` — new standalone page
- `src/components/AppSidebar.tsx` — add nav item
- `src/App.tsx` — add route

