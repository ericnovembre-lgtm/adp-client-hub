import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

interface QuoteResult {
  checklist: string;
  group_type: "prime" | "standard";
  state_available: boolean;
  industry_status: string;
}

export default function QuoteReadinessPanel({
  lead_id,
  defaultState,
  defaultHeadcount,
}: {
  lead_id?: string;
  defaultState?: string | null;
  defaultHeadcount?: number | null;
}) {
  const [state, setState] = useState(defaultState ?? "");
  const [headcount, setHeadcount] = useState(defaultHeadcount ?? "");
  const [enrolled, setEnrolled] = useState<number | "">("");
  const [carrier, setCarrier] = useState("");
  const [selfFunded, setSelfFunded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const handleCheck = async () => {
    if (!state || !headcount) {
      toast.error("State and headcount are required");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("quote-readiness", {
        body: {
          lead_id,
          state,
          headcount: Number(headcount),
          currently_enrolled: enrolled || undefined,
          current_carrier: carrier || undefined,
          is_self_funded: selfFunded,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Readiness check complete");
    } catch (err: any) {
      toast.error(err.message || "Failed to check readiness");
    } finally {
      setLoading(false);
    }
  };

  const industryConfig: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
    clear: { label: "Eligible", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300", icon: ShieldCheck },
    bluefield: { label: "Conditional", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300", icon: ShieldQuestion },
    low_probability: { label: "Low Probability", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300", icon: ShieldAlert },
    prohibited: { label: "Prohibited", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300", icon: ShieldX },
  };

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="qr-state">State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger id="qr-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-headcount">Benefit-Eligible Headcount</Label>
          <Input
            id="qr-headcount"
            type="number"
            min={1}
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value ? Number(e.target.value) : "")}
            placeholder="e.g. 12"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-enrolled">Currently Enrolled in Medical</Label>
          <Input
            id="qr-enrolled"
            type="number"
            min={0}
            value={enrolled}
            onChange={(e) => setEnrolled(e.target.value ? Number(e.target.value) : "")}
            placeholder="e.g. 8"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-carrier">Current Carrier</Label>
          <Input
            id="qr-carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="e.g. Blue Cross"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="qr-self-funded"
            checked={selfFunded}
            onCheckedChange={(v) => setSelfFunded(!!v)}
          />
          <Label htmlFor="qr-self-funded" className="cursor-pointer">Currently self-funded</Label>
        </div>
      </div>

      <Button onClick={handleCheck} disabled={loading || !state || !headcount} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
        {loading ? "Checking…" : "Check Readiness"}
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={result.group_type === "prime"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300"
            }>
              {result.group_type === "prime" ? "PRIME" : "Standard"} Group
            </Badge>

            <Badge variant="outline" className={result.state_available
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300"
            }>
              {result.state_available ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />TS Available</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />TS Not Available</>
              )}
            </Badge>

            {(() => {
              const cfg = industryConfig[result.industry_status] ?? industryConfig.clear;
              const Icon = cfg.icon;
              return (
                <Badge variant="outline" className={cfg.className}>
                  <Icon className="h-3 w-3 mr-1" />{cfg.label}
                </Badge>
              );
            })()}
          </div>

          {/* State Warning */}
          {!result.state_available && (
            <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              ADP TotalSource is not available in {state}. This prospect cannot be quoted.
            </div>
          )}

          {/* Industry Warning */}
          {result.industry_status === "prohibited" && (
            <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <ShieldX className="h-4 w-4 shrink-0" />
              This industry is prohibited under current WC underwriting rules.
            </div>
          )}

          {result.industry_status === "low_probability" && (
            <div className="rounded-md border border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-3 text-xs text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This industry has low probability of approval. Proceed with caution.
            </div>
          )}

          {/* Checklist */}
          <Card>
            <CardContent className="p-4">
              <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-foreground">
                {result.checklist}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
