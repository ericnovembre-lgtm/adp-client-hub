import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const mid = url.searchParams.get("mid");

  if (!type || !mid) {
    return new Response("Missing params", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (type === "open") {
    await supabase.from("email_tracking_events").insert({
      message_id: mid,
      event_type: "open",
    });

    // Return 1x1 transparent GIF
    const pixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80,
      0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);

    return new Response(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...corsHeaders,
      },
    });
  }

  if (type === "click") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Missing url param", { status: 400 });
    }

    await supabase.from("email_tracking_events").insert({
      message_id: mid,
      event_type: "click",
      url: targetUrl,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: targetUrl,
        ...corsHeaders,
      },
    });
  }

  return new Response("Invalid type", { status: 400 });
});
