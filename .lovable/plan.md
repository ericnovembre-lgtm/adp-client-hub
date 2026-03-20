

## Make 5 Report Modules Collapsible

### Approach
Wrap each of the 5 new report modules (Quota Attainment, Pipeline Velocity, Activity Summary, Revenue Forecast, Lead Source ROI) in a `Collapsible` component from the existing `@/components/ui/collapsible` library. Each section gets a clickable header with a chevron indicator that toggles visibility of the report content. All sections default to open.

### Changes

**`src/pages/ReportsPage.tsx`**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown` from lucide-react
- Add 5 `useState<boolean>` hooks (all defaulting to `true`)
- Wrap each of the 5 report components in a `Collapsible` block with:
  - A styled trigger bar showing section name + rotating chevron
  - The report component inside `CollapsibleContent`
- Each collapsible section spans full width (`lg:col-span-2`) so the trigger header sits cleanly above the report card

