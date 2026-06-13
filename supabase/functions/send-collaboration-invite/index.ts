import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { collaborationId, recipientEmail, recipientName, senderName, message } = await req.json();

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create in-app notification
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", recipientEmail)
      .single();

    if (recipientProfile) {
      await supabase.from("notifications").insert({
        user_id: recipientProfile.user_id,
        title: "New Collaboration Request",
        message: `${senderName} wants to collaborate with you on research.`,
        type: "collaboration_invite",
        link: "/dashboard/collaborations",
      });
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Research Collaboration Request</h2>
        <p>Hello ${recipientName},</p>
        <p><strong>${senderName}</strong> has sent you a collaboration request on R2P Connect:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #4B5563;">${message}</p>
        </div>
        <p>Log in to your R2P Connect account to respond to this collaboration request.</p>
        <a href="https://r2pconnect.lovable.app/dashboard/collaborations" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Collaboration Request</a>
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
        to: [{ email_address: { address: recipientEmail, name: recipientName } }],
        subject: `Research Collaboration Request from ${senderName}`,
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

    console.log(`Collaboration invite email sent to ${recipientEmail} for collaboration ${collaborationId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send collaboration invite error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
