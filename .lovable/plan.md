

## Add "Save to Notes" Button to Call Prep Briefing

### Overview
Add a "Save to Notes" button next to Copy/Refresh in the CallPrepPanel. For contacts, it appends the briefing to the existing `notes` field. For leads, a `notes` column needs to be added first.

### Changes

**1. Database Migration — Add `notes` column to leads table**
- `ALTER TABLE public.leads ADD COLUMN notes text;`

**2. `src/types/database.ts`** — Add `notes: string | null` to the `Lead` interface

**3. `src/components/CallPrepPanel.tsx`**
- Add `Save to Notes` button (using `StickyNote` or `FileText` icon) in the button row
- Add `saving` state and `handleSaveToNotes` function
- Logic: fetch current notes for the lead/contact, append briefing with a timestamp header, update the record via Supabase, show success toast
- Props remain the same (`lead_id`, `contact_id`) — the component determines which table to update

### Technical Detail
- `handleSaveToNotes` will:
  1. Determine table (`leads` or `contacts`) based on which prop is provided
  2. Fetch current `notes` value
  3. Append `\n\n--- Call Prep (date) ---\n` + briefing text
  4. Update the record
  5. Invalidate relevant query cache (pass `queryClient` or just show toast — parent will refetch on next open)

