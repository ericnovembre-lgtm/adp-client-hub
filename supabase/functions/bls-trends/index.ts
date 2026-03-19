import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// State name → FIPS code mapping
const STATE_FIPS: Record<string, string> = {
  Alabama: "01", Alaska: "02", Arizona: "04", Arkansas: "05", California: "06",
  Colorado: "08", Connecticut: "09", Delaware: "10", Florida: "12", Georgia: "13",
  Hawaii: "15", Idaho: "16", Illinois: "17", Indiana: "18", Iowa: "19",
  Kansas: "20", Kentucky: "21", Louisiana: "22", Maine: "23", Maryland: "24",
  Massachusetts: "25", Michigan: "26", Minnesota: "27", Mississippi: "28",
  Missouri: "29", Montana: "30", Nebraska: "31", Nevada: "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", Ohio: "39", Oklahoma: "40",
  Oregon: "41", Pennsylvania: "42", "Rhode Island": "44", "South Carolina": "45",
  "South Dakota": "46", Tennessee: "47", Texas: "48", Utah: "49", Vermont: "50",
  Virginia: "51", Washington: "53", "West Virginia": "54", Wisconsin: "55",
  Wyoming: "56",
};

// Industry name → NAICS super-sector code for QCEW
const INDUSTRY_NAICS: Record<string, string> = {
  Construction: "1012",
  Manufacturing: "1013",
  "Wholesale Trade": "1024",
  "Retail Trade": "1025",
  Transportation: "1026",
  Healthcare: "1029",
  "Accommodation & Food": "1026",
  "Professional Services": "1027",
  "Administrative Services": "1027",
  "Real Estate": "1027",
  "Other Services": "1029",
};

// More specific NAICS 2-digit codes for BLS QCEW API
const INDUSTRY_NAICS_2DIGIT: Record<string, string> = {
  Construction: "23",
  Manufacturing: "31-33",
  "Wholesale Trade": "42",
  "Retail Trade": "44-45",
  Transportation: "48-49",
  Healthcare: "62",
  "Accommodation & Food": "72",
  "Professional Services": "54",
  "Administrative Services": "56",
  "Real Estate": "53",
  "Other Services": "81",
};

interface BLSTrendResult {
  industry: string;
  state: string;
  latest_quarter: string;
  employment_level: number | null;
  prior_employment_level: number | null;
  employment_change_pct: number | null;
  avg_weekly_wage: number | null;
  prior_avg_weekly_wage: number | null;
  wage_change_pct: number | null;
  is_hot_market: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { states, industries } = await req.json();

