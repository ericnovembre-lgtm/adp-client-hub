

## Add Export to PDF/CSV for Reports Page

### Current State
- All 5 collapsible report modules (Quota, Pipeline Velocity, Activity Summary, Revenue Forecast, Lead Source ROI) already have individual CSV export buttons using `exportToCSV`.
- The 6 standalone chart cards (Lead Funnel, Deal Pipeline, Activity Over Time, Lead Sources, Monthly Revenue, plus Outreach/Velocity/Competitor/Score) have no export.

### Plan

**1. Add a global "Export All" dropdown in the Reports page header**
- Place a `DropdownMenu` next to the date range selector with two options: "Export All as CSV" and "Export All as PDF"
- CSV: Collects data from all chart hooks already in scope and exports a single multi-section CSV file
- PDF: Uses `window.print()` with a print-optimized stylesheet (most practical client-side approach without heavy dependencies)

**2. Add individual CSV export buttons to the 6 standalone chart cards**
- Lead Conversion Funnel: export stage/value pairs
- Deal Pipeline Value: export stage/value pairs
- Activity Over Time: export date/call/email/meeting/note rows
- Lead Sources: export source/count pairs
- Monthly Revenue Trend: export month/revenue pairs
- (Outreach, Velocity, Competitor, Score charts already have their own components -- add export there if missing)

**3. PDF export via print stylesheet**
- Add a `@media print` block in `src/index.css` that hides the sidebar, topbar, and collapse/expand controls while making charts full-width
- The global "Export as PDF" button calls `window.print()`, letting the browser's native Save as PDF handle rendering
- This avoids adding heavy libraries like jsPDF/html2canvas

### Files to modify
- `src/pages/ReportsPage.tsx` -- add global export dropdown, add CSV export buttons to standalone cards
- `src/index.css` -- add print media styles
- `src/lib/exportCSV.ts` -- add a `exportMultiSectionCSV` helper for the "Export All" CSV option

### Technical details
- Global CSV concatenates sections with a blank-row separator and section headers
- Print styles: `@media print { .sidebar, [data-sidebar], .topbar { display: none !important; } .reports-grid { break-inside: avoid; } }`
- Each standalone card gets a small ghost Download button in the CardHeader matching existing pattern

