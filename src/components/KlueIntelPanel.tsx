import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Database } from "lucide-react";
import { toast } from "sonner";

const COMPETITORS = [
  "All Competitors",
  "Rippling",
  "TriNet",
  "Paychex",
  "Insperity",
  "Justworks",
  "VensureHR",
  "Gusto",
  "BambooHR",
];

export default function KlueIntelPanel() {
  const [competitor, setCompetitor] = useState("All Competitors");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [cards, setCards] = useState<any[]>([]);
  const [cardCount, setCardCount] = useState<number | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setAnalysis("");
    setCards([]);
    setCardCount(null);

    try {
      const isSearch = question.trim().length > 0;
      const body: Record<string, any> = {
        mode: isSearch ? "search" : "cards",
      };
      if (competitor !== "All Competitors") body.competitor = competitor;
      if (isSearch) body.query = question.trim();

      const { data, error } = await supabase.functions.invoke("klue-intelligence", { body });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "klue_not_configured") {
          toast.error("Klue API key not configured. Go to Settings to set up the integration.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setCardCount(data.card_count ?? 0);
      if (data.analysis) setAnalysis(data.analysis);
      if (data.cards && Array.isArray(data.cards)) setCards(data.cards);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch Klue intelligence");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Competitor</label>
          <Select value={competitor} onValueChange={setCompetitor}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPETITORS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Question (optional)</label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is Rippling's latest pricing model?"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      <Button onClick={handleSearch} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {loading ? "Searching Klue…" : "Search Klue"}
      </Button>

      {cardCount !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{cardCount} card{cardCount !== 1 ? "s" : ""} found</span>
        </div>
      )}

      {analysis && (
        <Card>
          <CardContent className="p-4">
            <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">AI Analysis</Badge>
            <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
              {analysis}
            </div>
          </CardContent>
        </Card>
      )}

      {!analysis && cards.length > 0 && (
        <div className="space-y-2">
          {cards.slice(0, 20).map((card: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className="text-sm font-medium text-foreground">{card.title || card.name || `Card ${i + 1}`}</p>
                {card.body && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{typeof card.body === "string" ? card.body : JSON.stringify(card.body)}</p>
                )}
                {card.tags && Array.isArray(card.tags) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {card.tags.map((tag: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
