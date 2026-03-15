import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2, CheckCircle, ChevronDown, Info, AlertTriangle } from "lucide-react";

const TOP_STATES = [
  "California", "Texas", "Florida", "New York", "Georgia",
  "North Carolina", "Illinois", "Ohio", "Pennsylvania", "Virginia",
];

const OTHER_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","Colorado","Connecticut","Delaware",
  "Hawaii","Idaho","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri",
  "Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "North Dakota","Oklahoma","Oregon","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Utah","Vermont","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

const INDUSTRY_KEYWORDS = [
  "Construction", "Healthcare", "Restaurant", "Technology", "Real Estate",
  "Consulting", "Trades", "Staffing", "Cleaning", "Landscaping",
  "Automotive", "Accounting",
];

const TIMEFRAMES = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
];

const PER_PAGE_OPTIONS = [
  { value: "30", label: "30 per state" },
  { value: "50", label: "50 per state" },
  { value: "100", label: "100 per state (max)" },
];

export default function RegistryDiscoveryTab() {
  const [, navigate] = useLocation();
  const [selectedStates, setSelectedStates] = useState<string[]>(["California", "Texas", "Florida"]);
  const [monthsBack, setMonthsBack] = useState("6");
  const [perPage, setPerPage] = useState("100");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(["Construction", "Healthcare", "Restaurant", "Technology", "Real Estate"]);
  const [showOtherStates, setShowOtherStates] = useState(false);

  const toggleState = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const [apiKeyRequired, setApiKeyRequired] = useState(false);

  const discover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("registry-discovery", {
        body: {
          states: selectedStates,
          months_back: Number(monthsBack),
          industry_keywords: selectedKeywords.map(k => k.toLowerCase()),
          per_page: Number(perPage),
        },
      });
      if (error) throw error;
      if (data?.error === "api_key_required") {
        setApiKeyRequired(true);
        throw new Error("OpenCorporates API key required");
      }
      if (data?.error) throw new Error(data.error);
      setApiKeyRequired(false);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Discovered ${data.saved} new businesses${data.enriched ? `, enriched ${data.enriched}` : ""}!`);
    },
    onError: (err: Error) => {
      if (!apiKeyRequired) toast.error(err.message || "Discovery failed");
    },
  });

  return (
    <div className="space-y-6">
      <Alert className="border-green-500/30 bg-green-500/5">
        <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-sm text-foreground">
          <strong>New Business Discovery</strong> finds companies recently incorporated in your target states using Secretary of State registries. New businesses with employees need payroll, benefits, and compliance from day one — perfect PEO candidates.
        </AlertDescription>
      </Alert>

      {apiKeyRequired && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-sm text-foreground">
            <strong>API Key Required:</strong> OpenCorporates now requires an API key for access.{" "}
            <button onClick={() => navigate("/settings")} className="underline font-medium text-primary hover:text-primary/80">
              Configure your key in Settings → API Keys
            </button>{" "}
            to use this feature.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Find New Businesses
          </CardTitle>
          <CardDescription>Search for recently incorporated companies via OpenCorporates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* States */}
          <div className="space-y-2">
            <Label>Target States</Label>
            <div className="flex flex-wrap gap-3">
              {TOP_STATES.map(st => (
                <label key={st} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedStates.includes(st)}
                    onCheckedChange={() => toggleState(st)}
                  />
                  {st}
                </label>
              ))}
            </div>
            <Collapsible open={showOtherStates} onOpenChange={setShowOtherStates}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1 mt-1">
                  <ChevronDown className={`h-3 w-3 transition-transform ${showOtherStates ? "rotate-180" : ""}`} />
                  Other states
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-3 mt-2">
                  {OTHER_STATES.map(st => (
                    <label key={st} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedStates.includes(st)}
                        onCheckedChange={() => toggleState(st)}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Timeframe */}
          <div className="space-y-2 max-w-xs">
            <Label>Incorporated within</Label>
            <Select value={monthsBack} onValueChange={setMonthsBack}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industry Keywords */}
          <div className="space-y-2">
            <Label>Industry Keywords</Label>
            <div className="flex flex-wrap gap-3">
              {INDUSTRY_KEYWORDS.map(kw => (
                <label key={kw} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedKeywords.includes(kw)}
                    onCheckedChange={() => toggleKeyword(kw)}
                  />
                  {kw}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Headcount not available from registry data — leads will be enriched after import
          </div>

          <Button
            onClick={() => discover.mutate()}
            disabled={discover.isPending || selectedStates.length === 0}
            className="w-full sm:w-auto"
          >
            {discover.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Discovering...</>
              : <><Building2 className="h-4 w-4" /> Discover New Businesses</>
            }
          </Button>

          {/* Results */}
          {discover.isSuccess && discover.data && (
            <div className="space-y-4 mt-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-foreground">
                    Found {discover.data.found} new businesses, saved {discover.data.saved}
                    {discover.data.skipped_duplicate > 0 && `, ${discover.data.skipped_duplicate} duplicates skipped`}
                    {discover.data.errors > 0 && `, ${discover.data.errors} errors`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Leads added to your Leads page with source "business_registry"</p>
              </div>

              {discover.data.leads?.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Incorporation Date</TableHead>
                        <TableHead>Company Type</TableHead>
                        <TableHead>Inferred Industry</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discover.data.leads.map((lead: any) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.state}</TableCell>
                          <TableCell>
                            {lead.incorporation_date
                              ? new Date(lead.incorporation_date).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>{lead.company_type ?? "—"}</TableCell>
                          <TableCell>
                            {lead.industry
                              ? <Badge variant="secondary">{lead.industry}</Badge>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/30">New</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {discover.isIdle && (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No registry results yet</p>
              <p className="text-sm mt-1 max-w-md mx-auto">Select your target states and industry keywords, then click "Discover New Businesses" to find recently incorporated companies.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
