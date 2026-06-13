import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarkCodeUsedRequest {
  code_id: string;
  user_id: string;
  institution_id: string;
  is_admin?: boolean; // Flag to indicate if this user should be set as admin
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code_id, user_id, institution_id, is_admin = false }: MarkCodeUsedRequest = await req.json();

    if (!code_id || !user_id || !institution_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Marking code ${code_id} as used by user ${user_id}, is_admin: ${is_admin}`);

    // Mark verification code as used (for institution registration codes)
    const { error: updateCodeError } = await supabase
      .from("institution_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", code_id);

    if (updateCodeError) {
      console.error("Error marking code as used:", updateCodeError);
      // Don't fail - this might be a reviewer invite which uses a different table
    }

    // Update user's institution in profile
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ institution_id: institution_id })
      .eq("user_id", user_id);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      // Don't fail the whole operation, the main goal (marking code) succeeded
    }

    // Only update institutions admin_user_id if this is an admin registration (institution registration)
    // NOT for reviewer or supervisor registrations
    if (is_admin) {
      const { error: updateInstitutionError } = await supabase
        .from("institutions")
        .update({ admin_user_id: user_id })
        .eq("id", institution_id);

      if (updateInstitutionError) {
        console.error("Error updating institution admin:", updateInstitutionError);
      }
    }

    console.log("Code marked as used successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in mark-code-used:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