    if (!states?.length || !industries?.length) {
      return new Response(
        JSON.stringify({ error: "States and industries are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use BLS QCEW Data API (REST) instead of timeseries
    // https://www.bls.gov/cew/downloadable-data-files.htm
    // QCEW single-file API: https://data.bls.gov/cew/data/api/YEAR/QTR/industry/NAICS.csv
    const currentYear = new Date().getFullYear();
    // QCEW has ~6 month lag, try current year - 1 first, fall back to year - 2
    const tryYears = [currentYear - 1, currentYear - 2];

    const results: BLSTrendResult[] = [];
    let dataYear = 0;
    let dataQuarter = "";

    // Try to get data from the most recent available year
    for (const year of tryYears) {
      try {
        // Fetch annual QCEW data by industry for the latest available year
        // We'll use the QCEW single-file CSV API for each industry
        const industryResults = await fetchQCEWData(year, states, industries);
        if (industryResults.length > 0) {
          results.push(...industryResults);
          dataYear = year;
          dataQuarter = "Annual";
          break;
        }
      } catch (e) {
        console.log(`QCEW data not available for ${year}, trying earlier year`);
        continue;
      }
    }

    // If QCEW REST fails, try BLS Public Data API timeseries as fallback
    if (results.length === 0) {
      const timeseriesResults = await fetchBLSTimeseries(states, industries);
      results.push(...timeseriesResults);
      if (results.length > 0) {
        dataYear = currentYear - 1;
        dataQuarter = "Latest Available";
      }
    }

    return new Response(
      JSON.stringify({
        trends: results,
        data_year: dataYear,
        data_period: dataQuarter,
        total_pairs: results.length,
        hot_markets: results.filter((r) => r.is_hot_market).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("BLS trends error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Failed to fetch BLS data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchQCEWData(
  year: number,
  states: string[],
  industries: string[]
): Promise<BLSTrendResult[]> {
  const results: BLSTrendResult[] = [];

  for (const industry of industries) {
    const naics = INDUSTRY_NAICS_2DIGIT[industry];
    if (!naics) continue;

    // Use the simple NAICS code (first part if range)
    const naicsCode = naics.includes("-") ? naics.split("-")[0] : naics;

    // QCEW API endpoint for industry-level data
    const url = `https://data.bls.gov/cew/data/api/${year}/a/industry/${naicsCode}.csv`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        await resp.text();
        continue;
      }

      const csvText = await resp.text();
      const rows = parseCSV(csvText);

      // Also try to get prior year for comparison
      let priorRows: Record<string, any>[] = [];
      try {
        const priorUrl = `https://data.bls.gov/cew/data/api/${year - 1}/a/industry/${naicsCode}.csv`;
        const priorResp = await fetch(priorUrl);
        if (priorResp.ok) {
          const priorCsvText = await priorResp.text();
          priorRows = parseCSV(priorCsvText);
        } else {
          await priorResp.text();
        }
      } catch {
        // Prior year data not available
      }

      for (const state of states) {
        const fips = STATE_FIPS[state];
        if (!fips) continue;

        // Filter for this state (area_fips starts with state FIPS + "000" for statewide)
        const stateRows = rows.filter(
          (r) =>
            r.area_fips === `${fips}000` &&
            r.own_code === "5" // Private ownership
        );

        const priorStateRows = priorRows.filter(
          (r) =>
            r.area_fips === `${fips}000` &&
            r.own_code === "5"
        );

        if (stateRows.length > 0) {
          const row = stateRows[0];
          const priorRow = priorStateRows.length > 0 ? priorStateRows[0] : null;

          const employment = parseInt(row.annual_avg_emplvl) || null;
          const priorEmployment = priorRow
            ? parseInt(priorRow.annual_avg_emplvl) || null
            : null;
          const avgWeeklyWage = parseInt(row.avg_wkly_wage) || null;
          const priorAvgWeeklyWage = priorRow
            ? parseInt(priorRow.avg_wkly_wage) || null
            : null;

          let empChangePct: number | null = null;
          if (employment && priorEmployment && priorEmployment > 0) {
            empChangePct =
              Math.round(
                ((employment - priorEmployment) / priorEmployment) * 1000
              ) / 10;
          }

          let wageChangePct: number | null = null;
          if (avgWeeklyWage && priorAvgWeeklyWage && priorAvgWeeklyWage > 0) {
            wageChangePct =
              Math.round(
                ((avgWeeklyWage - priorAvgWeeklyWage) / priorAvgWeeklyWage) *
                  1000
              ) / 10;
          }

          results.push({
            industry,
            state,
            latest_quarter: `${year} Annual`,
            employment_level: employment,
            prior_employment_level: priorEmployment,
            employment_change_pct: empChangePct,
            avg_weekly_wage: avgWeeklyWage,
            prior_avg_weekly_wage: priorAvgWeeklyWage,
            wage_change_pct: wageChangePct,
            is_hot_market: empChangePct !== null && empChangePct > 2,
          });
        }
      }
    } catch (e) {
      console.error(`Error fetching QCEW for ${industry} (${year}):`, e);
      continue;
    }
  }

  return results;
}

function parseCSV(csv: string): Record<string, any>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

async function fetchBLSTimeseries(
  states: string[],
  industries: string[]
): Promise<BLSTrendResult[]> {
  // Build series IDs for employment levels
  // CES (Current Employment Statistics) series: CEU{INDUSTRY}{DATA_TYPE}
  // For state-level, use SM series: SMU{STATE_FIPS}{AREA}{INDUSTRY}{DATA_TYPE}
  // Simpler: use LAUS for state employment or CES national data

  // For now, use the BLS Public Data API with QCEW area-based series
  // Series format: ENU{FIPS}0{SIZE}0{OWN}{NAICS}{DTYPE}
  const seriesIds: string[] = [];
  const seriesMap: Record<string, { state: string; industry: string; type: string }> = {};

  for (const state of states) {
    const fips = STATE_FIPS[state];
    if (!fips) continue;

    for (const industry of industries) {
      const naics = INDUSTRY_NAICS_2DIGIT[industry];
      if (!naics) continue;
      const naicsCode = naics.includes("-") ? naics.split("-")[0] : naics;

      // Employment level (data type 1) — pad NAICS to fill expected length
      const empSeriesId = `ENU${fips}00010${naicsCode.padEnd(4, "0")}1`;
      // Avg weekly wage (data type 5)
      const wageSeriesId = `ENU${fips}00010${naicsCode.padEnd(4, "0")}5`;

      seriesIds.push(empSeriesId, wageSeriesId);
      seriesMap[empSeriesId] = { state, industry, type: "employment" };
      seriesMap[wageSeriesId] = { state, industry, type: "wage" };
    }
  }

  if (seriesIds.length === 0) return [];

  // BLS allows max 50 series per request (public tier: 25)
  const results: BLSTrendResult[] = [];
  const batchSize = 20;
  const pairData: Record<string, any> = {};

  for (let i = 0; i < seriesIds.length; i += batchSize) {
    const batch = seriesIds.slice(i, i + batchSize);

    try {
      const resp = await fetch(
        "https://api.bls.gov/publicAPI/v2/timeseries/data/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seriesid: batch,
            startyear: String(new Date().getFullYear() - 2),
            endyear: String(new Date().getFullYear()),
          }),
        }
      );

      if (!resp.ok) {
        await resp.text();
        continue;
      }

      const data = await resp.json();

      if (data.status === "REQUEST_SUCCEEDED" && data.Results?.series) {
        for (const series of data.Results.series) {
          const info = seriesMap[series.seriesID];
          if (!info || !series.data?.length) continue;

          const key = `${info.state}|${info.industry}`;
          if (!pairData[key]) {
            pairData[key] = { state: info.state, industry: info.industry };
          }

          // data[0] is most recent
          const latest = series.data[0];
          const prior = series.data.length > 1 ? series.data[1] : null;

          if (info.type === "employment") {
            pairData[key].employment_level = parseInt(latest.value) || null;
            pairData[key].prior_employment_level = prior
              ? parseInt(prior.value) || null
              : null;
            pairData[key].latest_quarter = `${latest.year} ${latest.periodName}`;
          } else if (info.type === "wage") {
            pairData[key].avg_weekly_wage = parseInt(latest.value) || null;
            pairData[key].prior_avg_weekly_wage = prior
              ? parseInt(prior.value) || null
              : null;
          }
        }
      }
    } catch (e) {
      console.error("BLS timeseries batch error:", e);
      continue;
    }
  }

  // Convert pair data to results
  for (const key of Object.keys(pairData)) {
    const d = pairData[key];
    let empChangePct: number | null = null;
    if (d.employment_level && d.prior_employment_level && d.prior_employment_level > 0) {
      empChangePct =
        Math.round(
          ((d.employment_level - d.prior_employment_level) /
            d.prior_employment_level) *
            1000
        ) / 10;
    }

    let wageChangePct: number | null = null;
    if (d.avg_weekly_wage && d.prior_avg_weekly_wage && d.prior_avg_weekly_wage > 0) {
      wageChangePct =
        Math.round(
          ((d.avg_weekly_wage - d.prior_avg_weekly_wage) /
            d.prior_avg_weekly_wage) *
            1000
        ) / 10;
    }

    results.push({
      industry: d.industry,
      state: d.state,
      latest_quarter: d.latest_quarter || "Latest Available",
      employment_level: d.employment_level || null,
      prior_employment_level: d.prior_employment_level || null,
      employment_change_pct: empChangePct,
      avg_weekly_wage: d.avg_weekly_wage || null,
      prior_avg_weekly_wage: d.prior_avg_weekly_wage || null,
      wage_change_pct: wageChangePct,
      is_hot_market: empChangePct !== null && empChangePct > 2,
    });
  }

  return results;
}
