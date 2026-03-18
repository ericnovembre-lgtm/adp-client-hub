import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADP_BENEFITS_KNOWLEDGE } from "@/lib/adpBenefitsKnowledge";
import { ShieldCheck, AlertTriangle, XCircle, Building2 } from "lucide-react";

const US_STATES = [
  "AZ","AR","CA","CO","CT","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "MA","MD","MI","MN","MO","MT","NC","NE","NH","NJ","NV","NY","OH","OK","OR",
  "PA","RI","SC","TN","TX","UT","VA","WA","WI","WV","WY","SD","ND","NM","VT",
  "ME","AK","AL","MS",
];

interface EligibilityResult {
  prime: boolean;
  standard: boolean;
  tsSelect: boolean;
  tsNotAvailable: boolean;
  carriers: string[];
  notes: string[];
  wageThreshold: string;
}

function checkEligibility(headcount: number, state: string): EligibilityResult {
  const kb = ADP_BENEFITS_KNOWLEDGE;
  const result: EligibilityResult = {
    prime: false,
    standard: false,
    tsSelect: false,
    tsNotAvailable: false,
    carriers: [],
    notes: [],
    wageThreshold: "",
  };

  // Check if TS is available in this state at all
  if (kb.tsNotAvailable.includes(state)) {
    result.tsNotAvailable = true;
    result.notes.push(`ADP TotalSource is not available in ${state}`);
    return result;
  }

  // Find carrier info — handle CA_N/CA_S and other compound keys
  const carrierKeys = Object.keys(kb.stateCarriers);
  const matchingKeys = carrierKeys.filter(
    (k) => k === state || k.startsWith(`${state}_`)
  );

  if (matchingKeys.length > 0) {
    const allCarriers = new Set<string>();
    let primeAllowed = true;
    matchingKeys.forEach((k) => {
      const info = kb.stateCarriers[k as keyof typeof kb.stateCarriers];
      info.medical.forEach((c) => allCarriers.add(c));
      if (!info.prime) primeAllowed = false;
      if (info.note) result.notes.push(info.note);
    });
    result.carriers = Array.from(allCarriers);

    // PRIME check
    if (
      primeAllowed &&
      headcount >= kb.prime.enrollmentCriteria.minBenefitEligible &&
      headcount <= kb.prime.enrollmentCriteria.maxBenefitEligible
    ) {
      result.prime = true;
      result.wageThreshold = kb.prime.averageWage.standard + " (standard) / " + kb.prime.averageWage.highCostMetro;
    }
  }

  // Standard check
  const stateException = kb.standardQuoting.stateExceptions[state as keyof typeof kb.standardQuoting.stateExceptions];
  if (headcount >= kb.standardQuoting.default.minEligible) {
    result.standard = true;
    if (stateException) {
      result.notes.push(stateException);
    }
  }

  // TS Select fallback for certain states
  if (state === "MD" && headcount < 60) {
    result.tsSelect = true;
    result.standard = false;
  }
  if (state === "UT") {
    result.tsSelect = true;
  }
  if (state === "PA") {
    result.tsSelect = true; // western PA
  }

  // Excluded from PRIME states
  if (kb.prime.excludedStates.includes(state)) {
    result.prime = false;
  }

  return result;
}

export default function BenefitsEligibilityChecker() {
  const [headcount, setHeadcount] = useState<string>("");
  const [state, setState] = useState<string>("");

  const result = useMemo(() => {
    const hc = parseInt(headcount);
    if (!state || isNaN(hc) || hc < 1) return null;
    return checkEligibility(hc, state);
  }, [headcount, state]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Benefits Eligibility Checker</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="elig-headcount" className="text-xs">Employee Count</Label>
            <Input
              id="elig-headcount"
              type="number"
              min={1}
              placeholder="e.g. 7"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="elig-state" className="text-xs">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="elig-state" className="h-9">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {result && (
          <div className="space-y-3 pt-1">
            {/* Program badges */}
            <div className="flex flex-wrap gap-2">
              {result.tsNotAvailable ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  TS Not Available
                </Badge>
              ) : (
                <>
                  <Badge
                    variant={result.prime ? "default" : "outline"}
                    className={`gap-1 ${result.prime ? "" : "opacity-50"}`}
                  >
                    {result.prime ? <ShieldCheck className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    PRIME
                  </Badge>
                  <Badge
                    variant={result.standard ? "default" : "outline"}
                    className={`gap-1 ${result.standard ? "" : "opacity-50"}`}
                  >
                    {result.standard ? <ShieldCheck className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    Standard TS
                  </Badge>
                  {result.tsSelect && (
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      TS Select
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Carriers */}
            {result.carriers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Medical Carriers</p>
                <div className="flex flex-wrap gap-1">
                  {result.carriers.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs font-normal">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Wage threshold for PRIME */}
            {result.prime && result.wageThreshold && (
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Avg Wage Requirement:</span>{" "}
                  {result.wageThreshold}
                </p>
              </div>
            )}

            {/* Notes */}
            {result.notes.length > 0 && (
              <div className="space-y-1.5">
                {result.notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-yellow-500" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!result && state && headcount && (
          <p className="text-xs text-muted-foreground">Enter a valid employee count to check eligibility.</p>
        )}
      </CardContent>
    </Card>
  );
}
