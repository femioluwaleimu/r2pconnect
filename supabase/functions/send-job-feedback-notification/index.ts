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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { feedbackId } = await req.json();
    if (!feedbackId) {
      return new Response(JSON.stringify({ error: "feedbackId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get the feedback message
    const { data: feedback, error: fbErr } = await supabase
      .from("job_feedback_messages")
      .select("*")
      .eq("id", feedbackId)
      .maybeSingle();

    if (fbErr || !feedback) {
      return new Response(JSON.stringify({ error: "Feedback not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientId: string | null = null;
    let recipientLink = "";
    let jobTitle = "";
    let senderName = "";

    if (feedback.application_type === "direct") {
      const { data: app } = await supabase
        .from("job_applications")
        .select("student_id, job_id, student_name, job_postings(title, industry_id)")
        .eq("id", feedback.application_id)
        .maybeSingle();

      if (app) {
        jobTitle = (app as any).job_postings?.title || "Job";
        if (feedback.sender_role === "employer") {
          recipientId = app.student_id;
          recipientLink = "/dashboard/job-board";
        } else {
          recipientId = (app as any).job_postings?.industry_id;
          recipientLink = "/industry/applications";
        }
      }
    } else {
      const { data: app } = await supabase
        .from("ipn_applications")
        .select("applicant_id, applicant_name, opportunity_id, ipn_opportunities(title, ipn_user_id)")
        .eq("id", feedback.application_id)
        .maybeSingle();

      if (app) {
        jobTitle = (app as any).ipn_opportunities?.title || "Opportunity";
        if (feedback.sender_role === "employer") {
          recipientId = app.applicant_id;
          recipientLink = "/dashboard/job-board";
        } else {
          recipientId = (app as any).ipn_opportunities?.ipn_user_id;
          recipientLink = "/ipn/applicants";
        }
      }
    }

    // Get sender name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", feedback.sender_id)
      .maybeSingle();
    senderName = senderProfile?.full_name || "Someone";

    if (!recipientId) {
      return new Response(JSON.stringify({ success: true, note: "No recipient found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // In-app notification
    await supabase.from("notifications").insert({
      user_id: recipientId,
      title: "New Feedback Message",
      message: `${senderName} sent feedback regarding "${jobTitle}"`,
      type: "info",
      link: recipientLink,
    });

    // Email notification
    if (ZEPTOMAIL_API_KEY) {
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", recipientId)
        .maybeSingle();

      if (recipientProfile?.email) {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">New Feedback Message</h2>
            <p style="color: #334155;">${senderName} sent you a message regarding <strong>${jobTitle}</strong>:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin: 16px 0;">
              <p style="margin: 0; color: #334155; white-space: pre-wrap;">${feedback.message}</p>
            </div>
            <a href="https://edutvr2p.lovable.app${recipientLink}" style="display:inline-block; background:#0f766e; color:white; padding:12px 16px; border-radius:10px; text-decoration:none;">View & Reply</a>
            <p style="margin-top: 18px; color:#94a3b8; font-size: 12px;">This notification was sent by R2P Connect.</p>
          </div>
        `;

        await fetch("https://api.zeptomail.com/v1.1/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ZEPTOMAIL_API_KEY.startsWith("Zoho-enczapikey")
              ? ZEPTOMAIL_API_KEY
              : `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
          },
          body: JSON.stringify({
            from: { address: "support@edutv.com.ng", name: "R2P Connect" },
            to: [{ email_address: { address: recipientProfile.email, name: recipientProfile.full_name || "User" } }],
            subject: `New feedback on "${jobTitle}" — R2P Connect`,
            htmlbody: emailBody,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-job-feedback-notification error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
