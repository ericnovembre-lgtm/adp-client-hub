

# Add "Created by" Column to Knockout Rules Table

## Overview
Add a "Created by" column to the knockout rules table in Settings that displays the username or email of the user who created each rule, using the `user_id` foreign key to look up from the `users` table.

## Changes

### 1. Update `useKnockoutRules` hook (`src/hooks/useKnockoutRules.ts`)
- Modify the query to fetch the associated user info by doing a second lookup or by fetching users separately
- Since there's no FK constraint between `knockout_rules.user_id` and `public.users.id`, we'll fetch all relevant users in a single query and map them client-side
- Add a `created_by_name` resolved field

### 2. Update `KnockoutRulesSection` in `src/pages/SettingsPage.tsx`
- Add a new `<TableHead>` for "Created by" (hidden on small screens via `hidden xl:table-cell`)
- Add corresponding `<TableCell>` showing the user's name or email
- Update the skeleton loader and empty-state `colSpan` from 5 to 6
- Uses the user data from the hook to display the creator's name

### Technical Approach
- In the `useKnockoutRules` hook, after fetching rules, extract unique `user_id` values and batch-fetch from the `users` table
- Return enriched rules with a `created_by_name` field
- This avoids needing a database migration or foreign key changes

