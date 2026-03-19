

## Klue Competitive Intelligence Integration

### Overview
Four-part integration: new edge function, Settings UI section, new KlueIntelPanel component on Battlecards page, and search_klue tool in crm-agent.

### 1. Edge Function: `supabase/functions/klue-intelligence/index.ts`

New function following existing patterns (CORS headers, auth via getUser). Connects to Klue Content API (`https://app.klue.com/extract/cards.json`) with Bearer token from `KLUE_API_KEY` secret. Two modes:
- `cards`: fetches raw cards filtered by competitor/tags
- `search`: fetches cards then sends to Anthropic for AI analysis of a specific question

Returns `{ cards, card_count, analysis? }`. Handles missing API key gracefully with `klue_not_configured` error.

Config: add `[functions.klue-intelligence] verify_jwt = false` to `supabase/config.toml`.

### 2. Settings Page: Klue Section

Add to `src/pages/SettingsPage.tsx` after the OpenCorporates section (~line 951):
- New state variables: `klueKeyConfigured`, `testingKlue`
- Load from `settings.klue_api_key_configured` in the useEffect
- Card with "Klue Competitive Intelligence" title, description about Content API
- Status badge (Connected/Not configured)
- "Test Connection" button that invokes `klue-intelligence` with `{ mode: "cards" }` and shows card count

Update `UserSettings` interface in `useUserSettings.ts` to add `klue_api_key_configured?: boolean`.

### 3. Component: `src/components/KlueIntelPanel.tsx`

- Competitor dropdown (All Competitors + the standard list)
- Free-form question text input
- "Search Klue" button
- Displays AI analysis when in search mode, or raw card summaries when browsing all
- Shows card count

### 4. Battlecards Page Update

Convert `src/pages/BattlecardsPage.tsx` to use Tabs:
- Tab 1: "AI Battlecard" — existing BattlecardPanel
- Tab 2: "Klue Intel" — new KlueIntelPanel

### 5. CRM Agent: search_klue Tool

In `supabase/functions/crm-agent/index.ts`:
- Add `search_klue` to CRM_TOOLS array (line ~196) with competitor + question input schema
- Add `search_klue: "low"` to TOOL_RISK map
- Add tool handler in executeTool switch that fetches from klue-intelligence function internally
- Append Klue integration note to SYSTEM_PROMPT before the closing backtick (line ~296)

### 6. Secret Setup

Use `add_secret` tool to prompt user for `KLUE_API_KEY`.

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/klue-intelligence/index.ts` — new
- `src/components/KlueIntelPanel.tsx` — new
- `src/pages/BattlecardsPage.tsx` — add tabs with Klue panel
- `src/pages/SettingsPage.tsx` — add Klue settings section
- `src/hooks/useUserSettings.ts` — add klue_api_key_configured
- `supabase/functions/crm-agent/index.ts` — add search_klue tool + handler + system prompt update

