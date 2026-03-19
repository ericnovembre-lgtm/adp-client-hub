import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Radio, Phone, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface Signal {
  lead_id: string;
  company_name: string;
  signal_type: string;
  confidence: string;
  explanation: string;
  action: string;
}

const signalColors: Record<string, string> = {
  HIRING: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  COMPLIANCE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "LEADERSHIP CHANGE": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  EXPANSION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "RENEWAL WINDOW": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "NEGATIVE SENTIMENT": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const confidenceColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const actionIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  wait: Clock,
};

export default function SignalsDashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [scanned, setScanned] = useState(false);

  const scanAll = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-signals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: "scan_all" }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setSignals(result.signals || []);
      setUpdatedCount(result.updated_count || 0);
      setScanned(true);
      toast.success(`Scanned leads — ${result.signals?.length || 0} signals found, ${result.updated_count || 0} leads updated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to scan signals");
    } finally {
      setLoading(false);
    }
  };

  const highCount = signals.filter((s) => s.confidence === "high").length;
  const medCount = signals.filter((s) => s.confidence === "medium").length;
  const lowCount = signals.filter((s) => s.confidence === "low").length;

  const sorted = [...signals].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.confidence as keyof typeof order] ?? 2) - (order[b.confidence as keyof typeof order] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buying Signals</h1>
          <p className="text-muted-foreground text-sm">AI-detected buying signals across your pipeline leads</p>
        </div>
        <Button onClick={scanAll} disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
          Scan All Leads
        </Button>
      </div>

      {/* Summary Cards */}
      {scanned && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{signals.length}</p>
              <p className="text-xs text-muted-foreground">Signals Found</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{updatedCount}</p>
              <p className="text-xs text-muted-foreground">Leads Updated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-destructive">{highCount}</p>
              <p className="text-xs text-muted-foreground">High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-secondary-foreground">{medCount}</p>
              <p className="text-xs text-muted-foreground">Medium</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{lowCount}</p>
              <p className="text-xs text-muted-foreground">Low</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signal List */}
      {!scanned && (
        <Card>
          <CardContent className="py-16 text-center">
            <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Click "Scan All Leads" to detect buying signals across your pipeline</p>
          </CardContent>
        </Card>
      )}

      {scanned && signals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No signals detected. Try adding more leads with industry and state data.</p>
          </CardContent>
        </Card>
      )}

      {sorted.map((signal, i) => {
        const ActionIcon = actionIcons[signal.action] || Phone;
        return (
          <Card key={`${signal.lead_id}-${i}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{signal.company_name}</CardTitle>
                <div className="flex gap-2">
                  <Badge className={signalColors[signal.signal_type] || "bg-muted text-muted-foreground"}>
                    {signal.signal_type}
                  </Badge>
                  <Badge className={confidenceColors[signal.confidence] || "bg-muted text-muted-foreground"}>
                    {signal.confidence}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground mb-3">{signal.explanation}</p>
              <Button variant="outline" size="sm">
                <ActionIcon className="h-4 w-4 mr-1" />
                {signal.action === "call" ? "Call" : signal.action === "email" ? "Email" : "Wait"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
