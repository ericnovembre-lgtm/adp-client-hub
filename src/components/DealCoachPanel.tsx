import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Target } from "lucide-react";
import { toast } from "sonner";

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
  warm: { label: "Warm", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
  stale: { label: "Stale", className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" },
  at_risk: { label: "At Risk", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
};

interface CoachingResult {
  coaching: string;
  deal_health: "hot" | "warm" | "stale" | "at_risk";
  next_action: string;
}

export default function DealCoachPanel({ deal_id }: { deal_id: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachingResult | null>(null);

  const fetchCoaching = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("deal-coach", {
        body: { deal_id },
      });
      if (error) throw error;
      setResult(data as CoachingResult);
    } catch {
      toast.error("Failed to get deal coaching");
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="flex justify-center py-4">
        <Button onClick={fetchCoaching} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Analyzing deal…" : "Get Coaching"}
        </Button>
      </div>
    );
  }

  const health = HEALTH_CONFIG[result.deal_health] ?? HEALTH_CONFIG.warm;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Deal Coach
          </CardTitle>
          <Badge variant="outline" className={health.className}>
            {health.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.next_action && (
          <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3">
            <Target className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-primary mb-1">Next Best Action</p>
              <p className="text-sm text-foreground">{result.next_action}</p>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {result.coaching}
        </p>
        <Button variant="ghost" size="sm" onClick={fetchCoaching} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
