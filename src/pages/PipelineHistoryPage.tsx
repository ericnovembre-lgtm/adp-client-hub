import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2, Rocket, CheckCircle2, XCircle, Clock, ChevronDown,
  ChevronRight, Mail, RefreshCw, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OutreachReviewCard, type OutreachEmail } from "@/components/OutreachReviewCard";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  discovering: { label: "Discovering", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Sparkles },
  enriching: { label: "Enriching", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400", icon: RefreshCw },
  scoring: { label: "Scoring", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400", icon: Sparkles },
  drafting: { label: "Drafting", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Mail },
  review_ready: { label: "Review Ready", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-500/15 text-red-700 dark:text-red-400", icon: XCircle },
};

interface LeadGenRun {
  id: string;
  status: string;
  trigger_type: string;
  config: Record<string, any> | null;
  discovered_count: number | null;
  enriched_count: number | null;
  scored_count: number | null;
  emails_drafted: number | null;
  emails_approved: number | null;
  emails_sent: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

function StatPill({ label, value }: { label: string; value: number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-muted/50">
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function RunRow({ run }: { run: LeadGenRun }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[run.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  const { data: emails, isLoading: emailsLoading } = useQuery<OutreachEmail[]>({
    queryKey: ["outreach-queue", run.id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_queue")
        .select("*")
        .eq("run_id", run.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OutreachEmail[];
    },
  });

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs px-2 py-0.5 gap-1", cfg.color)}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {run.trigger_type}
            </Badge>
            {run.config && (run.config as any).industry && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {(run.config as any).industry}
              </Badge>
            )}
            {run.config && (run.config as any).state && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {(run.config as any).state}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {run.started_at
              ? `Started ${formatDistanceToNow(new Date(run.started_at), { addSuffix: true })} · ${format(new Date(run.started_at), "MMM d, h:mm a")}`
              : run.created_at
              ? `Created ${formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}`
              : "Unknown time"}
            {run.completed_at && run.started_at && (
              <span className="ml-2">
                · Duration: {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
              </span>
            )}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <StatPill label="Found" value={run.discovered_count} />
          <StatPill label="Enriched" value={run.enriched_count} />
          <StatPill label="Scored" value={run.scored_count} />
          <StatPill label="Drafted" value={run.emails_drafted} />
          <StatPill label="Approved" value={run.emails_approved} />
          <StatPill label="Sent" value={run.emails_sent} />
        </div>
      </button>

      {/* Mobile stat pills */}
      {expanded && (
        <div className="flex sm:hidden items-center gap-2 px-4 pb-2 flex-wrap">
          <StatPill label="Found" value={run.discovered_count} />
          <StatPill label="Enriched" value={run.enriched_count} />
          <StatPill label="Scored" value={run.scored_count} />
          <StatPill label="Drafted" value={run.emails_drafted} />
          <StatPill label="Approved" value={run.emails_approved} />
          <StatPill label="Sent" value={run.emails_sent} />
        </div>
      )}

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t">
          {run.error_message && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              {run.error_message}
            </div>
          )}

          <div className="mt-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Outreach Emails
            </h4>
            {emailsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : !emails || emails.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No outreach emails for this run
              </p>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <OutreachReviewCard key={email.id} email={email} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function PipelineHistoryPage() {
  const { user } = useAuth();

  const { data: runs, isLoading, refetch } = useQuery<LeadGenRun[]>({
    queryKey: ["lead-gen-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_gen_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LeadGenRun[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline History</h1>
          <p className="text-sm text-muted-foreground">
            Past lead generation runs with outreach drill-down
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !runs || runs.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Rocket className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-base font-medium text-foreground">No pipeline runs yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Open the AI Agent and click "Run lead gen" to start your first autonomous pipeline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
