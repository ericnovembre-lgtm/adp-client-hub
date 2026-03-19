import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Swords, Check } from "lucide-react";
import { toast } from "sonner";

const COMPETITORS = [
  "Rippling",
  "TriNet",
  "Paychex",
  "Insperity",
  "Justworks",
  "VensureHR",
  "Gusto",
  "BambooHR",
  "Other",
];

interface BattlecardPanelProps {
  lead_id?: string;
  defaultCompetitor?: string;
  defaultIndustry?: string;
  defaultHeadcount?: number;
  defaultState?: string;
}

export default function BattlecardPanel({
  lead_id,
  defaultCompetitor = "",
  defaultIndustry = "",
  defaultHeadcount,
  defaultState = "",
}: BattlecardPanelProps) {
  const [competitor, setCompetitor] = useState(defaultCompetitor);
  const [industry, setIndustry] = useState(defaultIndustry);
  const [headcount, setHeadcount] = useState(defaultHeadcount?.toString() ?? "");
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [battlecard, setBattlecard] = useState("");
  const [displacementEmail, setDisplacementEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!competitor) {
      toast.error("Please select a competitor");
      return;
    }
    setLoading(true);
    setBattlecard("");
    setDisplacementEmail("");
    try {
      const { data, error } = await supabase.functions.invoke("battlecard", {
        body: {
          competitor,
          industry: industry || undefined,
          headcount: headcount ? Number(headcount) : undefined,
          state: state || undefined,
          lead_id: lead_id || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBattlecard(data.battlecard);
      setDisplacementEmail(data.displacement_email || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate battlecard");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(displacementEmail);
      setCopied(true);
      toast.success("Displacement email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Competitor</label>
          <Select value={competitor} onValueChange={setCompetitor}>
            <SelectTrigger>
              <SelectValue placeholder="Select competitor…" />
            </SelectTrigger>
            <SelectContent>
              {COMPETITORS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Construction" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Headcount</label>
          <Input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="e.g. 12" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">State</label>
          <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. TX" />
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={loading || !competitor} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
        {loading ? "Generating…" : "Generate Battlecard"}
      </Button>

      {battlecard && (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
            {battlecard}
          </CardContent>
        </Card>
      )}

      {displacementEmail && (
        <Button variant="outline" className="w-full gap-2" onClick={handleCopyEmail}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Displacement Email"}
        </Button>
      )}
    </div>
  );
}
