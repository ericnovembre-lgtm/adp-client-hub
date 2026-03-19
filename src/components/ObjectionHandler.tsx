import { useState } from "react";
import { ShieldAlert, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ObjectionResult {
  response: string;
  data_point: string;
  redirect_question: string;
  fallback: string;
}

export default function ObjectionHandler() {
  const [objection, setObjection] = useState("");
  const [industry, setIndustry] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ObjectionResult | null>(null);

  const handleSubmit = async () => {
    if (!objection.trim()) {
      toast.error("Type the objection you heard");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("objection-handler", {
        body: {
          objection: objection.trim(),
          industry: industry || undefined,
          headcount: headcount ? Number(headcount) : undefined,
        },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="space-y-3">
        <Textarea
          placeholder='Type the objection you just heard, e.g. "We think we\'re too small for a PEO"'
          value={objection}
          onChange={(e) => setObjection(e.target.value)}
          className="text-base min-h-[80px] resize-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Add context (optional)
        </button>

        {showContext && (
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs">Industry</Label>
              <Input
                placeholder="e.g. Construction"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">Headcount</Label>
              <Input
                type="number"
                placeholder="e.g. 12"
                min={2}
                max={20}
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !objection.trim()}
          className="w-full h-11 text-base font-semibold"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldAlert className="h-5 w-5 mr-2" />}
          {loading ? "Thinking..." : "Handle It"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Say This Now</p>
              <p className="text-lg leading-relaxed">{result.response}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cite This Stat</p>
              <p className="text-base">{result.data_point}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Then Ask</p>
              <p className="text-base italic">{result.redirect_question}</p>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">If They Push Back</p>
              <p className="text-sm text-muted-foreground">{result.fallback}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
