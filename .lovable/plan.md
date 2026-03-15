

## Plan: Persist AI Chat History Between Sessions

Save chat conversations to the database so they survive page refreshes and sessions.

### Database Change

Create a `chat_messages` table:

```sql
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own messages" ON public.chat_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at);
```

### Code Changes — `src/components/AIChatWidget.tsx`

1. **Load on mount**: Query `chat_messages` ordered by `created_at` when widget opens, populate `messages` state.

2. **Save on send**: After user sends a message, insert a `user` row. After streaming completes (`onDone`), insert the final `assistant` row.

3. **Clear chat**: When trash button is clicked, delete all rows for the user and clear local state.

4. Use `useAuth()` to get `user.id` for the queries. If no user, fall back to in-memory only (no persistence).

### Data flow

```text
User sends message → insert user msg to DB → stream AI response → on complete, insert assistant msg to DB
Widget opens → SELECT messages WHERE user_id = auth.uid() ORDER BY created_at → populate state
Clear button → DELETE FROM chat_messages WHERE user_id = auth.uid() → clear state
```

No new hooks file needed — keep the logic inline in the widget since it's self-contained.

