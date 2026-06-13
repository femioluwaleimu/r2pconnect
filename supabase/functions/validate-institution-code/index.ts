import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateCodeRequest {
  verification_code: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { verification_code }: ValidateCodeRequest = await req.json();

    if (!verification_code) {
      return new Response(
        JSON.stringify({ valid: false, error: "Verification code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Validating institution verification code: ${verification_code}`);

    // Check if the verification code exists and hasn't been used
    const { data: codeData, error: codeError } = await supabase
      .from("institution_verification_codes")
      .select("id, institution_id, used_at")
      .eq("verification_code", verification_code)
      .maybeSingle();

    if (codeError) {
      console.error("Error checking verification code:", codeError);
      return new Response(
        JSON.stringify({ valid: false, error: "Error validating code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!codeData) {
      console.log("Invalid verification code - not found");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codeData.used_at) {
      console.log("Verification code already used");
      return new Response(
        JSON.stringify({ valid: false, error: "This verification code has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch institution details
    const { data: institutionData, error: institutionError } = await supabase
      .from("institutions")
      .select("id, name, website")
      .eq("id", codeData.institution_id)
      .single();

    if (institutionError || !institutionData) {
      console.error("Error fetching institution:", institutionError);
      return new Response(
        JSON.stringify({ valid: false, error: "Institution not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Valid code for institution: ${institutionData.name}`);

    return new Response(
      JSON.stringify({
        valid: true,
        institution_id: institutionData.id,
        institution_name: institutionData.name,
        institution_website: institutionData.website,
        code_id: codeData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in validate-institution-code:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
