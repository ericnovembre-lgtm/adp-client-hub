

## Database Schema Setup Plan

Create all 7 tables via a single database migration with RLS policies and indexes.

### Migration SQL

One migration that:

1. **Creates tables**: `users`, `contacts`, `companies`, `deals`, `tasks`, `activities`, `leads` with exact columns/types/defaults as specified
2. **Enables RLS** on all 7 tables
3. **Creates RLS policies** — for each table, 4 policies (SELECT, INSERT, UPDATE, DELETE) restricted to `authenticated` role
4. **Creates indexes** on `contacts.email`, `deals.stage`, `leads.status`, `tasks.status`, `activities.created_at`

### Key design decisions

- `users.id` references `auth.users(id) ON DELETE CASCADE`
- `users.role` stored as text (not using the separate `user_roles` pattern since the user explicitly requested a `role` column on the users table)
- Foreign keys: `deals.contact_id` and `deals.company_id` use `ON DELETE SET NULL`; `tasks.deal_id` and `activities.deal_id` use `ON DELETE CASCADE`
- No code changes needed — schema only

### No code modifications

The types file auto-regenerates after migration. No frontend code changes required.

