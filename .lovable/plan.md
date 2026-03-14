

## Plan: Add Knockout Warning Badge to Lead Detail Sheet

### Approach
Extract the `EligibilityBadge`, `checkKnockoutLocal`, and `LocalKnockoutResult` from `LeadsPage.tsx` into a shared location, then use them in `LeadDetailSheet.tsx` to display the knockout tier badge prominently near the top of the sheet.

### Changes

**1. Extract shared knockout utilities**
- Move `LocalKnockoutResult` interface, `checkKnockoutLocal` function, and `EligibilityBadge` component from `src/pages/LeadsPage.tsx` into new files:
  - `src/lib/knockoutLocal.ts` — the interface and check function
  - `src/components/EligibilityBadge.tsx` — the badge component
- Update `LeadsPage.tsx` to import from these new locations instead of defining inline.

**2. `src/components/LeadDetailSheet.tsx`**
- Import `useKnockoutRules` hook, `checkKnockoutLocal`, and `EligibilityBadge`.
- After fetching knockout rules, compute the knockout result for the current lead's industry using `useMemo`.
- Display the `EligibilityBadge` in the status/source badge row at the top of the sheet, right next to the existing status and source badges.
- When the tier is not `clear`, also show the full warning message below the badge row in a small alert-style card (colored by tier) so the user sees the details before clicking Convert.

### Result
Users will see a prominent eligibility badge (Eligible / Conditional / Low Probability / Prohibited) with tooltip details directly in the Lead detail sheet, giving them immediate risk awareness before taking any action.

