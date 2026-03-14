

## Plan: Add Draft Email & Convert to Deal Actions in Lead Detail Sheet

### Approach
Add action buttons at the bottom of the Lead Detail Sheet that trigger the existing conversion and email drafting workflows already implemented in LeadsPage. The sheet will accept callback props from the parent page.

### Changes

**1. `src/components/LeadDetailSheet.tsx`**
- Add two new props: `onDraftEmail?: (lead: Lead) => void` and `onConvertToDeal?: (lead: Lead) => void`
- Add a sticky action bar at the bottom of the sheet content (before the created date) with two buttons:
  - "Draft Email" (FileText icon) -- calls `onDraftEmail(lead)` and closes the sheet
  - "Convert to Deal" (ArrowRightLeft icon) -- calls `onConvertToDeal(lead)` and closes the sheet
- Hide Convert button if lead status is already "converted"
- Buttons use outline variant, displayed in a flex row with gap

**2. `src/pages/LeadsPage.tsx`**
- Pass two new callback props to `<LeadDetailSheet>`:
  - `onDraftEmail={(lead) => { setDetailLead(null); setEmailLead(lead); }}`
  - `onConvertToDeal={(lead) => { setDetailLead(null); initiateConvert(lead); }}`
- This reuses the existing `setEmailLead` and `initiateConvert` functions with no duplication

