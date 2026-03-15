

## Persist AI Chat History Between Sessions

### What changes
Replace the current `localStorage`-based chat persistence with database-backed storage so conversations survive across devices and sessions.

### Database Migration

Create a `chat_messages` table with RLS policies restricting access to the owning user:

```sql
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own messages" ON public.chat_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at);
```

Note: Using a validation trigger instead of CHECK constraint for the `role` column to avoid immutability issues.

### Code Changes — `src/components/AIChatWidget.tsx`

1. **Remove** `localStorage` helpers (`loadMessages`, `saveMessages`, `STORAGE_KEY`) and the `useEffect` that persists to localStorage.

2. **Import** `supabase` client and `useAuth` from AuthContext.

3. **Load on mount**: When widget opens and user is authenticated, query `chat_messages` ordered by `created_at` ascending, populate `messages` state. Show loading skeleton briefly.

4. **Save on send**: After creating `userMsg`, insert it into `chat_messages`. After streaming completes in `onDone`, insert the final assistant message.

5. **Clear chat**: Trash button calls `DELETE FROM chat_messages WHERE user_id = auth.uid()` then clears local state.

6. **Fallback**: If no authenticated user, keep messages in memory only (no DB calls).

### Files changed
- **Migration** — new `chat_messages` table
- `src/components/AIChatWidget.tsx` — swap localStorage for database persistence

