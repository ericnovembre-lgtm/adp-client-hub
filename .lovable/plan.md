

## Battlecard Agent

### Overview
Create an edge function that generates personalized competitive battlecards and a UI component/page, integrated into LeadDetailSheet and sidebar navigation.

### 1. Edge Function: `supabase/functions/battlecard/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS headers, Anthropic API (`claude-sonnet-4-20250514`), auth via Bearer token + `getUser()`
- Accepts POST `{ competitor, industry?, headcount?, state?, lead_id? }`
- If `lead_id` provided, fetches lead record for context (industry, headcount, state, trigger_event)
- Sends to Anthropic with the full competitor database system prompt and battlecard structure (7 sections: summary, weaknesses, strengths, discovery questions, state advantage, displacement email, one-liner)
- Returns `{ battlecard: string, competitor: string, displacement_email: string }`

Config: add `[functions.battlecard] verify_jwt = false` to `supabase/config.toml`

### 2. Component: `src/components/BattlecardPanel.tsx`

- Props: `lead_id?: string, defaultCompetitor?: string, defaultIndustry?: string, defaultHeadcount?: number, defaultState?: string`
- Competitor dropdown (Rippling, TriNet, Paychex, Insperity, Justworks, VensureHR, Gusto, BambooHR, Other)
- Optional fields: industry, headcount, state
- "Generate Battlecard" button with loading state
- Displays battlecard text in a Card
- "Copy Displacement Email" button that copies extracted email to clipboard

### 3. Page: `src/pages/BattlecardsPage.tsx`

Simple wrapper rendering `<BattlecardPanel />`

### 4. LeadDetailSheet Integration

- Add `showBattlecard` state toggle
- Add "Battlecard" button in action buttons section (with `Swords` icon)
- Auto-detect competitor from `lead.trigger_event` to pre-fill the dropdown
- Render `<BattlecardPanel>` when toggled

### 5. Navigation & Routing

- Add `{ title: "Battlecards", path: "/battlecards", icon: Swords }` to `AppSidebar.tsx`
- Add `/battlecards` route in `App.tsx` with `ProtectedPage` wrapper
- Import `BattlecardsPage`

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/battlecard/index.ts` — new edge function
- `src/components/BattlecardPanel.tsx` — new component
- `src/pages/BattlecardsPage.tsx` — new page
- `src/components/LeadDetailSheet.tsx` — add button + panel toggle
- `src/components/AppSidebar.tsx` — add nav item
- `src/App.tsx` — add route + import

