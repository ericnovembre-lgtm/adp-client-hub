

## Market Intelligence Feature

Six files to create/modify: edge function, new page, route, sidebar nav, settings section, and user settings hook.

### 1. Edge Function: `supabase/functions/market-intelligence/index.ts`
Create as specified — queries Census Bureau CBP API for state-level industry data across two years, calculates growth rates, scores PEO opportunity, and generates actionable insights. Add `[functions.market-intelligence]` with `verify_jwt = false` to `supabase/config.toml`.

### 2. New Page: `src/pages/MarketIntelligencePage.tsx`
- **Top**: Purple info banner with BarChart3 icon explaining the feature
- **Filters**: State checkboxes (top 15 by GDP), industry checkboxes (11 NAICS sectors), year comparison dropdowns (2018-2023), "Analyze Markets" button with TrendingUp icon
- **Top Opportunities**: Horizontal row of up to 5 Cards with PEO score (color-coded), insight text, action text, and "Find Leads" button linking to AI Discovery
- **Data Table**: Sortable columns (Industry, State, Establishments, Employees, Growth %, Avg Firm Size, PEO Score). Green/red growth arrows, "In Territory" badge for firm size 2-20. Census data source attribution footer.

### 3. Route: `src/App.tsx`
Add `import MarketIntelligencePage` and route `<Route path="/market-intelligence">`.

### 4. Sidebar: `src/components/AppSidebar.tsx`
Add `TrendingUp` import and nav item `{ title: "Market Intel", path: "/market-intelligence", icon: TrendingUp }` after AI Discovery.

### 5. Settings: `src/pages/SettingsPage.tsx`
Add Census API Key section after Yelp section (~line 824) with:
- Password input + "Connected" / "Not configured" / "Works without key" badges
- Helper text about free registration
- Test Connection button

### 6. Hook: `src/hooks/useUserSettings.ts`
Add `census_api_key_configured?: boolean` to `UserSettings` interface.

### Secret
Will use `add_secret` tool to request `CENSUS_API_KEY` from user (optional — function works without it).

### Files

| File | Action |
|------|--------|
| `supabase/functions/market-intelligence/index.ts` | Create |
| `supabase/config.toml` | Add function entry |
| `src/pages/MarketIntelligencePage.tsx` | Create |
| `src/App.tsx` | Add route |
| `src/components/AppSidebar.tsx` | Add nav item |
| `src/pages/SettingsPage.tsx` | Add Census key section |
| `src/hooks/useUserSettings.ts` | Add census field |

