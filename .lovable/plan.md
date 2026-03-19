

## LinkedIn Signals + Compliance Alerts — Two New Agents

### Overview
Create two new edge functions and their corresponding pages/components, plus sidebar navigation entries and routes.

---

### Agent 1: LinkedIn Signals

**Edge Function: `supabase/functions/linkedin-signals/index.ts`**
- Same pattern as `call-prep/index.ts` (CORS, Anthropic API, auth via Bearer token, service role for DB)
- Accepts POST `{ mode: "scan_all" | "single", lead_id?: string, limit?: number }`
- `scan_all`: queries leads with status `new` or `contacted`, limit 20 (or custom), builds context string per lead
- `single`: queries specific lead by ID
- Sends lead data to Anthropic with the full signal detection system prompt (HIRING, COMPLIANCE, LEADERSHIP CHANGE, EXPANSION, RENEWAL WINDOW, NEGATIVE SENTIMENT categories)
- After AI response, updates `trigger_event` on leads with high-confidence signals that are more specific than current value; logs activity for each update
- Returns `{ signals: Array<{lead_id, company_name, signal_type, confidence, explanation, action}>, updated_count }`
- Config: `[functions.linkedin-signals] verify_jwt = false`

**Page: `src/pages/SignalsPage.tsx`**
- Simple wrapper rendering `<SignalsDashboard />`

**Component: `src/components/SignalsDashboard.tsx`**
- Summary cards: total scanned, signals found, high/medium/low counts
- "Scan All Leads" button with loading state
- Signal list grouped by confidence (high first), each in a Card with: company name, signal type badge (color-coded), confidence badge, explanation, suggested action button
- Individual "Check Signal" not needed separately since scan_all handles batching

---

### Agent 2: Compliance Alerts

**Edge Function: `supabase/functions/compliance-alerts/index.ts`**
- Same pattern as above
- Accepts POST `{ state?: string, industry?: string }`
- If no state/industry, queries leads table for unique states and industries
- Sends to Anthropic with full compliance system prompt (federal + state-level topics for 2026)
- After response, auto-creates tasks for high-urgency alerts using service role client
- Returns `{ alerts: Array<{state, topic, urgency, explanation, outreach_angle}>, outreach_opportunities: string }`
- Config: `[functions.compliance-alerts] verify_jwt = false`

**Page: `src/pages/CompliancePage.tsx`**
- Simple wrapper rendering `<ComplianceAlerts />`

**Component: `src/components/ComplianceAlerts.tsx`**
- "Scan Pipeline" button with loading state
- Outreach opportunities section displayed prominently at top
- Alerts grouped by state
- Each alert: urgency badge (red/yellow/green), topic, explanation, outreach angle
- State filter dropdown

---

### Navigation & Routing

**AppSidebar.tsx** — Add two new nav items (with `Radio` and `AlertTriangle` icons from lucide):
- `{ title: "Signals", path: "/signals", icon: Radio }` (after Objection Handler)
- `{ title: "Compliance", path: "/compliance", icon: AlertTriangle }` (after Signals)

**App.tsx** — Add two new routes + imports:
- `/signals` → `SignalsPage`
- `/compliance` → `CompliancePage`

**supabase/config.toml** — Add two function configs

---

### Files Changed
- `supabase/config.toml` — add 2 function configs
- `supabase/functions/linkedin-signals/index.ts` — new
- `supabase/functions/compliance-alerts/index.ts` — new
- `src/components/SignalsDashboard.tsx` — new
- `src/components/ComplianceAlerts.tsx` — new
- `src/pages/SignalsPage.tsx` — new
- `src/pages/CompliancePage.tsx` — new
- `src/components/AppSidebar.tsx` — add 2 nav items
- `src/App.tsx` — add 2 routes + imports

