import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { to, subject, body, contact_id } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const messageId = crypto.randomUUID();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const trackerBase = `${supabaseUrl}/functions/v1/email-tracker`;

    // Inject tracking pixel
    const trackingPixel = `<img src="${trackerBase}?type=open&mid=${messageId}" width="1" height="1" style="display:none" alt="" />`;

    // Rewrite links for click tracking
    let trackedBody = body.replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
      (_match: string, before: string, href: string, after: string) => {
        const trackedUrl = `${trackerBase}?type=click&mid=${messageId}&url=${encodeURIComponent(href)}`;
        return `<a ${before}href="${trackedUrl}"${after}>`;
      }
    );

    // Wrap plain text in HTML if needed
    if (!trackedBody.includes("<html") && !trackedBody.includes("<body")) {
      trackedBody = `<html><body><div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${trackedBody.replace(/\n/g, "<br/>")}</div>${trackingPixel}</body></html>`;
    } else {
      trackedBody = trackedBody.replace("</body>", `${trackingPixel}</body>`);
    }

    // Use Lovable API to send email
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const sendResponse = await fetch(
      "https://api.lovable.dev/v1/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          to,
          subject,
          html: trackedBody,
          message_id: messageId,
        }),
      }
    );

    const sendResult = await sendResponse.json();

    if (!sendResponse.ok) {
      console.error("Email send failed:", sendResult);
      // Still log attempt
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        recipient_email: to,
        subject,
        contact_id: contact_id || null,
        status: "failed",
      });

      return new Response(
        JSON.stringify({
          error: sendResult.message || "Failed to send email",
          message_id: messageId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful send
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      recipient_email: to,
      subject,
      contact_id: contact_id || null,
      status: "sent",
    });

    // Log activity
    if (contact_id) {
      await supabase.from("activities").insert({
        type: "email",
        description: `Email sent to ${to}: ${subject}`,
        contact_id,
        user_id: userId,
      });
    }

    return new Response(
      JSON.stringify({ message_id: messageId, status: "sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-crm-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
