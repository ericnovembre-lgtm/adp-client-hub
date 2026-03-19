import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KLUE_API_BASE = "https://app.klue.com/extract";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const KLUE_API_KEY = Deno.env.get("KLUE_API_KEY");
    if (!KLUE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "klue_not_configured", message: "Klue API key is not configured. Set KLUE_API_KEY in Edge Function secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { competitor, tags, query, mode = "cards" } = body;

    // Build Klue API URL
    let url = `${KLUE_API_BASE}/cards.json`;
    const params = new URLSearchParams();

    if (competitor) {
      params.append("competitor", competitor);
    }
    if (tags && Array.isArray(tags)) {
      tags.forEach((tag: string) => params.append("tags[]", tag));
    }

    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }

    // Call Klue API
    const klueResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KLUE_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!klueResponse.ok) {
      const errText = await klueResponse.text();
      console.error("Klue API error:", klueResponse.status, errText);

      if (klueResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Klue API key is invalid or expired. Check your KLUE_API_KEY in Edge Function secrets." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch from Klue", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const klueData = await klueResponse.json();

    // If mode is "search" and a query is provided, use Anthropic to analyze
    if (mode === "search" && query) {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({ cards: klueData, analysis: null, error: "ANTHROPIC_API_KEY not set — returning raw cards without AI analysis" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: "You are a competitive intelligence analyst for ADP TotalSource. You have access to live competitive battlecard data from Klue. Analyze the provided cards and answer the user's question. Write in plain text only, no markdown, no emoji, no HTML. Use numbered paragraphs. Always cite which Klue card your information comes from.",
          messages: [
            {
              role: "user",
              content: `Here are the current Klue competitive intelligence cards:\n\n${JSON.stringify(klueData, null, 2)}\n\nQuestion: ${query}`,
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const analysis = aiData.content?.[0]?.text ?? null;
        return new Response(
          JSON.stringify({ cards: klueData, analysis, card_count: Array.isArray(klueData) ? klueData.length : 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Default: return raw cards
    return new Response(
      JSON.stringify({ cards: klueData, card_count: Array.isArray(klueData) ? klueData.length : 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("klue-intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
