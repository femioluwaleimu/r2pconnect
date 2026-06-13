import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  applicationId: string;
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

    const { applicationId } = (await req.json()) as RequestBody;
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Validate caller
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: app, error: appErr } = await supabase
      .from("job_applications")
      .select("id, job_id, student_id, cover_letter, created_at, student_name, student_level, student_institution_name")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobErr } = await supabase
      .from("job_postings")
      .select("id, title, industry_id, company_name, company_location, is_paid, application_fee_ngn")
      .eq("id", app.job_id)
      .maybeSingle();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: industryProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", job.industry_id)
      .maybeSingle();

    if (!industryProfile?.email) {
      return new Response(JSON.stringify({ error: "Industry email not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyName = job.company_name || industryProfile.full_name || "Your company";
    const studentName = app.student_name || "A student";
    const studentLevel = app.student_level || "N/A";
    const studentInstitution = app.student_institution_name || "N/A";
    const location = job.company_location || "";
    const isPaid = job.is_paid;
    const fee = job.application_fee_ngn || 0;

    const paidBadge = isPaid ? `<span style="background:#059669;color:white;padding:3px 10px;border-radius:20px;font-size:12px;">Paid Application — ₦${fee.toLocaleString()}</span>` : '';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">New Job Application</h2>
        <p style="color: #334155; margin-top: 0;">You have received a new application for:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin: 16px 0;">
          <p style="margin: 0; color: #0f172a;"><strong>${job.title}</strong> ${paidBadge}</p>
          ${location ? `<p style="margin: 6px 0 0 0; color: #64748b;">Location: ${location}</p>` : ""}
          <p style="margin: 12px 0 0 0; color: #334155;">Applicant: <strong>${studentName}</strong></p>
          <p style="margin: 6px 0 0 0; color: #64748b;">Level: ${studentLevel} • Institution: ${studentInstitution}</p>
        </div>
        <a href="https://edutvr2p.lovable.app/industry/applications" style="display:inline-block; background:#0f766e; color:white; padding:12px 16px; border-radius:10px; text-decoration:none;">View Applications</a>
        <p style="margin-top: 18px; color:#94a3b8; font-size: 12px;">This notification was sent by R2P Connect.</p>
      </div>
    `;

    // Send email to industry
    const resp = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ZEPTOMAIL_API_KEY.startsWith("Zoho-enczapikey")
          ? ZEPTOMAIL_API_KEY
          : `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: { address: "support@edutv.com.ng", name: "R2P Connect" },
        to: [{ email_address: { address: industryProfile.email, name: industryProfile.full_name || companyName } }],
        subject: `New application for ${job.title} (${companyName})`,
        htmlbody: emailBody,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("ZeptoMail error:", errorText);
    }

    // In-app notification for industry
    await supabase.from("notifications").insert({
      user_id: job.industry_id,
      title: "New Job Application",
      message: `${studentName} applied for ${job.title}${isPaid ? ` (₦${fee.toLocaleString()} paid)` : ''}`,
      type: "info",
      link: "/industry/applications",
    });

    // Send confirmation email to student
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", app.student_id)
      .maybeSingle();

    if (studentProfile?.email) {
      const studentEmailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Application Submitted</h2>
          <p style="color: #334155;">Your application has been submitted successfully!</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #0f172a;"><strong>${job.title}</strong></p>
            <p style="margin: 6px 0 0 0; color: #64748b;">Company: ${companyName}</p>
            ${isPaid ? `<p style="margin: 6px 0 0 0; color: #059669;">Application fee: ₦${fee.toLocaleString()} (paid)</p>` : ''}
          </div>
          <p style="color: #334155;">The company will review your application and get back to you.</p>
          <a href="https://edutvr2p.lovable.app/dashboard/jobs" style="display:inline-block; background:#0f766e; color:white; padding:12px 16px; border-radius:10px; text-decoration:none; margin-top:12px;">View My Applications</a>
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
          to: [{ email_address: { address: studentProfile.email, name: studentProfile.full_name || "Student" } }],
          subject: `Application submitted — ${job.title}`,
          htmlbody: studentEmailBody,
        }),
      });

      // In-app notification for student
      await supabase.from("notifications").insert({
        user_id: app.student_id,
        title: "Application Submitted",
        message: `Your application for ${job.title} at ${companyName} has been submitted.`,
        type: "success",
        link: "/dashboard/jobs",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-job-application-notification error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
