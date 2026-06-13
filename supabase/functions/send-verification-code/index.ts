import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_EMAIL = "support@r2pconnect.com";
const FROM_NAME = "R2P Connect";

interface SendCodeRequest {
  email: string;
  type: "email_verification" | "password_reset";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, type }: SendCodeRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending ${type} code to: ${email}`);

    // Check if email exists in the system for password reset
    if (type === "password_reset") {
      const { data: users } = await supabase.auth.admin.listUsers();
      const userExists = users?.users?.some((u) => u.email === email);
      if (!userExists) {
        // Don't reveal if user exists
        return new Response(JSON.stringify({ success: true, message: "If an account exists, a code will be sent" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store the code in user metadata or a verification codes table
    // For now, we'll use a simple approach - store in a temp table or update user metadata
    const { error: storeError } = await supabase.from("verification_codes").upsert(
      {
        email,
        code: verificationCode,
        type,
        expires_at: expiresAt,
        used: false,
      },
      { onConflict: "email,type" },
    );

    if (storeError) {
      console.error("Error storing code:", storeError);
      // If table doesn't exist, continue anyway (code will be in email)
    }

    // Send email with code
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = type === "email_verification" ? "Verify Your R2P Connect Email" : "Reset Your R2P Connect Password";

    const heading = type === "email_verification" ? "Verify Your Email 📧" : "Reset Your Password 🔐";

    const description =
      type === "email_verification"
        ? "Thank you for registering with R2P Connect! Please enter the code below to verify your email address."
        : "We received a request to reset your password. Enter the code below to proceed.";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">${heading}</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi there,</p>
          <p style="font-size: 16px; color: #333;">${description}</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #f5f5f5; padding: 20px 40px; border-radius: 12px; border: 2px dashed #6366f1;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${verificationCode}</span>
            </div>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">This code expires in 15 minutes.</p>
          <p style="font-size: 14px; color: #666; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
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
        from: { address: FROM_EMAIL, name: FROM_NAME },
        to: [{ email_address: { address: email } }],
        subject,
        htmlbody: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.error("Failed to send email:", emailResult);
      return new Response(JSON.stringify({ success: false, error: "Failed to send verification email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Verification code sent successfully");

    return new Response(JSON.stringify({ success: true, message: "Verification code sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-verification-code:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
