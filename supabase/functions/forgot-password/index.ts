import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_EMAIL = "support@r2pconnect.com";
const FROM_NAME = "R2P Connect";

interface ForgotPasswordRequest {
  email: string;
  redirect_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, redirect_url }: ForgotPasswordRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing forgot password request for: ${email}`);

    // Generate password reset link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirect_url,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!linkData?.properties?.action_link) {
      console.log("No action link generated - user may not exist");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resetLink = linkData.properties.action_link;
    console.log("Reset link generated successfully");

    // Send custom email via ZeptoMail
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reset Your Password 🔐</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi there,</p>
          <p style="font-size: 16px; color: #333;">We received a request to reset your password for your R2P Connect account.</p>
          <p style="font-size: 16px; color: #333;">Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #666;">This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="font-size: 14px; color: #666;">For security reasons, never share this link with anyone.</p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
          <p style="font-size: 12px; color: #999;">If you're having trouble clicking the button, copy and paste this URL into your browser:<br><span style="color: #6366f1; word-break: break-all;">${resetLink}</span></p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: [
          {
            email_address: {
              address: email,
            },
          },
        ],
        subject: "Reset Your R2P Connect Password",
        htmlbody: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      return new Response(JSON.stringify({ success: false, error: "Failed to send reset email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Password reset email sent successfully");

    return new Response(JSON.stringify({ success: true, message: "Password reset email sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in forgot-password:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
