import { format } from "date-fns";
import type { Deal } from "@/types/database";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from "@/lib/constants";
import ActivityTimeline from "@/components/ActivityTimeline";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CalendarIcon } from "lucide-react";

export default function DealDetailSheet({
  deal,
  contactName,
  companyName,
  open,
  onOpenChange,
}: {
  deal: Deal | null;
  contactName?: string;
  companyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{deal.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {deal.stage && (
              <Badge className={DEAL_STAGE_COLORS[deal.stage] ?? ""} variant="outline">
                {DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}
              </Badge>
            )}
          </div>
          <div className="space-y-2 text-sm">
            {deal.value != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-foreground">${deal.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {companyName && (
              <div className="flex items-center gap-2 text-muted-foreground">Company: {companyName}</div>
            )}
            {contactName && (
              <div className="flex items-center gap-2 text-muted-foreground">Contact: {contactName}</div>
            )}
            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                Expected close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
              </div>
            )}
          </div>
          {deal.notes && (
            <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{deal.notes}</p>
          )}
        </div>

        <Separator className="my-6" />

        <ActivityTimeline entityType="deal" entityId={deal.id} />
      </SheetContent>
    </Sheet>
  );
}
