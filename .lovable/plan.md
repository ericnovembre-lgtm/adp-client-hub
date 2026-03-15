

## Add type safety improvements across the codebase

### Problem
Multiple `as any` casts and loose `string` types reduce type safety. Six locations use `as any` unnecessarily, and entity types use `string` where union types would catch bugs at compile time.

### Changes

#### 1. `src/types/database.ts` — Add union types

Add type aliases and narrow fields:
- `DealStage` = `"lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost"` (already in constants.ts, re-export or use)
- `LeadStatus` = `"new" | "contacted" | "qualified" | "converted" | "dismissed"`
- `ContactStatus` = `"lead" | "prospect" | "customer" | "inactive"`
- `TaskPriority` = `"low" | "medium" | "high" | "critical"`
- `TaskStatus` = `"open" | "completed" | "cancelled"`
- `ActivityType` = `"note" | "call" | "email" | "meeting" | "status_change" | "stage_change" | "conversion" | "system"`

Update interface fields to use these unions (keeping `| null` where already nullable). Keep `string` as a fallback via `| string` to avoid breaking existing data that might not match.

#### 2. `src/pages/DealsPage.tsx` — Remove `as any` casts

- **Line 607**: `setView(v as any)` → type the `view` state as `"kanban" | "list"` and cast properly: `setView(v as "kanban" | "list")`
- **Line 118**: `"" as any` for value → change form default to `undefined` and adjust schema to handle empty
- **Line 132**: `payload: any` → type as `Partial<Deal> & { title: string }`
- **Line 299**: `updates: any` → type as `{ id: string; stage: string; closed_at?: string | null }`

#### 3. `src/pages/CompaniesPage.tsx` — Remove `as any` (line 60)
- `employees: company?.employees ?? ("" as any)` → use `undefined` as default, adjust schema

#### 4. `src/components/ActivityTimeline.tsx` — Remove `as any` (line 67)
- Type the insert payload properly with a discriminated object

#### 5. `src/components/DealDetailSheet.tsx` — Remove `as any` (line 109)
- Type `updates` object properly

### Files changed (5)
- `src/types/database.ts`
- `src/pages/DealsPage.tsx`
- `src/pages/CompaniesPage.tsx`
- `src/components/ActivityTimeline.tsx`
- `src/components/DealDetailSheet.tsx`

