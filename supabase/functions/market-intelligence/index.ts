import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDUSTRY_NAICS: Record<string, string> = {
  "Construction": "23",
  "Manufacturing": "31-33",
  "Wholesale Trade": "42",
  "Retail Trade": "44-45",
  "Transportation": "48-49",
  "Healthcare": "62",
  "Accommodation & Food": "72",
  "Professional Services": "54",
  "Administrative Services": "56",
  "Real Estate": "53",
  "Other Services": "81",
};

const STATE_FIPS: Record<string, string> = {
  "Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05",
  "California": "06", "Colorado": "08", "Connecticut": "09", "Delaware": "10",
  "Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16",
  "Illinois": "17", "Indiana": "18", "Iowa": "19", "Kansas": "20",
  "Kentucky": "21", "Louisiana": "22", "Maine": "23", "Maryland": "24",
  "Massachusetts": "25", "Michigan": "26", "Minnesota": "27", "Mississippi": "28",
  "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40",
  "Oregon": "41", "Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45",
  "South Dakota": "46", "Tennessee": "47", "Texas": "48", "Utah": "49",
  "Vermont": "50", "Virginia": "51", "Washington": "53", "West Virginia": "54",
  "Wisconsin": "55", "Wyoming": "56",
};

interface IndustryMetric {
  industry: string;
  naics: string;
  state: string;
  establishments: number;
  employees: number;
  payroll_annual: number;
  avg_employees_per_establishment: number;
  year: string;
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const censusApiKey = Deno.env.get("CENSUS_API_KEY");

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const {
      states = ["California", "Texas", "Florida"],
      industries = ["Construction", "Healthcare", "Accommodation & Food", "Professional Services"],
      compare_years = ["2022", "2021"],
    } = body;

    const [currentYear, priorYear] = compare_years;
    const insights: GrowthInsight[] = [];
    const rawData: IndustryMetric[] = [];

    for (const stateName of states) {
      const fips = STATE_FIPS[stateName];
      if (!fips) continue;

      for (const industryName of industries) {
        const naics = INDUSTRY_NAICS[industryName];
        if (!naics) continue;

        const currentData = await fetchCBP(censusApiKey, fips, naics, currentYear);
        const priorData = await fetchCBP(censusApiKey, fips, naics, priorYear);

        if (currentData) {
          rawData.push({
            industry: industryName,
            naics,
            state: stateName,
            establishments: currentData.establishments,
            employees: currentData.employees,
            payroll_annual: currentData.payroll,
            avg_employees_per_establishment: currentData.employees > 0 && currentData.establishments > 0
              ? Math.round(currentData.employees / currentData.establishments)
              : 0,
            year: currentYear,
          });
        }

        if (currentData && priorData) {
          const estGrowth = priorData.establishments > 0
            ? ((currentData.establishments - priorData.establishments) / priorData.establishments) * 100
            : 0;
          const empGrowth = priorData.employees > 0
            ? ((currentData.employees - priorData.employees) / priorData.employees) * 100
            : 0;
          const avgSize = currentData.establishments > 0
            ? Math.round(currentData.employees / currentData.establishments)
            : 0;

          let peoScore = 0;
          if (avgSize >= 2 && avgSize <= 20) peoScore += 40;
          else if (avgSize >= 1 && avgSize <= 50) peoScore += 20;

          if (empGrowth > 10) peoScore += 30;
          else if (empGrowth > 5) peoScore += 20;
          else if (empGrowth > 0) peoScore += 10;

          if (estGrowth > 5) peoScore += 20;
          else if (estGrowth > 0) peoScore += 10;

          if (currentData.establishments > 10000) peoScore += 10;
          else if (currentData.establishments > 5000) peoScore += 5;

          const insight = generateInsight(industryName, stateName, estGrowth, empGrowth, avgSize, currentData.establishments);

          insights.push({
            industry: industryName,
            state: stateName,
            current_establishments: currentData.establishments,
            current_employees: currentData.employees,
            prior_establishments: priorData.establishments,
            prior_employees: priorData.employees,
            establishment_growth_pct: Math.round(estGrowth * 10) / 10,
            employee_growth_pct: Math.round(empGrowth * 10) / 10,
            avg_firm_size: avgSize,
            peo_opportunity_score: Math.min(peoScore, 100),
            insight,
          });
        }
      }

      await new Promise(r => setTimeout(r, 300));
    }

