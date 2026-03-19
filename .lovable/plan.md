

## Objection Handler Agent

### Overview
Create an edge function for real-time objection handling during calls, a floating quick-access component, a dedicated page, and sidebar nav entry.

### 1. Edge Function: `supabase/functions/objection-handler/index.ts`

Same pattern as `call-prep/index.ts`:
- CORS headers, Anthropic API (`claude-sonnet-4-20250514`), auth via Bearer token + `getUser()`
- Accepts POST `{ objection, industry?, headcount?, context? }`
- Full system prompt with common objection patterns and required response structure (immediate response, data point, redirect question, fallback)
- Returns `{ response, data_point, redirect_question, fallback }`

Config: add `[functions.objection-handler] verify_jwt = false` to `supabase/config.toml`

### 2. Component: `src/components/ObjectionHandler.tsx`

- Large textarea for the objection heard
- Optional industry and headcount fields (compact, collapsible)
- Prominent "Handle It" button with loading state
- Response displayed in large, readable font in a clean Card — optimized for glancing during a call
- Four clearly separated sections: What to Say, Supporting Stat, Redirect Question, If They Push Back
- Minimal, distraction-free design

### 3. Floating Quick-Access: `src/components/ObjectionHandlerFAB.tsx`

- Fixed-position button in bottom-right, offset from the AgentPanel FAB (e.g. `bottom-6 right-24`)
- Shield icon (`ShieldAlert` from lucide)
- Opens the ObjectionHandler in a Sheet (slide-in panel)
- Rendered globally in `App.tsx` alongside `AgentPanel`

### 4. Page: `src/pages/ObjectionHandlerPage.tsx`

Simple wrapper rendering `<ObjectionHandler />` as a full page (for sidebar nav)

### 5. Navigation & Routing

- Add `{ title: "Objection Handler", path: "/objection-handler", icon: ShieldAlert }` to `AppSidebar.tsx`
- Add `/objection-handler` route in `App.tsx` with `ProtectedPage` wrapper
- Import `ObjectionHandlerPage` and `ObjectionHandlerFAB`

### Files Changed
- `supabase/config.toml` — add function config
- `supabase/functions/objection-handler/index.ts` — new edge function
- `src/components/ObjectionHandler.tsx` — new component
- `src/components/ObjectionHandlerFAB.tsx` — new floating button + sheet
- `src/pages/ObjectionHandlerPage.tsx` — new page
- `src/components/AppSidebar.tsx` — add nav item
- `src/App.tsx` — add route, import page, render FAB

