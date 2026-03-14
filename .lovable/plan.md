

## Plan: Add Inline Editing to Lead Detail Sheet

### Approach
Follow the existing pattern from Contact/Deal detail sheets: add a read/edit mode toggle with state management, input fields for editable properties, and save/cancel buttons using the existing `useUpdateLead` mutation.

### Changes

**`src/components/LeadDetailSheet.tsx`** — Major rewrite:

1. **Add imports**: `useState`, `Button`, `Input`, `Select`, `Textarea`, `Pencil`, `X`, `Save` icons, `useUpdateLead` hook, `toast`

2. **Add edit state**: `isEditing` boolean + `editData` object initialized from lead fields when entering edit mode

3. **Header**: Add Edit/Cancel toggle button next to the title. When editing, show Save and Cancel buttons.

4. **Editable fields** (when `isEditing=true`, swap `InfoRow` display for input fields):
   - Company name (Input)
   - Status (Select dropdown: new, contacted, qualified, converted, dismissed)
   - Source (Input)
   - Industry (Input)
   - Headcount (Input type=number)
   - State (Input)
   - Website (Input)
   - Decision maker: name, title, email, phone (Inputs)
   - Trigger type (Select: latent_need, active_trigger)
   - Trigger event (Textarea)
   - AI Pitch Summary (Textarea) — editable so users can refine AI output

5. **Save handler**: Call `useUpdateLead().mutateAsync()` with the edited fields, show success toast, exit edit mode, and call `onLeadUpdated` callback so the parent can refresh data.

6. **Props change**: Add optional `onLeadUpdated?: () => void` callback prop.

**`src/pages/LeadsPage.tsx`** — Minor update:
- Pass `onLeadUpdated` callback to `LeadDetailSheet` that invalidates the leads query (or simply refetch)
- Update `detailLead` state after successful save to reflect new values

