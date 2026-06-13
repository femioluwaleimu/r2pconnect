import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
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

    const { email, code, type }: VerifyCodeRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ valid: false, error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying ${type} code for: ${email}`);

    // Check the verification code
    const { data: codeData, error: codeError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("type", type)
      .eq("used", false)
      .single();

    if (codeError || !codeData) {
      console.log("Invalid or expired code");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code is expired
    if (new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Verification code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", codeData.id);

    let userRole = null;

    // If email verification, update user's email_confirmed_at and profiles.email_verified
    if (type === "email_verification") {
      // Find user by email and confirm their email
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);
      
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
        
        // Also update profiles.email_verified
        await supabase
          .from("profiles")
          .update({ email_verified: true })
          .eq("user_id", user.id);
        
        // Fetch user role for navigation
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roleData) {
          userRole = roleData.role;
        }
        
        console.log("User email verified successfully, role:", userRole);
      }
    }

    return new Response(
      JSON.stringify({ valid: true, message: "Code verified successfully", role: userRole }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-code:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
