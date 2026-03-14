import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import type { Deal, Activity } from "@/types/database";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CalendarIcon, Clock, FileText, ArrowRightLeft, Zap, UserCheck } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  proposal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  negotiation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  closed_won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function useDealActivities(dealId: string | undefined) {
  return useQuery({
    queryKey: ["activities", "deal", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!dealId,
  });
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="h-3.5 w-3.5" />,
  stage_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  status_change: <Zap className="h-3.5 w-3.5" />,
  conversion: <UserCheck className="h-3.5 w-3.5" />,
};

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
  const { data: activities, isLoading } = useDealActivities(deal?.id);

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
              <Badge className={STAGE_COLORS[deal.stage] ?? ""} variant="outline">
                {STAGE_LABELS[deal.stage] ?? deal.stage}
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
