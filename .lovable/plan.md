

## Send Emails Directly from CRM with Open/Click Tracking

### Current State
- A `DraftEmailDialog` exists that drafts emails from templates and copies them to clipboard — no actual sending.
- An email domain (`notify.eric.novembre`) is configured but DNS is still pending. Emails cannot be sent until DNS is verified.
- No email infrastructure (queue, send log, etc.) is set up yet.

### What We'll Build

**1. Email Infrastructure Setup**
- Run `setup_email_infra` to create the email queue, `email_send_log` table, suppression list, and `process-email-queue` cron job.

**2. Database: `email_tracking_events` table**
Track opens and clicks per sent email:
```sql
CREATE TABLE public.email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  event_type text NOT NULL, -- 'open' or 'click'
  url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can select tracking events"
  ON public.email_tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can insert tracking events"
  ON public.email_tracking_events FOR INSERT TO anon WITH CHECK (true);
CREATE INDEX idx_tracking_message ON public.email_tracking_events(message_id);
```

**3. Edge Function: `email-tracker`**
A public endpoint (no JWT) that handles:
- **GET `/email-tracker?type=open&mid=<message_id>`** — returns a 1×1 transparent pixel, inserts an open event
- **GET `/email-tracker?type=click&mid=<message_id>&url=<encoded_url>`** — inserts a click event, 302 redirects to the target URL

**4. Edge Function: `send-crm-email`**
Authenticated endpoint that:
- Accepts `{ to, subject, body, contact_id }` from the frontend
- Generates a unique `message_id`
- Injects a tracking pixel `<img>` for open tracking
- Rewrites `<a href>` links to route through `email-tracker` for click tracking
- Enqueues the email via transactional email infrastructure
- Logs an activity ("Email sent to …")
- Returns `{ message_id }` to the frontend

**5. Update `DraftEmailDialog`**
- Add a **"Send Email"** button alongside the existing "Copy to Clipboard" button
- Requires the contact to have an email address
- Calls `send-crm-email` edge function
- Shows success/failure toast
- Logs activity on success

**6. Email Sent History & Tracking UI**
- Add an **"Emails"** tab or section in `ContactDetailSheet` showing sent emails for that contact
- Display subject, date sent, open count, click count from `email_send_log` + `email_tracking_events`

### Files Changed
- **Migration** — new `email_tracking_events` table
- **Infrastructure** — `setup_email_infra` call
- `supabase/functions/email-tracker/index.ts` — tracking pixel + click redirect
- `supabase/functions/send-crm-email/index.ts` — send with tracking injection
- `supabase/config.toml` — new function configs
- `src/components/DraftEmailDialog.tsx` — add Send button
- `src/components/ContactDetailSheet.tsx` — email history section

### Important Note
The email domain DNS is still pending. Everything will be built and deployed, but actual email delivery will only work once DNS verification completes. The user can monitor this in Cloud settings.

