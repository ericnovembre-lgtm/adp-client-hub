

## Territory Summary Widget for Dashboard

### What we're building
A compact card on the Dashboard that shows a visual breakdown of leads by territory status: **in-territory** (headcount 2–20), **out-of-territory** (headcount outside 2–20), and **unknown** (null headcount). Includes counts, percentages, and a segmented progress bar.

### Design
The widget will sit between the stat cards and the two-column section. It will be a single `Card` with:
- Title: "Territory Coverage"
- Three labeled segments: In-Territory (green), Out-of-Territory (red), Unknown (yellow)
- A stacked horizontal bar showing proportions
- Count + percentage for each segment

### Implementation

**1. Add a `useTerritoryStats` hook in `useDashboardStats.ts`**
- Query all non-dismissed leads, selecting only `headcount`
- Compute three counts client-side: `inTerritory` (2–20), `outOfTerritory` (defined but outside range), `unknown` (null)
- Return counts and percentages

**2. Add the Territory Summary widget to `DashboardPage.tsx`**
- Import the new hook and `Progress` component
- Render a `Card` after the stat cards grid with three inline stats and a custom stacked bar (three colored `div`s with percentage widths inside a rounded container)
- Use `MapPin` icon from lucide-react
- Show skeleton while loading

### Files changed
- `src/hooks/useDashboardStats.ts` — add `useTerritoryStats` export
- `src/pages/DashboardPage.tsx` — import and render territory widget

