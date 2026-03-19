import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Mail, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface RenewalLead {
  lead_id: string;
  company_name: string;
  competitor: string;
  days_until_renewal: number;
  category: string;
}

interface ScanResult {
  analysis: string;
  urgent_count: number;
  approaching_count: number;
  upcoming_count: number;
  leads: RenewalLead[];
}

const categoryConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  urgent: { label: "Urgent", color: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
  approaching: { label: "Approaching", color: "bg-orange-500 text-white", icon: Clock },
  upcoming: { label: "Upcoming", color: "bg-yellow-500 text-white", icon: CalendarClock },
  future: { label: "Future", color: "bg-muted text-muted-foreground", icon: CalendarClock },
};

export default function RenewalDashboard() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; company: string; email: string }>({
    open: false,
    company: "",
    email: "",
  });

  const runScan = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in"); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/renewal-tracker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: "scan" }),
        }
      );
      if (!resp.ok) throw new Error("Scan failed");
      const data: ScanResult = await resp.json();
      setResult(data);
      toast.success(`Scan complete: ${data.leads.length} leads tracked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const draftEmail = async (leadId: string, companyName: string) => {
    setEmailLoading(leadId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/renewal-tracker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: "single", lead_id: leadId }),
        }
      );
      if (!resp.ok) throw new Error("Email generation failed");
      const data = await resp.json();
      setEmailDialog({ open: true, company: companyName, email: data.analysis });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to draft email");
    } finally {
      setEmailLoading(null);
    }
  };

  const nonFutureLeads = result?.leads.filter((l) => l.category !== "future") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Renewal Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track competitor PEO renewal windows and time your outreach
          </p>
        </div>
        <Button onClick={runScan} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run Scan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Urgent (≤30 days)</p>
                <p className="text-3xl font-bold text-destructive">{result?.urgent_count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approaching (31-60)</p>
                <p className="text-3xl font-bold text-orange-500">{result?.approaching_count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming (61-90)</p>
                <p className="text-3xl font-bold text-yellow-500">{result?.upcoming_count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      {nonFutureLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads Approaching Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Days Until Renewal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonFutureLeads.map((lead) => {
                  const cfg = categoryConfig[lead.category] || categoryConfig.future;
                  return (
                    <TableRow key={lead.lead_id}>
                      <TableCell className="font-medium">{lead.company_name}</TableCell>
                      <TableCell className="capitalize">{lead.competitor.replace(/_/g, " ")}</TableCell>
                      <TableCell>{lead.days_until_renewal}</TableCell>
                      <TableCell>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={emailLoading === lead.lead_id}
                          onClick={() => draftEmail(lead.lead_id, lead.company_name)}
                        >
                          {emailLoading === lead.lead_id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Mail className="h-3 w-3 mr-1" />
                          )}
                          Draft Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Analysis */}
      {result?.analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
              {result.analysis}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(o) => setEmailDialog((p) => ({ ...p, open: o }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Displacement Email — {emailDialog.company}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed p-4 bg-muted rounded-md">
            {emailDialog.email}
          </pre>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(emailDialog.email);
              toast.success("Copied to clipboard");
            }}
          >
            Copy to Clipboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
