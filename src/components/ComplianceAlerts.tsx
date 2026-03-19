import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  state: string;
  topic: string;
  urgency: "high" | "medium" | "low";
  explanation: string;
  outreach_angle: string;
}

const urgencyColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

export default function ComplianceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [outreach, setOutreach] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [stateFilter, setStateFilter] = useState("all");

  const scanPipeline = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compliance-alerts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setAlerts(result.alerts || []);
      setOutreach(result.outreach_opportunities || "");
      setScanned(true);
      const highCount = (result.alerts || []).filter((a: Alert) => a.urgency === "high").length;
      toast.success(`${result.alerts?.length || 0} compliance alerts found. ${highCount} high-urgency tasks created.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to scan compliance");
    } finally {
      setLoading(false);
    }
  };

  const states = useMemo(() => [...new Set(alerts.map((a) => a.state))].sort(), [alerts]);

  const filtered = stateFilter === "all" ? alerts : alerts.filter((a) => a.state === stateFilter);

  const grouped = useMemo(() => {
    const map: Record<string, Alert[]> = {};
    for (const a of filtered) {
      if (!map[a.state]) map[a.state] = [];
      map[a.state].push(a);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Alerts</h1>
          <p className="text-muted-foreground text-sm">AI-identified compliance opportunities by state and industry</p>
        </div>
        <div className="flex gap-3 items-center">
          {states.length > 0 && (
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={scanPipeline} disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Scan Pipeline
          </Button>
        </div>
      </div>

      {/* Outreach Opportunities */}
      {outreach && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Top Outreach Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-line">{outreach}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!scanned && (
        <Card>
          <CardContent className="py-16 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Click "Scan Pipeline" to identify compliance opportunities across your leads</p>
          </CardContent>
        </Card>
      )}

      {scanned && alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No compliance alerts found. Add leads with state data to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Alerts grouped by state */}
      {grouped.map(([state, stateAlerts]) => (
        <div key={state} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{state}</h2>
          {stateAlerts.map((alert, i) => (
            <Card key={`${state}-${i}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-foreground">{alert.topic}</span>
                      <Badge className={urgencyColors[alert.urgency]}>{alert.urgency}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.explanation}</p>
                    <p className="text-sm text-foreground italic">{alert.outreach_angle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
