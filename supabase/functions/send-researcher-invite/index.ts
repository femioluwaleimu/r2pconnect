import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteId, researcherEmail, researcherName, challengeTitle, companyName, message } = await req.json();

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Research Collaboration Invitation</h2>
        <p>Hello ${researcherName},</p>
        <p><strong>${companyName}</strong> has invited you to collaborate on a research challenge:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">${challengeTitle}</h3>
          <p style="margin: 0; color: #4B5563;">${message}</p>
        </div>
        <p>Log in to your R2P Connect account to respond to this invitation and start the conversation.</p>
        <a href="https://r2pconnect.lovable.app/dashboard" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Invitation</a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">Best regards,<br>R2P Connect Team</p>
      </div>
    `;

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify({
        from: { address: "support@edutv.com.ng", name: "R2P Connect" },
        to: [{ email_address: { address: researcherEmail, name: researcherName } }],
        subject: `Research Collaboration Invite from ${companyName}`,
        htmlbody: emailBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ZeptoMail error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Invite email sent to ${researcherEmail} for invite ${inviteId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send invite error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
