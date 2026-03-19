import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, Zap, SkipForward, Minus } from "lucide-react";

interface LeadEnrichStatus {
  lead_id: string;
  company_name: string;
  status: "pending" | "enriching" | "success" | "failed" | "skipped";
  result?: {
    email_found: boolean;
    competitor: string | null;
    score: number | null;
    grade: string | null;
    sources_succeeded: string[];
  };
  error?: string;
}

interface EnrichmentSummary {
  enriched: number;
  failed: number;
  skipped: number;
  competitors: Record<string, number>;
  grades: Record<string, number>;
}

interface Props {
  leadIds: string[];
  onComplete: (summary: EnrichmentSummary) => void;
  onSkip: () => void;
}

const LS_KEY = "csv_import_auto_enrich";

export default function EnrichmentProgress({ leadIds, onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<"setup" | "enriching" | "done">("setup");
  const [autoEnrich, setAutoEnrich] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored === null ? true : stored === "true";
  });
  const [leads, setLeads] = useState<LeadEnrichStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchLimit, setBatchLimit] = useState<number | null>(null);
  const abortRef = useRef(false);

  // Fetch lead data on mount
  useEffect(() => {
    async function fetchLeads() {
      const { data } = await supabase
        .from("leads")
        .select("id, company_name, decision_maker_email")
        .in("id", leadIds);

      if (data) {
        setLeads(
          data.map((l) => ({
            lead_id: l.id,
            company_name: l.company_name,
            status: l.decision_maker_email ? "skipped" : "pending",
          }))
        );
      }
      setLoading(false);
    }
    fetchLeads();
  }, [leadIds]);

  const needEnrichment = leads.filter((l) => l.status === "pending");
  const alreadyHaveEmail = leads.filter((l) => l.status === "skipped");

  const toggleAutoEnrich = (val: boolean) => {
    setAutoEnrich(val);
    localStorage.setItem(LS_KEY, String(val));
  };

  const startEnrichment = useCallback(async (limit?: number) => {
    setPhase("enriching");
    abortRef.current = false;

    const toEnrich = leads.filter((l) => l.status === "pending");
    const batch = limit ? toEnrich.slice(0, limit) : toEnrich;

    for (let i = 0; i < batch.length; i++) {
      if (abortRef.current) break;

      const lead = batch[i];

      setLeads((prev) =>
        prev.map((l) => (l.lead_id === lead.lead_id ? { ...l, status: "enriching" } : l))
      );

      try {
        const { data, error } = await supabase.functions.invoke("waterfall-enrich", {
          body: { lead_id: lead.lead_id },
        });

        if (error) throw error;

        setLeads((prev) =>
          prev.map((l) =>
            l.lead_id === lead.lead_id
              ? {
                  ...l,
                  status: "success",
                  result: {
                    email_found: !!data?.email_found,
                    competitor: data?.competitor ?? null,
                    score: data?.score ?? null,
                    grade: data?.grade ?? null,
                    sources_succeeded: data?.sources_succeeded ?? [],
                  },
                }
              : l
          )
        );
      } catch (err: any) {
        setLeads((prev) =>
          prev.map((l) =>
            l.lead_id === lead.lead_id ? { ...l, status: "failed", error: err.message ?? "Unknown error" } : l
          )
        );
      }

      // Rate limit: 1s delay between calls
      if (i < batch.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Build summary and log activity
    setPhase("done");
  }, [leads]);

  // Compute summary when done
  const summary: EnrichmentSummary | null = phase === "done" ? (() => {
    const enriched = leads.filter((l) => l.status === "success").length;
    const failed = leads.filter((l) => l.status === "failed").length;
    const skipped = leads.filter((l) => l.status === "skipped" || l.status === "pending").length;
    const competitors: Record<string, number> = {};
    const grades: Record<string, number> = {};

    leads.forEach((l) => {
      if (l.result?.competitor) {
        competitors[l.result.competitor] = (competitors[l.result.competitor] || 0) + 1;
      }
      if (l.result?.grade) {
        grades[l.result.grade] = (grades[l.result.grade] || 0) + 1;
      }
    });

    return { enriched, failed, skipped, competitors, grades };
  })() : null;

  // Log activity when enrichment completes
  useEffect(() => {
    if (phase !== "done" || !summary) return;

    async function logSummaryActivity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const topCompetitors = Object.entries(summary!.competitors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name} (${count})`)
        .join(", ") || "None";

      const gradeStr = ["A", "B", "C", "D"]
        .map((g) => `${g}:${summary!.grades[g] || 0}`)
        .join(" ");

      await supabase.from("activities").insert({
        type: "system",
        description: `CSV import enrichment: ${summary!.enriched} enriched, ${summary!.failed} failed, ${summary!.skipped} skipped. Top competitors: ${topCompetitors}. Scores: ${gradeStr}.`,
        user_id: user.id,
      });
    }

    logSummaryActivity();
  }, [phase, summary]);

  const processedCount = leads.filter((l) => ["success", "failed"].includes(l.status)).length;
  const totalToProcess = leads.filter((l) => l.status !== "skipped").length;
  const progressPct = totalToProcess > 0 ? Math.round((processedCount / totalToProcess) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading lead data…</span>
      </div>
    );
  }

  // === SETUP PHASE ===
  if (phase === "setup") {
    const showBatchWarning = needEnrichment.length > 20 && batchLimit === null;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Enrich Imported Leads
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Run waterfall enrichment to find emails, detect competitors, and score your leads.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap text-sm">
          <Badge variant="secondary">{leads.length} imported</Badge>
          <Badge variant="outline">{alreadyHaveEmail.length} already have email</Badge>
          <Badge variant="default">{needEnrichment.length} need enrichment</Badge>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Auto-enrich all imported leads</label>
          <Switch checked={autoEnrich} onCheckedChange={toggleAutoEnrich} />
        </div>

        {showBatchWarning && (
          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  You have {needEnrichment.length} leads to enrich. This will use approximately {needEnrichment.length * 3} API credits.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => { setBatchLimit(20); startEnrichment(20); }}>
                    Enrich First 20
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setBatchLimit(null); startEnrichment(); }}>
                    Enrich All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onSkip}>Skip</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {!showBatchWarning && (
          <div className="flex gap-2">
            <Button onClick={() => startEnrichment()} disabled={needEnrichment.length === 0}>
              <Zap className="h-4 w-4 mr-1" />
              Enrich Now {needEnrichment.length > 0 && `(${needEnrichment.length})`}
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              <SkipForward className="h-4 w-4 mr-1" />
              Skip — I'll enrich later
            </Button>
          </div>
        )}
      </div>
    );
  }

  // === ENRICHING / DONE PHASE ===
  return (
    <div className="space-y-4">
      {phase === "enriching" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium text-foreground">
              Enriching… {processedCount} of {totalToProcess}
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {phase === "done" && summary && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-foreground">Enrichment Complete</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{summary.enriched} enriched</Badge>
            {summary.failed > 0 && <Badge variant="destructive">{summary.failed} failed</Badge>}
            {summary.skipped > 0 && <Badge variant="outline">{summary.skipped} skipped</Badge>}
          </div>

          {Object.keys(summary.competitors).length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Competitors: </span>
              {Object.entries(summary.competitors).map(([name, count]) => `${name} (${count})`).join(", ")}
            </div>
          )}

          {Object.keys(summary.grades).length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Scores: </span>
              {["A", "B", "C", "D"].map((g) => `${g}: ${summary.grades[g] || 0}`).join(", ")}
            </div>
          )}

          <Button onClick={() => onComplete(summary)}>Done</Button>
        </div>
      )}

      {/* Lead list */}
      <ScrollArea className="h-56 rounded-md border">
        <div className="p-2 space-y-1">
          {leads.map((l) => (
            <div key={l.lead_id} className="flex items-center gap-2 py-1.5 px-2 rounded text-sm">
              {l.status === "pending" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              {l.status === "enriching" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              {l.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              {l.status === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
              {l.status === "skipped" && <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="font-medium truncate">{l.company_name}</span>
              {l.status === "success" && l.result && (
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {l.result.email_found ? "Email ✓" : ""} {l.result.competitor ? `· ${l.result.competitor}` : ""} {l.result.grade ? `· ${l.result.grade}` : ""}
                </span>
              )}
              {l.status === "failed" && l.error && (
                <span className="text-xs text-destructive ml-auto truncate max-w-[150px]">{l.error}</span>
              )}
              {l.status === "skipped" && (
                <span className="text-xs text-muted-foreground ml-auto">Has email</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
