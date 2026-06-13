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
    const { documentary_id } = await req.json();

    if (!documentary_id) {
      return new Response(
        JSON.stringify({ error: "documentary_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP address from request and hash it for privacy
    const forwardedFor = req.headers.get("x-forwarded-for");
    const rawIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const today = new Date().toISOString().split("T")[0];
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawIp + documentary_id + today));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    const viewKey = `${documentary_id}_${ipHash}_${today}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this IP already viewed today using a simple reference check
    const { data: existingView } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("reference", `doc_view_${viewKey}`)
      .maybeSingle();

    if (existingView) {
      // Already viewed today
      const { data: doc } = await supabase
        .from("documentaries")
        .select("views_count")
        .eq("id", documentary_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          already_viewed: true, 
          views_count: doc?.views_count || 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get documentary info
    const { data: documentary, error: docError } = await supabase
      .from("documentaries")
      .select("id, views_count, researcher_id")
      .eq("id", documentary_id)
      .single();

    if (docError || !documentary) {
      return new Response(
        JSON.stringify({ error: "Documentary not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment view count
    const newViewCount = (documentary.views_count || 0) + 1;
    await supabase
      .from("documentaries")
      .update({ views_count: newViewCount })
      .eq("id", documentary_id);

    // Record the view as a transaction for deduplication (no credits for documentary views)
    await supabase.from("wallet_transactions").insert({
      user_id: documentary.researcher_id || "00000000-0000-0000-0000-000000000000",
      amount: 0,
      transaction_type: "payment",
      description: `Documentary view tracked`,
      reference: `doc_view_${viewKey}`,
      status: "completed",
      metadata: { documentary_id, ip_hash: ipHash, date: today },
    });

    console.log(`Documentary ${documentary_id} viewed. New count: ${newViewCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        already_viewed: false, 
        views_count: newViewCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in track-documentary-view:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
