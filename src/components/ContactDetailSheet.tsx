import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import type { Contact, Activity } from "@/types/database";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Building2, Briefcase, Clock, FileText, ArrowRightLeft, Zap, UserCheck } from "lucide-react";

function useContactActivities(contactId: string | undefined) {
  return useQuery({
    queryKey: ["activities", "contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!contactId,
  });
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="h-3.5 w-3.5" />,
  stage_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  status_change: <Zap className="h-3.5 w-3.5" />,
  conversion: <UserCheck className="h-3.5 w-3.5" />,
};

export default function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
}: {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: activities, isLoading } = useContactActivities(contact?.id);

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{contact.first_name} {contact.last_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {contact.status && (
            <Badge variant="secondary">{contact.status}</Badge>
          )}
          <div className="space-y-2 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />{contact.phone}
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />{contact.company}
              </div>
            )}
            {contact.job_title && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />{contact.job_title}
              </div>
            )}
          </div>
          {contact.notes && (
            <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{contact.notes}</p>
          )}
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !activities?.length ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="mt-0.5 text-muted-foreground">
                    {ACTIVITY_ICONS[a.type] ?? <FileText className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
