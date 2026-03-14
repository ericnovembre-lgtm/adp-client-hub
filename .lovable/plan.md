

## Plan: Consolidate Constants and Create Shared ActivityTimeline

### 1. Create `src/lib/constants.ts`

Export these shared constants:
- `LEAD_STATUS_COLORS` — from LeadsPage (used in LeadsPage + LeadDetailSheet)
- `DEAL_STAGE_COLORS` — the stage badge color map (used in DealsPage + DealDetailSheet)
- `DEAL_STAGE_LABELS` — stage label map (used in DealsPage + DealDetailSheet)
- `ACTIVITY_TYPES` — `["note", "call", "email"] as const`

Note: `ACTIVITY_ICONS` contains JSX (React nodes), so it will live in the ActivityTimeline component instead of a pure constants file. The Deal/Contact sheets use a different icon set (stage_change, conversion) than the Lead sheet (call, email) — the ActivityTimeline will merge both sets.

Also export `DEAL_STAGES` array and `STAGE_HEADER_COLORS` from DealsPage since they're related.

### 2. Create `src/components/ActivityTimeline.tsx`

Shared component with props:
- `entityType: "lead" | "contact" | "deal"`
- `entityId: string`
- `showAddForm?: boolean` (default true for leads, false for deals/contacts which currently don't have add forms)

Internally:
- Query activities by `${entityType}_id = entityId`
- Merged `ACTIVITY_ICONS` map covering all types (note, call, email, stage_change, status_change, conversion)
- When `showAddForm` is true: render the type selector + input + send button (using `useCreateActivity`)
- Render the timeline list (loading skeletons, empty state, activity items)

### 3. Update files to import from constants

**LeadsPage.tsx**: Replace local `statusColors` with import of `LEAD_STATUS_COLORS`

**LeadDetailSheet.tsx**: 
- Import `LEAD_STATUS_COLORS` (replacing local `statusColors`)
- Remove local `ACTIVITY_ICONS`, `ACTIVITY_TYPES`, `useLeadActivities`
- Remove activity timeline JSX block + related state (`activityType`, `activityText`)
- Add `<ActivityTimeline entityType="lead" entityId={lead.id} showAddForm />`

**DealsPage.tsx**: Import `DEAL_STAGE_LABELS`, `DEAL_STAGE_COLORS` (replacing local `STAGE_LABELS`, `STAGE_BADGE_COLORS`)

**DealDetailSheet.tsx**:
- Import `DEAL_STAGE_LABELS`, `DEAL_STAGE_COLORS` (replacing local constants)
- Remove local `ACTIVITY_ICONS`, `useDealActivities`, timeline JSX
- Add `<ActivityTimeline entityType="deal" entityId={deal.id} showAddForm={false} />`

**ContactDetailSheet.tsx**:
- Remove local `ACTIVITY_ICONS`, `useContactActivities`, timeline JSX
- Add `<ActivityTimeline entityType="contact" entityId={contact.id} showAddForm={false} />`

### Files changed
- `src/lib/constants.ts` (new)
- `src/components/ActivityTimeline.tsx` (new)
- `src/pages/LeadsPage.tsx` (import constant)
- `src/pages/DealsPage.tsx` (import constants)
- `src/components/LeadDetailSheet.tsx` (import constants + use ActivityTimeline)
- `src/components/DealDetailSheet.tsx` (import constants + use ActivityTimeline)
- `src/components/ContactDetailSheet.tsx` (import constant + use ActivityTimeline)

No visual changes.

