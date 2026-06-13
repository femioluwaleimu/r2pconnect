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

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get recently published papers (last 24h)
    const { data: newPapers } = await supabase
      .from("research_papers")
      .select("id, title, research_field, keywords, author_id")
      .eq("status", "published")
      .gte("published_at", oneDayAgo);

    if (!newPapers || newPapers.length === 0) {
      return new Response(JSON.stringify({ message: "No new papers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;

    for (const paper of newPapers) {
      // Find researchers with matching research fields or keywords (excluding the author)
      const matchConditions: any[] = [];
      
      if (paper.research_field) {
        // Find other papers in the same field
        const { data: similarResearchers } = await supabase
          .from("research_papers")
          .select("author_id")
          .eq("research_field", paper.research_field)
          .neq("author_id", paper.author_id)
          .eq("status", "published");

        if (similarResearchers) {
          const authorIds = [...new Set(similarResearchers.map(r => r.author_id))];
          matchConditions.push(...authorIds);
        }
      }

      // Also match on fields_of_interest in profiles
      if (paper.research_field) {
        const { data: interestedProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .contains("fields_of_interest", [paper.research_field])
          .neq("user_id", paper.author_id);

        if (interestedProfiles) {
          matchConditions.push(...interestedProfiles.map(p => p.user_id));
        }
      }

      // Deduplicate
      const uniqueUserIds = [...new Set(matchConditions)];
      if (uniqueUserIds.length === 0) continue;

      // Send notifications (max 50 per paper)
      const usersToNotify = uniqueUserIds.slice(0, 50);

      for (const userId of usersToNotify) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (!profile?.email) continue;

        // Create in-app notification
        await supabase.rpc("create_notification", {
          _user_id: userId,
          _title: "Similar Research Published",
          _message: `A new paper "${paper.title}" was published in ${paper.research_field || "your field"}. Check it out!`,
          _type: "info",
          _link: `/dashboard/browse?paper=${paper.id}`,
        });

        // Send email
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            type: "generic",
            to: profile.email,
            data: {
              subject: `📖 New Research in Your Field: "${paper.title}"`,
              title: "Similar Research Alert! 🔔",
              message: `
                <p style="font-size: 16px; color: #333;">Hi ${profile.full_name || "Researcher"},</p>
                <p style="font-size: 15px; color: #333; line-height: 1.6;">A new research paper that matches your area of interest has just been published on R2P Connect!</p>
                <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; font-size: 17px; color: #6366f1;">${paper.title}</p>
                  ${paper.research_field ? `<p style="margin: 8px 0 0; font-size: 13px; color: #666;">Field: ${paper.research_field}</p>` : ""}
                  ${paper.keywords?.length ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">Keywords: ${paper.keywords.join(", ")}</p>` : ""}
                </div>
                <p style="font-size: 14px; color: #333;">This could be a great opportunity for collaboration or to expand your knowledge in your field.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://r2pconnect.com/dashboard/browse?paper=${paper.id}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: bold;">View Research →</a>
                </div>
              `,
            },
          },
        });

        if (!error) emailsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-similar-research:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
