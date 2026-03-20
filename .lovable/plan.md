

## Persist Report Section Collapse State in User Settings

### Approach
Store the open/closed state of each collapsible report section in the existing `user_settings` JSONB field. On page load, read from settings; on toggle, debounce-write back. No database changes needed.

### Changes

**1. `src/hooks/useUserSettings.ts`**
- Add `reportSections` field to `UserSettings` interface:
  ```ts
  reportSections?: {
    quota?: boolean;
    velocity?: boolean;
    activitySummary?: boolean;
    forecast?: boolean;
    roi?: boolean;
  };
  ```

**2. `src/pages/ReportsPage.tsx`**
- Import `useUserSettings` and `useUpdateUserSettings`
- Initialize the 5 `useState` hooks from `settings.reportSections` (default `true` if not set)
- Use a `useEffect` to sync initial values once settings load
- Add a debounced save (via `useRef` + `setTimeout`, ~500ms) that calls `updateSettings` with the merged settings whenever any section state changes
- The `toggleAll` function triggers the same save path

### Technical details
- Reuses existing `user_settings` table and JSONB `settings` column -- no migration needed
- Debounce prevents excessive writes when rapidly toggling
- Merges with existing settings via spread operator to avoid overwriting other preferences
- Falls back to all-open if no saved state exists