    insights.sort((a, b) => b.peo_opportunity_score - a.peo_opportunity_score);

    const topOpportunities = insights.slice(0, 5).map((i) => ({
      recommendation: `${i.industry} in ${i.state}`,
      why: i.insight,
      score: i.peo_opportunity_score,
      action: `Search for ${i.industry.toLowerCase()} companies with 2-20 employees in ${i.state} using Intent or Local Business discovery.`,
    }));

    return new Response(JSON.stringify({
      success: true,
      compare_years: { current: currentYear, prior: priorYear },
      insights,
      raw_data: rawData,
      top_opportunities: topOpportunities,
      total_industries_analyzed: insights.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("market-intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchCBP(
  apiKey: string | undefined,
  stateFips: string,
  naics: string,
  year: string
): Promise<{ establishments: number; employees: number; payroll: number } | null> {
  try {
    const params = new URLSearchParams({
      get: "ESTAB,EMP,PAYANN",
      for: `state:${stateFips}`,
      NAICS2017: naics,
      TIME: year,
    });
    if (apiKey) params.set("key", apiKey);

    const url = `https://api.census.gov/data/timeseries/cbp?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Census CBP error for state ${stateFips}, NAICS ${naics}, year ${year}:`, response.status);
      return null;
    }

    let data = await response.json();

    // Fallback: try NAICS2012 for older years
    if (!data || data.length < 2) {
      params.delete("NAICS2017");
      params.set("NAICS2012", naics);
      const retryUrl = `https://api.census.gov/data/timeseries/cbp?${params}`;
      const retryResp = await fetch(retryUrl);
      if (!retryResp.ok) return null;
      data = await retryResp.json();
      if (!data || data.length < 2) return null;
    }

    const headers = data[0] as string[];
    const row = data[1] as string[];

    const estabIdx = headers.indexOf("ESTAB");
    const empIdx = headers.indexOf("EMP");
    const payIdx = headers.indexOf("PAYANN");

    return {
      establishments: parseInt(row[estabIdx]) || 0,
      employees: parseInt(row[empIdx]) || 0,
      payroll: parseInt(row[payIdx]) || 0,
    };
  } catch (err) {
    console.error("CBP fetch error:", err);
    return null;
  }
}

function generateInsight(
  industry: string,
  state: string,
  estGrowth: number,
  empGrowth: number,
  avgSize: number,
  establishments: number
): string {
  const parts: string[] = [];

  if (empGrowth > 10) {
    parts.push(`${industry} employment in ${state} grew ${Math.round(empGrowth)}% — rapid expansion means companies are hiring and need HR infrastructure`);
  } else if (empGrowth > 5) {
    parts.push(`${industry} in ${state} is growing steadily at ${Math.round(empGrowth)}% employment growth`);
  } else if (empGrowth > 0) {
    parts.push(`${industry} in ${state} shows modest ${Math.round(empGrowth)}% employment growth`);
  } else {
    parts.push(`${industry} employment in ${state} contracted ${Math.abs(Math.round(empGrowth))}% — focus on cost savings messaging`);
  }

  if (avgSize >= 2 && avgSize <= 20) {
    parts.push(`Average firm size (${avgSize} employees) is squarely in Down Market territory`);
  } else if (avgSize > 20 && avgSize <= 50) {
    parts.push(`Average firm size is ${avgSize} — above territory, but many individual firms will be in the 2-20 range`);
  }

  if (estGrowth > 5) {
    parts.push(`${Math.round(estGrowth)}% more new businesses — new companies need PEO from day one`);
  }

  parts.push(`${establishments.toLocaleString()} total establishments in this sector`);

  return parts.join(". ") + ".";
}
