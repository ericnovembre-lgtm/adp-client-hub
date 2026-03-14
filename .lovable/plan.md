

## Plan: Add Lead Detail Sheet

### Approach
Create a `LeadDetailSheet` component following the existing `DealDetailSheet` / `ContactDetailSheet` pattern, then wire it into `LeadsPage.tsx` so clicking a lead row opens it.

### Changes

**1. New file: `src/components/LeadDetailSheet.tsx`**
- Sheet with all lead fields: company name, decision maker (name, title, email, phone), headcount, industry, state, website, trigger event, trigger type, status, source, created date
- Full AI Pitch Summary section with styled card (not truncated)
- Icons matching the existing detail sheet patterns (Building2, User, Mail, Phone, Globe, MapPin, Users, Briefcase, Zap, Clock)
- Props: `lead: Lead | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`

**2. `src/pages/LeadsPage.tsx`**
- Import `LeadDetailSheet`
- Add state: `selectedLead` and `detailOpen`
- Make each `TableRow` clickable (`onClick` → set selected lead and open sheet)
- Render `<LeadDetailSheet>` at the bottom of the page

