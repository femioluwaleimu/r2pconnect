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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get latest research, documentaries, and jobs from past week
    const [researchResult, docResult, jobResult] = await Promise.all([
      supabase
        .from("research_papers")
        .select("id, title, research_field")
        .eq("status", "published")
        .gte("published_at", oneWeekAgo)
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("documentaries")
        .select("id, title")
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("job_postings")
        .select("id, title, job_type, company_name")
        .eq("is_active", true)
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const newResearch = researchResult.data || [];
    const newDocs = docResult.data || [];
    const newJobs = jobResult.data || [];

    // If nothing new, skip
    if (newResearch.length === 0 && newDocs.length === 0 && newJobs.length === 0) {
      return new Response(JSON.stringify({ message: "No new content this week" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all researchers and students
    const { data: users } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "researcher");

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No researchers found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const researchSection = newResearch.length > 0
      ? `<div style="margin: 20px 0;">
          <h3 style="color: #1e40af; font-size: 16px; margin-bottom: 12px;">📚 Latest Research Papers</h3>
          ${newResearch.map(r => `
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #6366f1;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${r.title}</p>
              ${r.research_field ? `<p style="margin: 4px 0 0; font-size: 12px; color: #666;">${r.research_field}</p>` : ""}
            </div>
          `).join("")}
          <a href="https://r2pconnect.com/dashboard/browse" style="font-size: 13px; color: #6366f1;">View all research →</a>
        </div>`
      : "";

    const docSection = newDocs.length > 0
      ? `<div style="margin: 20px 0;">
          <h3 style="color: #059669; font-size: 16px; margin-bottom: 12px;">🎬 New Documentaries</h3>
          ${newDocs.map(d => `
            <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #10b981;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${d.title}</p>
            </div>
          `).join("")}
          <a href="https://r2pconnect.com/dashboard/documentaries" style="font-size: 13px; color: #059669;">Watch documentaries →</a>
        </div>`
      : "";

    const jobSection = newJobs.length > 0
      ? `<div style="margin: 20px 0;">
          <h3 style="color: #d97706; font-size: 16px; margin-bottom: 12px;">💼 New Job Openings</h3>
          ${newJobs.map(j => `
            <div style="background: #fffbeb; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${j.title}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #666;">${j.company_name || "Company"} · ${j.job_type?.replace("_", " ")}</p>
            </div>
          `).join("")}
          <a href="https://r2pconnect.com/dashboard/job-board" style="font-size: 13px; color: #d97706;">View all jobs →</a>
        </div>`
      : "";

    let emailsSent = 0;

    // Send in batches of 10
    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10);
      
      await Promise.all(batch.map(async (user) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", user.user_id)
          .maybeSingle();

        if (!profile?.email) return;

        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            type: "generic",
            to: profile.email,
            data: {
              subject: "📬 Your Weekly R2P Connect Digest – New Research, Jobs & More!",
              title: "Your Weekly Digest",
              message: `
                <p style="font-size: 16px; color: #333;">Hi ${profile.full_name || "Researcher"},</p>
                <p style="font-size: 15px; color: #333; line-height: 1.6;">Here's what's new on R2P Connect this week:</p>
                ${researchSection}
                ${docSection}
                ${jobSection}
                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://r2pconnect.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: bold;">Explore Dashboard →</a>
                </div>
              `,
            },
          },
        });

        if (!error) emailsSent++;
      }));
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in weekly-researcher-digest:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
