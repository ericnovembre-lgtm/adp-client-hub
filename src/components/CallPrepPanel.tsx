import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2, RefreshCw, Copy, Check, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  clear: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  bluefield: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  low_probability: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  prohibited: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function CallPrepPanel({ lead_id, contact_id }: { lead_id?: string; contact_id?: string }) {
  const queryClient = useQueryClient();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [industryStatus, setIndustryStatus] = useState<string>("clear");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    if (!briefing) return;
    await navigator.clipboard.writeText(briefing);
    setCopied(true);
    toast.success("Briefing copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNotes = async () => {
    if (!briefing) return;
    setSaving(true);
    try {
      const table = lead_id ? "leads" : "contacts";
      const id = lead_id ?? contact_id;
      if (!id) throw new Error("No lead or contact ID");

      const { data: record, error: fetchErr } = await supabase
        .from(table)
        .select("notes")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const header = `\n\n--- Call Prep (${format(new Date(), "MMM d, yyyy h:mm a")}) ---\n`;
      const updated = (record?.notes ?? "") + header + briefing;

      const { error: updateErr } = await supabase
        .from(table)
        .update({ notes: updated })
        .eq("id", id);
      if (updateErr) throw updateErr;

      queryClient.invalidateQueries({ queryKey: [table === "leads" ? "leads" : "contacts", id] });
      toast.success("Briefing saved to notes");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save to notes");
    } finally {
      setSaving(false);
    }
  };

  const handlePrep = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("call-prep", {
        body: { lead_id, contact_id },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setBriefing(data.briefing);
      setIndustryStatus(data.industry_status ?? "clear");
    } catch (e: any) {
      setError(e.message ?? "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  if (!briefing && !loading) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-sm text-muted-foreground">Generate a pre-call briefing with talking points, objection prep, and industry eligibility.</p>
        <Button onClick={handlePrep} disabled={loading} className="gap-1.5">
          <Phone className="h-4 w-4" />
          Prep My Call
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Generating briefing…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={STATUS_STYLES[industryStatus] ?? STATUS_STYLES.clear}>
          {industryStatus.replace("_", " ")}
        </Badge>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handlePrep}>
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {briefing}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
