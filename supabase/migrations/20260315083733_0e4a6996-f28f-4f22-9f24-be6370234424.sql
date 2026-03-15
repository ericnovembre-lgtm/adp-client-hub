CREATE TABLE public.email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  event_type text NOT NULL,
  url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select tracking events"
  ON public.email_tracking_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can insert tracking events"
  ON public.email_tracking_events FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_tracking_message ON public.email_tracking_events(message_id);

CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  recipient_email text NOT NULL,
  subject text,
  contact_id uuid,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select email_send_log"
  ON public.email_send_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_send_log"
  ON public.email_send_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_email_send_log_contact ON public.email_send_log(contact_id);
CREATE INDEX idx_email_send_log_message ON public.email_send_log(message_id);