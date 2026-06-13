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

    // Get all industry users
    const { data: industryUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "industry");

    if (!industryUsers || industryUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No industry users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;

    for (const industryUser of industryUsers) {
      // Check if this industry has active jobs
      const { count: activeJobCount } = await supabase
        .from("job_postings")
        .select("id", { count: "exact", head: true })
        .eq("industry_id", industryUser.user_id)
        .eq("is_active", true);

      // Check if they have active challenges
      const { count: activeChallengeCount } = await supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("industry_id", industryUser.user_id)
        .eq("is_active", true);

      if ((activeJobCount ?? 0) > 0) continue; // Skip if they have active jobs

      // Get user email and name
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", industryUser.user_id)
        .maybeSingle();

      if (!profile?.email) continue;

      const hasNoChallenges = (activeChallengeCount ?? 0) === 0;

      const challengeSection = hasNoChallenges
        ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #92400e; font-weight: bold;">💡 Got a problem your team can't solve?</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">Post a research challenge and let brilliant researchers compete to solve it for you!</p>
            <a href="https://r2pconnect.com/industry/challenges" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 12px; font-size: 14px; font-weight: bold;">Post a Challenge →</a>
          </div>`
        : "";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🎓 Students Need Your Opportunities!</h1>
          </div>
          <div style="padding: 30px 0;">
            <p style="font-size: 16px; color: #333;">Hi ${profile.full_name || "there"},</p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              <strong>Thousands of students</strong> across various institutions are actively seeking industrial training, SIWES placements, internships, and part-time roles. Many are eager, skilled, and ready to contribute to your organization.
            </p>
            <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px; font-size: 15px; color: #1e40af; font-weight: bold;">📊 Why Post on R2P Connect?</p>
              <ul style="font-size: 14px; color: #333; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Access students from <strong>multiple institutions</strong> in one place</li>
                <li>AI-powered matching finds the <strong>best candidates</strong> for you</li>
                <li>Filter by level, department, and skills</li>
                <li>Zero recruitment fees for standard postings</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://r2pconnect.com/industry/job-postings" style="display: inline-block; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: bold;">Post a Job Now →</a>
            </div>
            ${challengeSection}
            <p style="font-size: 14px; color: #666; margin-top: 24px;">Don't miss out on connecting with the next generation of talent!</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 13px;">
            <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;

      // Send email via send-email function
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "generic",
          to: profile.email,
          data: {
            subject: "🎓 Students Are Looking for Opportunities – Post a Job Today!",
            title: "Students Need Your Opportunities!",
            message: emailHtml,
          },
        },
      });

      if (!error) emailsSent++;
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in weekly-industry-reminder:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
