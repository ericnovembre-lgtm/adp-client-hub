

## Mark Lead411 as Deferred & Update UI

### Overview
Lead411 requires a work email for signup and is deferred. The edge function and Growth Signals tab already exist but should be updated to clearly communicate the deferred status. No code deletion — keep infrastructure ready for when Lead411 is activated later.

### Changes

#### 1. `src/components/GrowthSignalsPanel.tsx`
- Add a prominent "Deferred" banner at the top explaining Lead411 requires a work email and is not yet active
- Disable the "Find Growing Companies" button with a tooltip explaining it's deferred
- Show a message: "Lead411 requires a work email for signup. This feature will activate when LEAD411_API_KEY is configured."

#### 2. `src/pages/SettingsPage.tsx` — Lead411 Card
- Add a "Deferred" badge next to the title (amber/yellow styling)
- Add explanatory text: "Requires work email signup at lead411.com. $99/month Spark plan. Add later when needed for trigger event data."
- Keep the Test Connection button but disable it with a note that the API key isn't configured yet

#### 3. `src/pages/AIDiscoveryPage.tsx` — Growth Signals Tab
- Add a small "(Deferred)" label or badge next to the "Growth Signals" tab trigger text to signal it's not yet active

#### 4. No edge function changes
- `supabase/functions/lead411-intent/index.ts` already returns a helpful error when `LEAD411_API_KEY` is missing — no changes needed

### Files Changed
- `src/components/GrowthSignalsPanel.tsx` — add deferred banner
- `src/pages/SettingsPage.tsx` — update Lead411 card with deferred status
- `src/pages/AIDiscoveryPage.tsx` — add deferred indicator on tab

