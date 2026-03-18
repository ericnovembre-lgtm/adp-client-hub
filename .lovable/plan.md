

## Headcount Territory Enforcement — Almost Complete

Nearly everything requested is already implemented. Only **one change** remains:

### Already Done (no changes needed)
1. **`src/lib/constants.ts`** — `HEADCOUNT_MIN`, `HEADCOUNT_MAX`, and `HEADCOUNT_LABEL` already exist
2. **`src/pages/AIDiscoveryPage.tsx`** — Already imports constants, uses them for defaults, and sets `min`/`max` on inputs
3. **`src/pages/SettingsPage.tsx`** — Already imports constants, uses them for placeholders, has territory badge displayed
4. **`supabase/functions/ai-chat/index.ts`** — Already has `TERRITORY` rule for Down Market 2-20 employees
5. **`supabase/functions/scheduled-discovery/index.ts`** — Already enforces 2-20 throughout the prompt

### One Change Required

**`src/pages/LeadsPage.tsx` line 44** — The Zod headcount validation still allows `min(0)` instead of enforcing territory bounds:

```typescript
// Current (line 44):
headcount: z.coerce.number().int().min(0, "Must be 0 or more").optional().or(z.literal(0)),

// Change to:
headcount: z.coerce.number().int().min(HEADCOUNT_MIN, `Minimum ${HEADCOUNT_MIN} employees`).max(HEADCOUNT_MAX, `Maximum ${HEADCOUNT_MAX} employees`).optional(),
```

This enforces that any manually entered or edited lead headcount falls within the 2-20 territory range at the form validation level, complementing the existing visual warning that already displays when headcount is out of territory.

