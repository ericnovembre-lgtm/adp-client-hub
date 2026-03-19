import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, BarChart3, Loader2, ArrowRight, ChevronDown, Info } from "lucide-react";
import BLSTrendsSection from "@/components/market-intelligence/BLSTrendsSection";

const TOP_STATES = [
  "California", "Texas", "New York", "Florida", "Illinois",
  "Pennsylvania", "Ohio", "Georgia", "New Jersey", "North Carolina",
  "Washington", "Massachusetts", "Virginia", "Michigan", "Colorado",
];

const ALL_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

const OTHER_STATES = ALL_STATES.filter(s => !TOP_STATES.includes(s));

const INDUSTRIES = [
  "Construction", "Manufacturing", "Wholesale Trade", "Retail Trade", "Transportation",
  "Healthcare", "Accommodation & Food", "Professional Services", "Administrative Services",
  "Real Estate", "Other Services",
];

const YEARS = ["2023", "2022", "2021", "2020", "2019", "2018"];

interface GrowthInsight {
  industry: string;
  state: string;
  current_establishments: number;
  current_employees: number;
  prior_establishments: number;
  prior_employees: number;
  establishment_growth_pct: number;
  employee_growth_pct: number;
  avg_firm_size: number;
  peo_opportunity_score: number;
  insight: string;
}

interface TopOpportunity {
  recommendation: string;
  why: string;
  score: number;
  action: string;
}

type SortKey = "industry" | "state" | "current_establishments" | "current_employees" | "establishment_growth_pct" | "employee_growth_pct" | "avg_firm_size" | "peo_opportunity_score";

export default function MarketIntelligencePage() {
  const [, navigate] = useLocation();
  const [selectedStates, setSelectedStates] = useState<string[]>(["California", "Texas", "Florida"]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["Construction", "Healthcare", "Accommodation & Food", "Professional Services"]);
  const [currentYear, setCurrentYear] = useState("2022");
  const [priorYear, setPriorYear] = useState("2021");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<GrowthInsight[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<TopOpportunity[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("peo_opportunity_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [moreStatesOpen, setMoreStatesOpen] = useState(false);

  const toggleState = (state: string) => {
    setSelectedStates(prev => prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]);
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  };

  const analyze = async () => {
    if (selectedStates.length === 0 || selectedIndustries.length === 0) {
      toast.error("Select at least one state and one industry");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-intelligence", {
        body: { states: selectedStates, industries: selectedIndustries, compare_years: [currentYear, priorYear] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights ?? []);
      setTopOpportunities(data.top_opportunities ?? []);
      toast.success(`Analyzed ${data.total_industries_analyzed} industry-state combinations`);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    }
    setLoading(false);
  };

  const sortedInsights = useMemo(() => {
    return [...insights].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [insights, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const scoreBorderColor = (score: number) => {
    if (score >= 70) return "border-l-emerald-500";
    if (score >= 40) return "border-l-yellow-500";
    return "border-l-red-500";
  };

  const growthCell = (pct: number) => (
    <span className={`flex items-center gap-1 ${pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct >= 0 ? "+" : ""}{pct}%
    </span>
  );

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && <span className="text-xs">{sortAsc ? "↑" : "↓"}</span>}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">Identify high-growth markets for PEO prospecting</p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <BarChart3 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          Market Intelligence shows you <strong>WHERE</strong> to prospect. It analyzes government employment data to identify which industries and states are growing fastest — so you focus your outreach where new hires are happening and PEO demand is rising.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* States */}
          <div className="space-y-2">
            <Label className="font-semibold">States (Top 15 by GDP)</Label>
            <div className="flex flex-wrap gap-3">
              {TOP_STATES.map(s => (
                <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={selectedStates.includes(s)} onCheckedChange={() => toggleState(s)} />
                  {s}
                </label>
              ))}
            </div>
            <Collapsible open={moreStatesOpen} onOpenChange={setMoreStatesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${moreStatesOpen ? "rotate-180" : ""}`} />
                  {moreStatesOpen ? "Hide" : "More states"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-3 mt-2">
                  {OTHER_STATES.map(s => (
                    <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox checked={selectedStates.includes(s)} onCheckedChange={() => toggleState(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label className="font-semibold">Industries</Label>
            <div className="flex flex-wrap gap-3">
              {INDUSTRIES.map(ind => (
                <label key={ind} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={selectedIndustries.includes(ind)} onCheckedChange={() => toggleIndustry(ind)} />
                  {ind}
                </label>
              ))}
            </div>
          </div>

          {/* Years */}
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label>Current Year</Label>
              <Select value={currentYear} onValueChange={setCurrentYear}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <span className="pb-2 text-muted-foreground text-sm">vs</span>
            <div className="space-y-1">
              <Label>Prior Year</Label>
              <Select value={priorYear} onValueChange={setPriorYear}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Analyze Markets
          </Button>
        </CardContent>
      </Card>

      {/* Top Opportunities */}
      {topOpportunities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Top Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topOpportunities.map((opp, i) => (
              <Card key={i} className={`border-l-4 ${scoreBorderColor(opp.score)}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{opp.recommendation}</h3>
                    <span className={`text-2xl font-bold ${scoreColor(opp.score)}`}>{opp.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{opp.why}</p>
                  <p className="text-xs text-muted-foreground italic">{opp.action}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/ai-discovery")}
                  >
                    Find Leads <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* BLS Recent Trends */}
      <BLSTrendsSection
        states={selectedStates}
        industries={selectedIndustries}
        hasAnalyzed={insights.length > 0}
      />

      {/* Data Table */}
      {sortedInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Full Analysis</CardTitle>
            <CardDescription>Click column headers to sort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Industry" k="industry" />
                    <SortHeader label="State" k="state" />
                    <SortHeader label="Establishments" k="current_establishments" />
                    <SortHeader label="Employees" k="current_employees" />
                    <SortHeader label="Est. Growth %" k="establishment_growth_pct" />
                    <SortHeader label="Emp. Growth %" k="employee_growth_pct" />
                    <SortHeader label="Avg Firm Size" k="avg_firm_size" />
                    <SortHeader label="PEO Score" k="peo_opportunity_score" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInsights.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.industry}</TableCell>
                      <TableCell>{row.state}</TableCell>
                      <TableCell>{row.current_establishments.toLocaleString()}</TableCell>
                      <TableCell>{row.current_employees.toLocaleString()}</TableCell>
                      <TableCell>{growthCell(row.establishment_growth_pct)}</TableCell>
                      <TableCell>{growthCell(row.employee_growth_pct)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {row.avg_firm_size}
                          {row.avg_firm_size >= 2 && row.avg_firm_size <= 20 && (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">In Territory</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${scoreColor(row.peo_opportunity_score)}`}>
                          {row.peo_opportunity_score}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Data source: U.S. Census Bureau, County Business Patterns ({currentYear}). Updated annually.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
