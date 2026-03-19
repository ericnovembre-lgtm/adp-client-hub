import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Target, CalendarDays } from "lucide-react";
import { useQuotaData, type PaceStatus } from "@/hooks/useQuotaData";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const PACE_CONFIG: Record<PaceStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  on_track: { label: "On Track", variant: "default" },
  behind_pace: { label: "Behind Pace", variant: "secondary" },
  at_risk: { label: "At Risk", variant: "destructive" },
};

export default function QuotaTrackerWidget() {
  const { data, isLoading } = useQuotaData();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quotaInput, setQuotaInput] = useState("");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pace = PACE_CONFIG[data.paceStatus];

  const handleSave = () => {
    const val = parseInt(quotaInput, 10);
    if (isNaN(val) || val <= 0) { toast.error("Enter a valid quota amount"); return; }
    updateSettings.mutate({ ...settings, quarterly_quota: val }, {
      onSuccess: () => { toast.success("Quota updated"); setDialogOpen(false); },
      onError: () => toast.error("Failed to update quota"),
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Quarterly Quota</span>
              <Badge variant={pace.variant}>{pace.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {data.daysRemaining}d remaining
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setQuotaInput(String(data.quota)); setDialogOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{data.percentComplete}% of quota</span>
              <span>{fmt(data.closedWon)} / {fmt(data.quota)}</span>
            </div>
            <Progress value={Math.min(data.percentComplete, 100)} className="h-3" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Quota</p>
              <p className="text-sm font-bold text-foreground">{fmt(data.quota)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Closed Won</p>
              <p className="text-sm font-bold text-foreground">{fmt(data.closedWon)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className="text-sm font-bold text-foreground">{fmt(data.gap)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pipeline Coverage</p>
              <p className="text-sm font-bold text-foreground">{data.coverageRatio}x</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Quarterly Quota</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quota-input">Quota Amount ($)</Label>
            <Input id="quota-input" type="number" value={quotaInput} onChange={(e) => setQuotaInput(e.target.value)} placeholder="500000" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
