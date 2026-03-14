

## Plan: Fix TypeScript Type Safety — Remove All `as any` Casts

### Changes

**1. `src/hooks/useUserSettings.ts`** — Extend `UserSettings` interface with all stored fields:
- Add: `scheduler_enabled`, `scheduler_frequency`, `scheduler_industries`, `scheduler_states`, `scheduler_headcount_min`, `scheduler_headcount_max`, `scheduler_last_run`, `scheduler_last_count`, `scheduler_status`, `last_run_at`, `last_found_count`, `next_run_at` (all optional)

**2. `src/pages/DashboardPage.tsx`** (lines 88-90) — Replace `(userSettings as any)?.scheduler_enabled` etc. with direct `userSettings?.scheduler_enabled`, `userSettings?.scheduler_last_run`, `userSettings?.scheduler_last_count`

**3. `src/pages/AIDiscoveryPage.tsx`** (7 casts to remove):
- Line 70-72: Replace `const s = settings as any` block with direct `settings.scheduler_enabled` / `settings.scheduler_frequency`
- Lines 122, 135, 146: Remove `as any` from `updateSettings.mutate()` calls — the extended interface now covers these fields
- Lines 160, 178-180: Replace `(settings as any)?.scheduler_last_run` etc. with `settings?.scheduler_last_run`, `settings?.scheduler_last_count`, `settings?.scheduler_status`

**4. `src/types/database.ts`** — Activity interface already has `lead_id` field. Confirmed present.

**5. `src/hooks/useActivities.ts`** — The `TablesInsert<"activities">` type from Supabase types should already include `lead_id`. Verify the generated types include it; if so, no hook changes needed.

**6. `src/components/LeadDetailSheet.tsx`** (line 131) — Remove `as any` cast from `createActivity.mutateAsync()` call since `lead_id` is part of the insert type.

**7. `src/hooks/useReportsData.ts`** (line ~88) — Change dayMap value type to `{ date: string; [key: string]: string | number }` and remove `(entry as any)` cast.

No functionality changes — types only.

