

## Plan: Add Activity Timeline to Lead Detail Sheet

### Problem
The activities table has `contact_id` and `deal_id` columns but no `lead_id` column. We need to add one, then build an activity timeline with an inline "add activity" form in the Lead Detail Sheet.

### Changes

**1. Database migration** — Add `lead_id` column to `activities` table
```sql
ALTER TABLE public.activities ADD COLUMN lead_id uuid DEFAULT NULL;
```

**2. `src/components/LeadDetailSheet.tsx`**
- Add a `useLeadActivities(leadId)` inline query hook (same pattern as `useContactActivities` in `ContactDetailSheet.tsx`) that fetches activities where `lead_id = leadId`, ordered by `created_at desc`, limit 50.
- Add a `useCreateActivity` mutation import.
- Below the action buttons section, add an "Activity" section with:
  - **Add activity form**: A row with a type selector (note / call / email) and a text input + submit button. On submit, insert an activity with `lead_id`, selected type, and description.
  - **Activity timeline**: List of activities matching the lead, showing icon by type, description, and relative timestamp — same UI pattern as `ContactDetailSheet.tsx`.
- Activity type icons: note (FileText), call (Phone), email (Mail).

**3. `src/types/database.ts`**
- Add `lead_id: string | null` to the `Activity` interface.

### Technical Notes
- The `lead_id` column is nullable with no foreign key to avoid migration issues.
- The existing RLS policies on activities allow all authenticated users full CRUD, so no policy changes needed.
- The Supabase types file will auto-update after the migration, but we also update the local `Activity` type for immediate use.

