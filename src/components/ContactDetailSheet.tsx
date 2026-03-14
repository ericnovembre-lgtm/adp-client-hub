import { useLocation } from "wouter";
import type { Contact } from "@/types/database";
import ActivityTimeline from "@/components/ActivityTimeline";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, Briefcase } from "lucide-react";

export default function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
}: {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, navigate] = useLocation();

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
                <Building2 className="h-4 w-4" />
                {contact.company_id ? (
                  <button
                    onClick={() => { onOpenChange(false); navigate("/companies"); }}
                    className="text-primary hover:underline"
                  >
                    {contact.company}
                  </button>
                ) : (
                  contact.company
                )}
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

        <ActivityTimeline entityType="contact" entityId={contact.id} />
      </SheetContent>
    </Sheet>
  );
}
