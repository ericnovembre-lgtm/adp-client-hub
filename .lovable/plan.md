

## Cleanup Tasks: Delete AIChatWidget + Census NAICS Fallback

### Assessment of Requested Changes

**Fix Prompt 4 — Already Done:**
- The Agent Activity Log section already exists in `SettingsPage.tsx` (lines 346-478) with all requested features: relative time, tool names, risk badges, error tooltips, tokens, latency.
- `AIChatWidget.tsx` is not imported anywhere — only referenced in `tsconfig.app.tsbuildinfo` (build cache). It just needs to be deleted.

**Fix Prompt 5 — Partial:**
1. **Census NAICS fallback**: `market-intelligence/index.ts` line 219 returns `null` on first failure without retrying with `NAICS2012`. Needs the retry block.
2. **Constants check**: `HEADCOUNT_MIN=2`, `HEADCOUNT_MAX=20`, `HEADCOUNT_LABEL="Down Market (2–20 employees)"` — already correct.
3. **Scheduled-discovery "5-150" check**: Already uses "2-20" everywhere — no fix needed.

### Plan

**1. Delete `src/components/AIChatWidget.tsx`**
Remove the file entirely. No imports to clean up.

**2. Add NAICS2012 fallback in `supabase/functions/market-intelligence/index.ts`**
In `fetchCBP` (line 218-219), after parsing the initial response, if `data.length < 2`, retry with `NAICS2012` instead of `NAICS2017`:

```typescript
let data = await response.json();

// Fallback: try NAICS2012 for older years
if (!data || data.length < 2) {
  params.delete("NAICS2017");
  params.set("NAICS2012", naics);
  const retryUrl = `https://api.census.gov/data/timeseries/cbp?${params}`;
  const retryResp = await fetch(retryUrl);
  if (!retryResp.ok) return null;
  data = await retryResp.json();
  if (!data || data.length < 2) return null;
}
```

Then redeploy the `market-intelligence` edge function.

