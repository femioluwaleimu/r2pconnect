import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check AI credits
    const currentMonth = getCurrentMonth();
    let { data: aiCredits } = await supabase
      .from("ai_credits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!aiCredits) {
      const { data: newCredits, error: insertError } = await supabase
        .from("ai_credits")
        .insert({
          user_id: userId,
          credits_used: 0,
          credits_limit: 3,
          reset_date: new Date().toISOString().split("T")[0],
          reset_month: currentMonth,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error("Failed to initialize AI credits");
      }
      aiCredits = newCredits;
    } else if (aiCredits.reset_month !== currentMonth) {
      const { data: resetCredits } = await supabase
        .from("ai_credits")
        .update({
          credits_used: 0,
          reset_date: new Date().toISOString().split("T")[0],
          reset_month: currentMonth,
        })
        .eq("id", aiCredits.id)
        .select()
        .single();

      if (resetCredits) {
        aiCredits = resetCredits;
      }
    }

    if (aiCredits.credits_used >= aiCredits.credits_limit) {
      return new Response(
        JSON.stringify({
          error: "AI_CREDITS_EXHAUSTED",
          message: "You have used all your AI credits for this month. Upgrade your subscription for more credits.",
          credits_used: aiCredits.credits_used,
          credits_limit: aiCredits.credits_limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("department, level, skills, preferred_job_type, cv_url")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({
          matches: [],
          message: "Complete your profile to get job recommendations.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active job postings
    const { data: jobs } = await supabase
      .from("job_postings")
      .select("id, title, description, job_type, department, required_level, requirements, payment_amount, payment_currency, deadline, slots_available, slots_filled")
      .eq("is_active", true);

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No active job postings available." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out jobs where slots are filled
    const availableJobs = jobs.filter((j) => (j.slots_available || 0) > (j.slots_filled || 0));

    if (availableJobs.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "All positions are currently filled." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const studentProfile = {
      department: profile.department,
      level: profile.level,
      skills: profile.skills?.join(", ") || "Not specified",
      preferredJobTypes: profile.preferred_job_type?.join(", ") || "All types",
      hasCV: !!profile.cv_url,
    };

    const jobsList = availableJobs.map((j) => ({
      id: j.id,
      title: j.title,
      type: j.job_type,
      department: j.department,
      requiredLevels: j.required_level?.join(", ") || "Any",
      requirements: j.requirements?.join(", ") || "Not specified",
      payment: j.payment_amount ? `${j.payment_currency || "NGN"} ${j.payment_amount}` : "Negotiable",
    }));

    const prompt = `You are an AI job matching assistant for students. Match the student profile with available jobs and rank by relevance.

Student Profile:
${JSON.stringify(studentProfile, null, 2)}

Available Jobs:
${JSON.stringify(jobsList, null, 2)}

Analyze and return a JSON array of job matches ranked by relevance (best first). Include only the top 10 most relevant jobs.

Format:
[
  {
    "jobId": "uuid",
    "relevanceScore": 95,
    "matchReason": "Brief explanation of why this job is a good match"
  }
]

Consider:
- Department/field relevance
- Level requirements
- Skills match
- Job type preferences
- Career growth potential`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a job matching AI. Return only valid JSON arrays.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let matches: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Error parsing AI response:", content);
    }

    // Validate job IDs
    const validJobIds = availableJobs.map((j) => j.id);
    matches = matches.filter((m) => validJobIds.includes(m.jobId));

    // Update credits used
    await supabase
      .from("ai_credits")
      .update({ credits_used: aiCredits.credits_used + 1 })
      .eq("id", aiCredits.id);

    console.log(`AI job match: found ${matches.length} matches for user ${userId}`);

    return new Response(
      JSON.stringify({
        matches,
        credits_used: aiCredits.credits_used + 1,
        credits_limit: aiCredits.credits_limit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-job-match:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
