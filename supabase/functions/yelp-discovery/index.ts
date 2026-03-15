import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERRITORY = { MIN: 2, MAX: 20, LABEL: "Down Market" };

const CATEGORY_GROUPS: Record<string, string[]> = {
  "Healthcare": ["dentists", "physicians", "chiropractors", "optometrists", "veterinarians", "physicaltherapy", "medicalpractices"],
  "Construction & Trades": ["contractors", "plumbing", "electricians", "hvac", "roofing", "painters", "landscaping", "handyman"],
  "Food & Beverage": ["restaurants", "catering", "foodtrucks", "bakeries", "cafes", "bars"],
  "Personal Care": ["hair", "barbershops", "spas", "skincare", "nailsalons", "tattoo"],
  "Automotive": ["autorepair", "bodyshops", "tires", "oilchange", "autoglass"],
  "Cleaning": ["homecleaning", "officecleaning", "carpetcleaning", "windowwashing"],
  "Fitness": ["gyms", "personaltrainers", "yoga", "martialarts", "pilates"],
  "Professional": ["accountants", "lawyers", "realestateagents", "insuranceagent", "financialadvising"],
};

const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flat();

function estimateHeadcount(biz: any): number | null {
  const reviewCount = biz.review_count ?? 0;
  const categories = (biz.categories ?? []).map((c: any) => c.alias);

  const isRestaurant = categories.some((c: string) => ["restaurants", "cafes", "bars", "bakeries"].includes(c));
  const isMedical = categories.some((c: string) => ["dentists", "physicians", "chiropractors", "medicalpractices"].includes(c));
  const isTrade = categories.some((c: string) => ["contractors", "plumbing", "electricians", "hvac", "roofing"].includes(c));

  if (isRestaurant) {
    if (reviewCount > 500) return 15;
    if (reviewCount > 200) return 10;
    if (reviewCount > 50) return 6;
    return 3;
  }
  if (isMedical) {
    if (reviewCount > 100) return 12;
    if (reviewCount > 30) return 7;
    return 4;
  }
  if (isTrade) {
    if (reviewCount > 50) return 10;
    if (reviewCount > 15) return 6;
    return 3;
  }
  if (reviewCount > 200) return 12;
  if (reviewCount > 50) return 8;
  if (reviewCount > 10) return 5;
  return 3;
}

