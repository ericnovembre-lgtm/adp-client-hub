import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HEADCOUNT_MIN, HEADCOUNT_MAX, HEADCOUNT_LABEL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle, Zap, AlertCircle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const INTENT_TOPICS = [
  { key: "peo", label: "Professional Employer Organization / PEO", keyword: "Professional Employer Organization" },
  { key: "hr_outsourcing", label: "HR Outsourcing", keyword: "HR outsourcing" },
  { key: "payroll", label: "Payroll Outsourcing", keyword: "Payroll outsourcing" },
  { key: "benefits", label: "Employee Benefits Administration", keyword: "Employee benefits administration" },
  { key: "wc", label: "Workers Compensation", keyword: "Workers compensation insurance" },
  { key: "compliance", label: "HR Compliance", keyword: "HR compliance" },
  { key: "small_biz_hr", label: "Small Business HR Solutions", keyword: "Small business HR" },
  { key: "co_employment", label: "Co-Employment Services", keyword: "Co-employment" },
];

interface IntentLead {
  id: string;
  company_name: string;
  headcount: number | null;
  industry: string | null;
  decision_maker: string | null;
  title: string | null;
  email: string | null;
  trigger: string | null;
}

export default function IntentDiscoveryTab() {
  const qc = useQueryClient();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(INTENT_TOPICS.map(t => t.key));
  const [state, setState] = useState("");
  const [industry, setIndustry] = useState("");
  const [perPage, setPerPage] = useState(25);

  const toggleTopic = (key: string) => {
    setSelectedTopics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const intentDiscover = useMutation({
    mutationFn: async () => {
      const keywords = INTENT_TOPICS
        .filter(t => selectedTopics.includes(t.key))
        .map(t => t.keyword);

      const { data, error } = await supabase.functions.invoke("intent-discovery", {
        body: {
          intent_keywords: keywords,
          states: state && state !== "any" ? [state] : [],
          industries: industry ? [industry] : [],
          headcount_min: HEADCOUNT_MIN,
          headcount_max: HEADCOUNT_MAX,
          per_page: perPage,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        found: number;
        saved: number;
        skipped_duplicate: number;
        skipped_territory: number;
        errors: number;
        leads: IntentLead[];
      };
    },
    onSuccess: (data) => {
      toast.success(`Discovered ${data.saved} real leads from Apollo!`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-leads"] });
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Intent discovery failed");
    },
  });

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Zap className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-foreground">
          Intent Discovery uses Apollo.io to find <strong>REAL companies</strong> actively researching PEO and HR outsourcing services. These are businesses showing buying signals right now — not AI-generated prospects.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Intent-Based Discovery
          </CardTitle>
          <CardDescription>
            Find companies with real buyer intent signals for PEO services via Apollo.io
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Intent Topics */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Buyer Intent Topics</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTENT_TOPICS.map(topic => (
                <label key={topic.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedTopics.includes(topic.key)}
                    onCheckedChange={() => toggleTopic(topic.key)}
                  />
                  <span className="text-foreground">{topic.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Any state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any state</SelectItem>
                  {US_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                placeholder="e.g. Healthcare, Construction"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Results per search</Label>
              <Input
                type="number"
                min={5}
                max={50}
                value={perPage}
                onChange={e => setPerPage(Math.max(5, Math.min(50, Number(e.target.value) || 25)))}
              />
            </div>
          </div>

          {/* Territory note */}
          <div className="rounded-md border border-muted bg-muted/30 px-4 py-2 flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">{HEADCOUNT_LABEL}</Badge>
            <span className="text-xs text-muted-foreground">Locked to Down Market territory ({HEADCOUNT_MIN}-{HEADCOUNT_MAX} employees)</span>
          </div>

          {/* Discover button */}
          <Button
            onClick={() => intentDiscover.mutate()}
            disabled={intentDiscover.isPending || selectedTopics.length === 0}
            className="w-full sm:w-auto"
          >
            {intentDiscover.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Discovering...</>
            ) : (
              <><Search className="h-4 w-4" /> Discover Real Leads</>
            )}
          </Button>

          {/* Results */}
          {intentDiscover.isSuccess && intentDiscover.data && (
            <div className="space-y-4 mt-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">
                    Found {intentDiscover.data.found} leads, saved {intentDiscover.data.saved}
                    {intentDiscover.data.skipped_duplicate > 0 && `, ${intentDiscover.data.skipped_duplicate} duplicates skipped`}
                    {intentDiscover.data.skipped_territory > 0 && `, ${intentDiscover.data.skipped_territory} outside territory`}
                    {intentDiscover.data.errors > 0 && `, ${intentDiscover.data.errors} errors`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leads saved with source "apollo_intent" — view them on the Leads page
                </p>
              </div>

              {intentDiscover.data.leads.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Headcount</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Decision Maker</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Trigger</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intentDiscover.data.leads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.headcount ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.industry ?? "—"}</TableCell>
                          <TableCell>{lead.decision_maker ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{lead.title ?? "—"}</TableCell>
                          <TableCell className="text-xs">{lead.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {(lead.trigger ?? "intent").replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {intentDiscover.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {(intentDiscover.error as Error)?.message || "Discovery failed"}
                </span>
              </div>
            </div>
          )}

          {intentDiscover.isIdle && (
            <div className="rounded-lg border bg-muted/30 p-6 mt-4 text-center text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Ready to discover real leads</p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                Select intent topics above and click "Discover Real Leads" to find companies actively researching PEO services on Apollo.io.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
