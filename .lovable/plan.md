

## Add Prep Call to ContactDetailSheet

### Changes

**`src/components/ContactDetailSheet.tsx`**
- Import `Phone` icon (already imported) and `CallPrepPanel` component
- Add `showCallPrep` state toggle
- Add a "Prep Call" button after the notes section / before the Separator+Tabs area (around line 265)
- When toggled, render `<CallPrepPanel contact_id={contact.id} />` below the button
- Same pattern used in LeadDetailSheet

Single file change, minimal additions (~15 lines).

