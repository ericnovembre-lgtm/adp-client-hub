import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useCreateActivity } from "@/hooks/useActivities";
import { ACTIVITY_TYPES } from "@/lib/constants";
import type { Activity } from "@/types/database";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Phone, Mail, ArrowRightLeft, Zap, UserCheck, Clock, Send, Loader2,
} from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  stage_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  status_change: <Zap className="h-3.5 w-3.5" />,
  conversion: <UserCheck className="h-3.5 w-3.5" />,
};

function useEntityActivities(entityType: "lead" | "contact" | "deal", entityId: string | undefined) {
  return useQuery({
    queryKey: ["activities", entityType, entityId],
    queryFn: async () => {
      const col = `${entityType}_id` as "lead_id" | "contact_id" | "deal_id";
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq(col, entityId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!entityId,
  });
}

export default function ActivityTimeline({
  entityType,
  entityId,
  showAddForm = false,
}: {
  entityType: "lead" | "contact" | "deal";
  entityId: string;
  showAddForm?: boolean;
}) {
  const [activityType, setActivityType] = useState<string>("note");
  const [activityText, setActivityText] = useState("");
  const createActivity = useCreateActivity();
  const queryClient = useQueryClient();
  const { data: activities, isLoading } = useEntityActivities(entityType, entityId);

  const handleAddActivity = async () => {
    if (!activityText.trim()) return;
    try {
      const activityPayload = {
        type: activityType,
        description: activityText.trim(),
        contact_id: entityType === "contact" ? entityId : undefined,
        deal_id: entityType === "deal" ? entityId : undefined,
        lead_id: entityType === "lead" ? entityId : undefined,
      };
      await createActivity.mutateAsync(activityPayload);
      setActivityText("");
      queryClient.invalidateQueries({ queryKey: ["activities", entityType, entityId] });
      toast.success("Activity added");
    } catch {
      toast.error("Failed to add activity");
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">{showAddForm ? "Activity" : "Recent Activity"}</h3>

      {showAddForm && (
        <div className="flex gap-2 mb-4">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Add a note, call, or email..."
            value={activityText}
            onChange={(e) => setActivityText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
            className="flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAddActivity}
            disabled={!activityText.trim() || createActivity.isPending}
          >
            {createActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

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
  );
}
