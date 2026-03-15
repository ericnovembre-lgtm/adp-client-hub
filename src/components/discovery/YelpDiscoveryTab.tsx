import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { MapPin, Loader2, CheckCircle, ChevronDown } from "lucide-react";

const CATEGORY_GROUPS: Record<string, { label: string; alias: string }[]> = {
  "Healthcare": [
    { label: "Dentists", alias: "dentists" },
    { label: "Physicians", alias: "physicians" },
    { label: "Chiropractors", alias: "chiropractors" },
    { label: "Veterinarians", alias: "veterinarians" },
    { label: "Physical Therapy", alias: "physicaltherapy" },
  ],
  "Construction & Trades": [
    { label: "Contractors", alias: "contractors" },
    { label: "Plumbing", alias: "plumbing" },
    { label: "Electricians", alias: "electricians" },
    { label: "HVAC", alias: "hvac" },
    { label: "Roofing", alias: "roofing" },
    { label: "Landscaping", alias: "landscaping" },
  ],
  "Food & Beverage": [
    { label: "Restaurants", alias: "restaurants" },
    { label: "Catering", alias: "catering" },
    { label: "Food Trucks", alias: "foodtrucks" },
    { label: "Bakeries", alias: "bakeries" },
    { label: "Cafes", alias: "cafes" },
  ],
  "Personal Care": [
    { label: "Hair Salons", alias: "hair" },
    { label: "Barbershops", alias: "barbershops" },
    { label: "Spas", alias: "spas" },
    { label: "Nail Salons", alias: "nailsalons" },
  ],
  "Automotive": [
    { label: "Auto Repair", alias: "autorepair" },
    { label: "Body Shops", alias: "bodyshops" },
    { label: "Tires", alias: "tires" },
  ],
  "Professional": [
    { label: "Accountants", alias: "accountants" },
    { label: "Real Estate Agents", alias: "realestateagents" },
    { label: "Insurance Agents", alias: "insuranceagent" },
  ],
};

interface YelpLead {
  id: string;
  company_name: string;
  industry: string;
  city: string;
  state: string;
  reviews: number;
  rating: number;
  phone: string;
  estimated_headcount: number | null;
  peo_score: number;
  peo_reasons: string[];
}

export default function YelpDiscoveryTab() {
  const qc = useQueryClient();
  const [location, setLocation] = useState("Los Angeles, CA");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["contractors", "dentists", "restaurants", "hair"]);
  const [minReviews, setMinReviews] = useState(20);
  const [minRating, setMinRating] = useState("3.5");
  const [minPeoScore, setMinPeoScore] = useState(40);
  const [sortBy, setSortBy] = useState("review_count");

  const toggleCategory = (alias: string) => {
    setSelectedCategories(prev =>
      prev.includes(alias) ? prev.filter(c => c !== alias) : [...prev, alias]
    );
  };

  const discover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("yelp-discovery", {
        body: {
          location,
          categories: selectedCategories,
          min_reviews: minReviews,
          min_rating: parseFloat(minRating),
          min_peo_score: minPeoScore,
          sort_by: sortBy,
          limit: 30,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        found: number;
        qualified: number;
        saved: number;
        skipped_duplicate: number;
        skipped_low_score: number;
        errors: number;
        leads: YelpLead[];
      };
    },
    onSuccess: (data) => {
      toast.success(`Found ${data.qualified} qualified businesses, saved ${data.saved} new leads!`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-leads"] });
    },
    onError: (e: any) => toast.error(e.message || "Yelp discovery failed"),
  });

  const peoScoreBadge = (score: number) => {
    if (score >= 70) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300";
    if (score >= 40) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300";
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          Local Business Discovery uses Yelp to find established service businesses in your target area.
          Businesses with strong review activity and multiple employees are mature enough for PEO services
          but often handle HR informally — perfect candidates for ADP TotalSource.
        </AlertDescription>
      </Alert>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Find Local Businesses
          </CardTitle>
          <CardDescription>Search for established service businesses using Yelp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="yelp-location">Location</Label>
            <Input
              id="yelp-location"
              placeholder="City, State (e.g., Phoenix, AZ)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Category Groups */}
          <div className="space-y-2">
            <Label>Business Categories</Label>
            <div className="space-y-1">
              {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                <Collapsible key={group}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
                    <ChevronDown className="h-3.5 w-3.5" />
                    {group}
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {cats.filter(c => selectedCategories.includes(c.alias)).length}/{cats.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-5 pb-2">
                      {cats.map((cat) => (
                        <label key={cat.alias} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedCategories.includes(cat.alias)}
                            onCheckedChange={() => toggleCategory(cat.alias)}
                          />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Min Reviews: {minReviews}</Label>
              <Slider
                value={[minReviews]}
                onValueChange={([v]) => setMinReviews(v)}
                min={10}
                max={200}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Rating</Label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3.0">3.0+</SelectItem>
                  <SelectItem value="3.5">3.5+</SelectItem>
                  <SelectItem value="4.0">4.0+</SelectItem>
                  <SelectItem value="4.5">4.5+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min PEO Score: {minPeoScore}</Label>
              <Slider
                value={[minPeoScore]}
                onValueChange={([v]) => setMinPeoScore(v)}
                min={20}
                max={80}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="review_count">Most Reviews</SelectItem>
                  <SelectItem value="rating">Best Rating</SelectItem>
                  <SelectItem value="best_match">Best Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => discover.mutate()}
            disabled={discover.isPending || !location.trim()}
            className="w-full sm:w-auto"
          >
            {discover.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
            ) : (
              <><MapPin className="h-4 w-4" /> Find Local Businesses</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {discover.isSuccess && discover.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Results
            </CardTitle>
            <CardDescription>
              Found {discover.data.found} businesses, {discover.data.qualified} qualified (PEO score ≥ {minPeoScore}),
              saved {discover.data.saved}{discover.data.skipped_duplicate > 0 ? `, skipped ${discover.data.skipped_duplicate} duplicates` : ""}
              {discover.data.skipped_low_score > 0 ? `, ${discover.data.skipped_low_score} below score threshold` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {discover.data.leads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No new leads saved — all matches were duplicates or below threshold.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">Reviews</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Est. HC</TableHead>
                        <TableHead className="text-right">PEO Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discover.data.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.industry}</TableCell>
                          <TableCell>{lead.city}</TableCell>
                          <TableCell>{lead.state}</TableCell>
                          <TableCell className="text-right">{lead.reviews}</TableCell>
                          <TableCell className="text-right">{lead.rating}★</TableCell>
                          <TableCell className="text-xs">{lead.phone || "—"}</TableCell>
                          <TableCell className="text-right">{lead.estimated_headcount ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className={peoScoreBadge(lead.peo_score)}>
                                  {lead.peo_score}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <ul className="text-xs space-y-0.5">
                                  {lead.peo_reasons.map((r, i) => (
                                    <li key={i}>• {r}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {discover.isIdle && (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">No local business search yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Enter a location and select business categories above to find established local businesses that could benefit from PEO services.
          </p>
        </div>
      )}
    </div>
  );
}
