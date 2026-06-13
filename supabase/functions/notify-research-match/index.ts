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
    const { paperId, paperTitle, authorId, keywords, researchField } = await req.json();

    if (!paperId || !paperTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with their research interests (from their papers)
    const { data: allPapers } = await supabase
      .from("research_papers")
      .select("author_id, keywords, research_field")
      .neq("author_id", authorId);

    if (!allPapers || allPapers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user interests map
    const userInterests: Record<string, { interests: string[]; email?: string }> = {};
    allPapers.forEach((paper) => {
      if (!userInterests[paper.author_id]) {
        userInterests[paper.author_id] = { interests: [] };
      }
      if (paper.keywords) {
        userInterests[paper.author_id].interests.push(
          ...paper.keywords.map((k: string) => k.toLowerCase())
        );
      }
      if (paper.research_field) {
        userInterests[paper.author_id].interests.push(paper.research_field.toLowerCase());
      }
    });

    // Match against new paper
    const paperKeywords = (keywords || []).map((k: string) => k.toLowerCase());
    const paperField = (researchField || "").toLowerCase();

    const matchedUsers: string[] = [];
    Object.entries(userInterests).forEach(([userId, data]) => {
      const hasMatch = data.interests.some(
        (interest) =>
          paperKeywords.includes(interest) || paperField.includes(interest)
      );
      if (hasMatch) {
        matchedUsers.push(userId);
      }
    });

    console.log(`Found ${matchedUsers.length} users with matching interests`);

    if (matchedUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matching users found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails for email notifications
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", matchedUsers);

    // Create in-app notifications and send emails
    const notifications = matchedUsers.map((userId) => ({
      user_id: userId,
      title: "New Research Matches Your Interests",
      message: `"${paperTitle}" was just published and matches your research interests.`,
      type: "research_match",
      link: `/dashboard/browse?paper=${paperId}`,
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    // Send email notifications via ZeptoMail
    let emailsSent = 0;
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "research_match",
              to: profile.email,
              data: {
                name: profile.full_name,
                paperTitle,
                paperId,
              },
            },
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`Created ${notifications.length} notifications, sent ${emailsSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: matchedUsers.length,
        emailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-research-match:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
