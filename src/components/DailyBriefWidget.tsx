import { useState } from "react";
import { useLocation } from "wouter";
import {
  ClipboardList, RefreshCw, AlertTriangle, Clock, MailX,
  ShieldAlert, TrendingDown, Calendar, X, CheckCircle2, ChevronDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgentRecommendations, AgentRecommendation } from "@/hooks/useAgentRecommendations";

const TYPE_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; border: string }> = {
  stalled_deal: { icon: AlertTriangle, color: "text-orange-500", border: "border-l-orange-500" },
  overdue_task: { icon: Clock, color: "text-red-500", border: "border-l-red-500" },
  uncontacted_lead: { icon: MailX, color: "text-blue-500", border: "border-l-blue-500" },
  territory_violation: { icon: ShieldAlert, color: "text-yellow-500", border: "border-l-yellow-500" },
  pipeline_gap: { icon: TrendingDown, color: "text-purple-500", border: "border-l-purple-500" },
  follow_up_due: { icon: Calendar, color: "text-green-500", border: "border-l-green-500" },
};

const ENTITY_ROUTES: Record<string, string> = {
  lead: "/leads",
  deal: "/deals",
  task: "/tasks",
  contact: "/contacts",
};

function renderBody(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function RecommendationRow({
  rec,
  onDismiss,
}: {
  rec: AgentRecommendation;
  onDismiss: (id: string) => void;
}) {
  const [, navigate] = useLocation();
  const config = TYPE_CONFIG[rec.type] ?? TYPE_CONFIG.stalled_deal;
  const Icon = config.icon;

  const handleGo = () => {
    const route = rec.entity_type ? ENTITY_ROUTES[rec.entity_type] : undefined;
    if (route) navigate(route);
  };

  return (
    <div className={cn("flex gap-3 py-3 px-4 border-l-4", config.border)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{rec.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{renderBody(rec.body)}</p>
      </div>
      <div className="flex items-start gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDismiss(rec.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
        {rec.entity_type && (
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleGo}>
            Go
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DailyBriefWidget() {
  const { recommendations, isLoading, dismissRecommendation, refreshBrief } = useAgentRecommendations();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBrief();
    setRefreshing(false);
  };

  const visible = expanded ? recommendations : recommendations.slice(0, 5);
  const hasMore = recommendations.length > 5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Daily Brief
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm">All clear — no action items today</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {visible.map((rec) => (
                <RecommendationRow key={rec.id} rec={rec} onDismiss={dismissRecommendation} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t"
              >
                {expanded ? "Show less" : `Show all (${recommendations.length})`}
                <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
