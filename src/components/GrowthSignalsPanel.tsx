import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HEADCOUNT_MIN, HEADCOUNT_MAX } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, TrendingUp, Save, UserSearch } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "recently_funded", label: "Recently Funded" },
  { value: "hiring_growth", label: "Hiring Growth" },
  { value: "new_locations", label: "New Locations" },
  { value: "new_executive_hires", label: "New Executive Hires" },
  { value: "revenue_growth", label: "Revenue Growth" },
] as const;

interface TriggerResult {
  company_name: string;
  domain: string;
  trigger_type: string;
  trigger_date: string;
  trigger_description: string;
  employee_count: number | null;
  industry: string;
  location: string;
}

export default function GrowthSignalsPanel() {
  const { user } = useAuth();
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(["recently_funded", "hiring_growth"]);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [headcountMin, setHeadcountMin] = useState(String(HEADCOUNT_MIN));
  const [headcountMax, setHeadcountMax] = useState(String(HEADCOUNT_MAX));
  const [results, setResults] = useState<TriggerResult[]>([]);
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const [enrichingRows, setEnrichingRows] = useState<Set<number>>(new Set());

  const toggleTrigger = (value: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("lead411-intent", {
        body: {
          mode: "get_triggers",
          trigger_types: selectedTriggers,
          industry: industry || undefined,
          location: location || undefined,
          headcount_min: headcountMin ? Number(headcountMin) : HEADCOUNT_MIN,
          headcount_max: headcountMax ? Number(headcountMax) : HEADCOUNT_MAX,
          limit: 25,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error === "lead411_not_configured" ? data.message : data.error);
      return data;
    },
    onSuccess: (data) => {
      setResults(data.data || []);
      toast.success(`Found ${data.triggers_found ?? data.count ?? 0} companies with active growth triggers`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveToCRM = async (row: TriggerResult, idx: number) => {
    if (!user) return;
    setSavingRows((prev) => new Set(prev).add(idx));
    try {
      const { error } = await supabase.from("leads").insert({
        company_name: row.company_name,
        industry: row.industry || null,
        headcount: row.employee_count,
        website: row.domain ? `https://${row.domain}` : null,
        trigger_event: row.trigger_description,
        trigger_type: row.trigger_type,
        source: "lead411",
        status: "new",
        user_id: user.id,
      });
      if (error) throw error;
      toast.success(`${row.company_name} saved to leads`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save lead");
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const handleEnrichContact = async (row: TriggerResult, idx: number) => {
    setEnrichingRows((prev) => new Set(prev).add(idx));
    try {
      const { data, error } = await supabase.functions.invoke("lead411-intent", {
        body: {
          mode: "search_contacts",
          company_name: row.company_name,
          domain: row.domain,
          limit: 3,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const contacts = data.data || [];
      if (contacts.length === 0) {
        toast.info(`No contacts found for ${row.company_name}`);
      } else {
        const names = contacts.map((c: any) => `${c.name} (${c.title})`).join(", ");
        toast.success(`Found ${contacts.length} contacts at ${row.company_name}: ${names}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Contact enrichment failed");
    } finally {
      setEnrichingRows((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const triggerLabel = (type: string) =>
    TRIGGER_TYPES.find((t) => t.value === type)?.label || type.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      {/* Deferred Banner */}
      <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-400">Deferred</Badge>
          <span className="font-medium text-amber-800 dark:text-amber-300 text-sm">Lead411 Integration — Not Yet Active</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Lead411 requires a work email for signup. This feature will activate when <span className="font-mono">LEAD411_API_KEY</span> is configured.
          For now, Apollo and Crunchbase provide basic funding/growth signals through the other discovery tabs.
        </p>
      </div>

      {/* Filters */}
      <Card className="opacity-60 pointer-events-none">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Signal Filters
          </CardTitle>
          <CardDescription>
            Find companies with verified, timestamped growth intent signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Trigger Types</Label>
            <div className="flex flex-wrap gap-3">
              {TRIGGER_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedTriggers.includes(t.value)}
                    onCheckedChange={() => toggleTrigger(t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input placeholder="e.g. Healthcare" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="e.g. Texas" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Min Headcount</Label>
              <Input type="number" min={HEADCOUNT_MIN} max={HEADCOUNT_MAX} value={headcountMin} onChange={(e) => setHeadcountMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Headcount</Label>
              <Input type="number" min={HEADCOUNT_MIN} max={HEADCOUNT_MAX} value={headcountMax} onChange={(e) => setHeadcountMax(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={searchMutation.isPending || selectedTriggers.length === 0}
          >
            {searchMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> Find Growing Companies</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Results</CardTitle>
              <Badge variant="secondary">{results.length} companies with active triggers</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                  <TableHead>Headcount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {triggerLabel(row.trigger_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.trigger_date || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-[250px] truncate">
                      {row.trigger_description || "—"}
                    </TableCell>
                    <TableCell>{row.employee_count ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={savingRows.has(idx)}
                          onClick={() => handleSaveToCRM(row, idx)}
                        >
                          {savingRows.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={enrichingRows.has(idx)}
                          onClick={() => handleEnrichContact(row, idx)}
                        >
                          {enrichingRows.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserSearch className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {results.length === 0 && !searchMutation.isPending && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No growth signals yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Select trigger types above and click "Find Growing Companies" to discover businesses with active growth intent.
          </p>
        </div>
      )}
    </div>
  );
}
