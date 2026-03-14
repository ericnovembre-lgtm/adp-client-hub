import { format } from "date-fns";
import type { Lead } from "@/types/database";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, User, Mail, Phone, Globe, MapPin, Users, Briefcase,
  Zap, Clock, Sparkles, Tag,
} from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  dismissed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

export default function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lead.company_name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColors[lead.status ?? "new"] ?? statusColors.new} variant="outline">
              {lead.status ?? "new"}
            </Badge>
            {lead.source && <Badge variant="secondary">{lead.source}</Badge>}
          </div>

          {/* Company Info */}
          <div className="space-y-3">
            <InfoRow icon={<Building2 className="h-4 w-4" />} label="Industry" value={lead.industry} />
            <InfoRow icon={<Users className="h-4 w-4" />} label="Headcount" value={lead.headcount?.toLocaleString()} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={lead.state} />
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              label="Website"
              value={
                lead.website ? (
                  <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {lead.website}
                  </a>
                ) : null
              }
            />
          </div>

          <Separator />

          {/* Decision Maker */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Decision Maker</h3>
            <div className="space-y-3">
              <InfoRow icon={<User className="h-4 w-4" />} label="Name" value={lead.decision_maker_name} />
              <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={lead.decision_maker_title} />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={
                  lead.decision_maker_email ? (
                    <a href={`mailto:${lead.decision_maker_email}`} className="text-primary hover:underline">
                      {lead.decision_maker_email}
                    </a>
                  ) : null
                }
              />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.decision_maker_phone} />
            </div>
          </div>

          <Separator />

          {/* Trigger */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Trigger Event</h3>
            <div className="space-y-3">
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Type" value={lead.trigger_type} />
              <InfoRow icon={<Zap className="h-4 w-4" />} label="Event" value={lead.trigger_event} />
            </div>
          </div>

          {/* AI Pitch Summary */}
          {lead.ai_pitch_summary && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Pitch Summary
                </h3>
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {lead.ai_pitch_summary}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Created date */}
          {lead.created_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Clock className="h-3 w-3" />
              Created {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