function scorePEOReadiness(biz: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const reviewCount = biz.review_count ?? 0;
  const rating = biz.rating ?? 0;
  const estimatedHC = estimateHeadcount(biz);

  if (reviewCount > 200) { score += 25; reasons.push("High review volume — established business"); }
  else if (reviewCount > 50) { score += 15; reasons.push("Moderate reviews — growing business"); }
  else if (reviewCount > 10) { score += 5; reasons.push("Some reviews — active business"); }

  if (rating >= 4.5) { score += 15; reasons.push("Excellent rating — thriving business"); }
  else if (rating >= 4.0) { score += 10; reasons.push("Good rating — healthy business"); }

  if (estimatedHC && estimatedHC >= TERRITORY.MIN && estimatedHC <= TERRITORY.MAX) {
    score += 30; reasons.push(`Estimated ${estimatedHC} employees — fits territory`);
  }

  if (biz.price === "$$$$") { score += 15; reasons.push("Premium pricing — higher revenue"); }
  else if (biz.price === "$$$") { score += 10; reasons.push("Upper-mid pricing"); }
  else if (biz.price === "$$") { score += 5; reasons.push("Mid-range pricing"); }

  if ((biz.categories?.length ?? 0) > 2) {
    score += 5; reasons.push("Multiple service categories — operational complexity");
  }

  return { score: Math.min(score, 100), reasons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const yelpApiKey = Deno.env.get("YELP_API_KEY");

    if (!yelpApiKey) {
      return new Response(
        JSON.stringify({ error: "YELP_API_KEY not configured. Get your key from yelp.com/developers → Create App, then add it in Settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));

    // Test connection mode
    if (body.test_connection) {
      const testUrl = `https://api.yelp.com/v3/businesses/search?location=New+York&limit=1`;
      const testRes = await fetch(testUrl, { headers: { Authorization: `Bearer ${yelpApiKey}` } });
      const testBody = await testRes.text();
      if (!testRes.ok) {
        return new Response(JSON.stringify({ error: `Yelp API error: ${testRes.status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, message: "Yelp API connection successful" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const {
      location = "Los Angeles, CA",
      categories = ["contractors", "dentists", "restaurants", "hair"],
      min_reviews = 20,
      min_rating = 3.5,
      min_peo_score = 40,
      limit = 30,
      sort_by = "review_count",
    } = body;

    const results = {
      location,
      categories_searched: categories,
      found: 0,
      qualified: 0,
      saved: 0,
      skipped_duplicate: 0,
      skipped_low_score: 0,
      errors: 0,
      leads: [] as any[],
    };

    const categoriesToSearch = categories.length > 0 ? categories : ALL_CATEGORIES.slice(0, 8);

    for (const category of categoriesToSearch) {
      const searchParams = new URLSearchParams({
        location,
        categories: category,
        limit: String(Math.min(limit, 50)),
        sort_by,
      });

      const yelpUrl = `https://api.yelp.com/v3/businesses/search?${searchParams}`;
      const response = await fetch(yelpUrl, {
        headers: { Authorization: `Bearer ${yelpApiKey}` },
      });

      if (!response.ok) {
        console.error(`Yelp API error for ${category}:`, response.status);
        await response.text();
        continue;
      }

      const data = await response.json();
      const businesses = data.businesses ?? [];

      for (const biz of businesses) {
        if ((biz.review_count ?? 0) < min_reviews) continue;
        if ((biz.rating ?? 0) < min_rating) continue;

        results.found++;

        const { score, reasons } = scorePEOReadiness(biz);
        if (score < min_peo_score) {
          results.skipped_low_score++;
          continue;
        }

        results.qualified++;
        const estimatedHC = estimateHeadcount(biz);

        const bizName = biz.name ?? "Unknown";
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .ilike("company_name", bizName)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped_duplicate++;
          continue;
        }

        const primaryCategory = biz.categories?.[0]?.title ?? category;
        const fullAddress = [
          biz.location?.address1,
          biz.location?.city,
          biz.location?.state,
          biz.location?.zip_code,
        ].filter(Boolean).join(", ");

        const leadData = {
          company_name: bizName,
          industry: primaryCategory,
          state: biz.location?.state ?? null,
          headcount: estimatedHC,
          website: biz.url ? biz.url.split("?")[0] : null,
          decision_maker_name: null,
          decision_maker_title: "Owner/Manager",
          decision_maker_email: null,
          decision_maker_phone: biz.phone && biz.phone !== "" ? biz.phone : null,
          trigger_event: `Established local business: ${biz.review_count} reviews, ${biz.rating}★ rating on Yelp. ${fullAddress}. PEO readiness score: ${score}/100 — ${reasons.join("; ")}.`,
          trigger_type: "established_local_business",
          ai_pitch_summary: `${bizName} is an established ${primaryCategory.toLowerCase()} business in ${biz.location?.city ?? location} with ${biz.review_count} reviews and a ${biz.rating}★ rating — clearly a thriving operation. Estimated ~${estimatedHC} employees. Businesses at this stage often handle HR informally. Lead with: how much time do you spend on payroll and compliance vs running your business? ADP TotalSource gives you a dedicated HR team so you can focus on what you do best.`,
          source: "yelp_discovery",
          status: "new",
        };

        const { data: newLead, error: insertErr } = await supabase
          .from("leads")
          .insert({ ...leadData, user_id: user.id })
          .select()
          .single();

        if (insertErr) {
          console.error("Failed to insert Yelp lead:", insertErr.message);
          results.errors++;
          continue;
        }

        await supabase.from("activities").insert({
          type: "system",
          description: `Lead discovered via Yelp: ${bizName} — ${biz.review_count} reviews, ${biz.rating}★, ${primaryCategory}, ${biz.location?.city ?? ""}. PEO score: ${score}/100.`,
          lead_id: newLead.id,
          user_id: user.id,
        });

        results.saved++;
        results.leads.push({
          id: newLead.id,
          company_name: bizName,
          industry: primaryCategory,
          city: biz.location?.city,
          state: biz.location?.state,
          reviews: biz.review_count,
          rating: biz.rating,
          phone: biz.phone,
          estimated_headcount: estimatedHC,
          peo_score: score,
          peo_reasons: reasons,
        });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    results.leads.sort((a, b) => (b.peo_score ?? 0) - (a.peo_score ?? 0));

    // Read-merge-write for user_settings
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle();

    const mergedSettings = {
      ...(existingSettings?.settings as Record<string, any> ?? {}),
      yelp_last_run: new Date().toISOString(),
      yelp_last_location: location,
      yelp_leads_saved: results.saved,
      yelp_status: "completed",
    };

    await supabase.from("user_settings").upsert({
      user_id: user.id,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("yelp-discovery error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
