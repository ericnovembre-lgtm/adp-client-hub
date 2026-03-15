import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Mail, Eye, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailLog {
  id: string;
  message_id: string | null;
  recipient_email: string;
  subject: string | null;
  status: string | null;
  created_at: string | null;
}

interface TrackingEvent {
  message_id: string;
  event_type: string;
}

export default function EmailHistory({ contactId }: { contactId: string }) {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["email-history", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const messageIds = (emails ?? [])
    .map((e) => e.message_id)
    .filter(Boolean) as string[];

  const { data: trackingEvents } = useQuery({
    queryKey: ["email-tracking", contactId, messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const { data, error } = await supabase
        .from("email_tracking_events")
        .select("message_id, event_type")
        .in("message_id", messageIds);
      if (error) throw error;
      return data as TrackingEvent[];
    },
    enabled: messageIds.length > 0,
  });

  const trackingMap = (trackingEvents ?? []).reduce(
    (acc, evt) => {
      if (!acc[evt.message_id]) acc[evt.message_id] = { opens: 0, clicks: 0 };
      if (evt.event_type === "open") acc[evt.message_id].opens++;
      if (evt.event_type === "click") acc[evt.message_id].clicks++;
      return acc;
    },
    {} as Record<string, { opens: number; clicks: number }>
  );

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!emails?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <Mail className="h-8 w-8" />
        <p className="text-sm">No emails sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {emails.map((email) => {
        const tracking = email.message_id ? trackingMap[email.message_id] : null;
        return (
          <div
            key={email.id}
            className="rounded-md border bg-card p-3 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium truncate flex-1">
                {email.subject || "(No subject)"}
              </p>
              <Badge
                variant={email.status === "sent" ? "default" : "destructive"}
                className="shrink-0 text-xs"
              >
                {email.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {email.created_at
                ? format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")
                : "—"}
            </p>
            {tracking && (
              <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {tracking.opens} {tracking.opens === 1 ? "open" : "opens"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  {tracking.clicks} {tracking.clicks === 1 ? "click" : "clicks"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
