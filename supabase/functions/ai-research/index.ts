import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed AI request types
const ALLOWED_TYPES = [
  "summarize",
  "abstract",
  "gap_analysis",
  "keywords",
  "topic_refine",
  "topic_suggestions",
  "applications",
  "literature",
  "funding",
  "comprehensive_analysis",
  "supervisor_review",
  "version_comparison",
] as const;
type AIRequestType = (typeof ALLOWED_TYPES)[number];

// Max content length to prevent abuse
const MAX_CONTENT_LENGTH = 50000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Extract userId from JWT, not from request body
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized - missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with anon key to verify JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // userId is now trusted from JWT
    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    // Parse and validate request body (no userId accepted from body)
    const body = await req.json();
    const { type, content } = body;

    // Validate type
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return new Response(JSON.stringify({ error: `Invalid type. Must be one of: ${ALLOWED_TYPES.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate content
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Content is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use service role for database operations
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is a supervisor
    const { data: supervisorData } = await supabase
      .from("supervisors")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const isSupervisor = !!supervisorData;
    let usingSupervisorCredits = false;
    let supervisorCreditsRecord: { id: string; credits_remaining: number; credits_limit: number } | null = null;

    // If supervisor, use supervisor credits system
    if (isSupervisor) {
      // Get or calculate supervisor credits
      let { data: supCredits } = await supabase
        .from("supervisor_ai_credits")
        .select("id, credits_remaining, credits_limit")
        .eq("supervisor_id", userId)
        .maybeSingle();

      if (!supCredits) {
        // Calculate credits based on students' subscriptions
        const { data: creditCalc } = await supabase
          .rpc("calculate_supervisor_credits", { p_supervisor_id: userId });

        const totalCredits = creditCalc?.[0]?.total_credits || 3;

        // Create supervisor credits record
        const { data: newCredits, error: insertErr } = await supabase
          .from("supervisor_ai_credits")
          .insert({
            supervisor_id: userId,
            credits_remaining: totalCredits,
            credits_limit: totalCredits,
          })
          .select("id, credits_remaining, credits_limit")
          .single();

        if (insertErr) {
          console.error("Error creating supervisor credits:", insertErr);
        } else {
          supCredits = newCredits;
        }
      }

      if (supCredits && supCredits.credits_remaining > 0) {
        usingSupervisorCredits = true;
        supervisorCreditsRecord = supCredits;
        console.log(`Supervisor ${userId} using supervisor credits: ${supCredits.credits_remaining} remaining`);
      } else if (supCredits) {
        // Supervisor has no credits left
        return new Response(
          JSON.stringify({
            error: "AI_CREDITS_EXHAUSTED",
            message: "You have used all your supervisor AI credits. Credits are based on your students' subscription plans.",
            credits_remaining: 0,
            is_supervisor: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // For non-supervisors or supervisors without supervisor credits, use regular subscription
    let subscription: { id: string; ai_credits_remaining: number; current_period_end: string; tier: string } | null = null;

    if (!usingSupervisorCredits) {
      // Get subscription for this user (replaces ai_credits table)
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("id, ai_credits_remaining, current_period_end, tier")
        .eq("user_id", userId)
        .maybeSingle();

      if (subError) {
        console.error("Error fetching subscription:", subError);
        throw new Error("Failed to fetch subscription");
      }

      subscription = subData;

      if (!subscription) {
        // Create default free subscription for user
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            tier: "free",
            ai_credits_remaining: 2,
            ai_matchers_remaining: 0,
            max_challenges_per_month: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
          })
          .select("id, ai_credits_remaining, current_period_end, tier")
          .single();

        if (insertError) {
          console.error("Error creating subscription:", insertError);
          throw new Error("Failed to initialize subscription");
        }
        subscription = newSub;
      }

      // Check if subscription period has expired - block usage until renewal (except free tier)
      const periodEnd = new Date(subscription.current_period_end);
      const now = new Date();

      if (periodEnd < now) {
        // For free tier, auto-reset credits; for paid tiers, require renewal
        if (subscription.tier === 'free') {
          // Free tier - auto-reset credits
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("ai_credits_per_day")
            .eq("plan_id", "researcher_free")
            .eq("is_active", true)
            .maybeSingle();

          const newCredits = planData?.ai_credits_per_day || 2;
          const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          const { data: resetSub, error: resetError } = await supabase
            .from("subscriptions")
            .update({
              ai_credits_remaining: newCredits,
              current_period_start: now.toISOString(),
              current_period_end: newPeriodEnd.toISOString(),
            })
            .eq("id", subscription.id)
            .select("id, ai_credits_remaining, current_period_end, tier")
            .single();

          if (resetError) {
            console.error("Error resetting subscription credits:", resetError);
          } else {
            subscription = resetSub;
            console.log(`Free tier credits reset for user ${userId} to ${newCredits}`);
          }
        } else {
          // Paid subscription expired - block usage until renewal
          return new Response(
            JSON.stringify({
              error: "SUBSCRIPTION_EXPIRED",
              message: "Your subscription has expired. Please renew your subscription to continue using AI features.",
              credits_remaining: 0,
              period_end: subscription.current_period_end,
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      if (subscription.ai_credits_remaining <= 0) {
        return new Response(
          JSON.stringify({
            error: "AI_CREDITS_EXHAUSTED",
            message: "You have used all your AI credits for this period. Upgrade your subscription for more credits.",
            credits_remaining: 0,
            period_end: subscription.current_period_end,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const nigeriaContext = `\n\nIMPORTANT GUIDELINES:\n- Base your response on Nigeria and African context where applicable (e.g. Nigerian universities, TETFUND, NUC, NITDA, Nigerian industries, African challenges).\n- Use simple, clear English. Avoid overly complex vocabulary. Write as if explaining to a second-language English speaker.\n- Be practical, direct, and easy to understand.\n- Use relatable Nigerian/African examples where possible.\n`;

    let systemPrompt = "";
    const userPrompt = content;

    switch (type as AIRequestType) {
      case "summarize":
        systemPrompt = `
You are an applied research-to-industry summarization expert.

Analyze the research content and produce a concise, structured summary focused on real-world relevance.

Return the output in the following format and limits:

1. PROBLEM STATEMENT  
   - 2–3 sentences clearly describing the core problem or gap the research addresses.

2. PROPOSED SOLUTION  
   - 2–3 sentences explaining the approach, method, or innovation introduced by the research.

3. SDG ALIGNMENT  
   - List up to 3 relevant Sustainable Development Goals (SDG number and title).
   - Briefly explain the connection in one short sentence each.

4. BUSINESS & INDUSTRY APPLICATIONS  
   - 3–5 bullet points describing practical applications for businesses, industries, or policymakers.

Guidelines:
- Be concise and practical.
- Avoid academic jargon where possible.
- Focus on usability, impact, and real-world implementation.
- Do not exceed 220 words total.
`;
        break;
      case "abstract":
        systemPrompt = `
You are an academic research assistant.

Write a formal academic abstract for the research provided.

Requirements:
- 150–200 words only
- Formal academic tone
- One single paragraph (no headings, no bullets)
- Clearly include: background, objective, methodology, and significance

Return ONLY the abstract text.
`;
        break;

      case "gap_analysis":
        systemPrompt = `You are a research gap detection expert. Analyze the following research topic/abstract and:
1. Identify unexplored areas and research gaps
2. Suggest potential research questions
3. Highlight opportunities for innovation
4. Recommend related fields to explore
5. Provide suggestions for strengthening the research

Be specific and actionable in your recommendations.`;
        break;

      case "keywords":
        systemPrompt = `You are a research keyword extraction expert. Analyze the following content and:
1. Extract 10-15 relevant academic keywords
2. Suggest industry-relevant tags
3. Identify SDG (Sustainable Development Goals) alignments
4. Recommend search terms for discoverability

Return as a structured list.`;
        break;

      case "topic_refine":
        systemPrompt = `You are a research topic refinement expert. Help refine and improve the following research topic by:
1. Suggesting more focused variations
2. Identifying potential scope issues
3. Recommending methodology approaches
4. Highlighting originality potential
5. Suggesting related topics that might be more impactful

Be constructive and encouraging while being specific.`;
        break;

      case "topic_suggestions":
        systemPrompt = `You are a research topic suggestion expert focused on Nigeria and Africa. Generate 5-8 trending and impactful research topics that are:
1. Relevant to current challenges in Nigeria and Africa
2. Aligned with Sustainable Development Goals (SDGs)
3. Have potential for industry collaboration
4. Address real-world problems in areas like agriculture, health, technology, education, environment, or economics

For each topic, provide:
- A clear, focused research title
- A brief 1-2 sentence description of why it's important
- The field/discipline it belongs to

Format each topic as a numbered list.`;
        break;

      case "applications":
        systemPrompt = `You are an industrial applications expert. Analyze the following research and:
1. Identify potential industrial and commercial applications
2. Suggest specific industries that could benefit
3. Outline potential products or services based on this research
4. Highlight market opportunities and potential impact
5. Recommend partnerships or stakeholders to engage

Focus on practical, actionable applications with commercial potential.`;
        break;

      case "literature":
        systemPrompt = `You are a literature review expert. Based on the following research topic or abstract:
1. Suggest key themes and areas for literature review
2. Recommend seminal papers and authors to explore
3. Identify relevant journals and databases to search
4. Suggest search terms and keywords for literature search
5. Outline a structure for organizing the literature review
6. Point out potential theoretical frameworks to consider

Provide specific, actionable suggestions for conducting a thorough literature review.`;
        break;

      case "funding":
        systemPrompt = `You are a research funding pitch expert. Based on the following research:
1. Create a compelling executive summary for funding applications
2. Highlight the unique value proposition and innovation
3. Outline potential societal and economic impact
4. Suggest appropriate funding bodies and grant programs
5. Identify key selling points for investors and funders
6. Draft key sections of a funding proposal

Make the pitch compelling, clear, and funding-ready.`;
        break;

      case "comprehensive_analysis":
        systemPrompt = `You are a comprehensive research analysis expert. Analyze the following research content and extract:

1. PROBLEM STATEMENT: What specific problem does this research address? Provide a clear 2-3 sentence explanation of the challenge or gap being tackled.

2. SOLUTION APPROACH: What methodology, framework, or solution does this research propose? Describe the approach concisely in 2-3 sentences.

3. PRACTICAL APPLICATIONS: What are the real-world applications of this research? List 3-5 specific practical applications.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "problem": "The problem statement here...",
  "solution": "The solution approach here...",
  "applications": ["Application 1", "Application 2", "Application 3"]
}`;
        break;

      case "supervisor_review":
        systemPrompt = `You are an expert academic supervisor reviewing student research. Analyze the submitted research and provide a comprehensive assessment.

Evaluate:
1. METHODOLOGY ASSESSMENT: Rate the research methodology (score 1-10), identify strengths, weaknesses, and provide specific suggestions for improvement.

2. ETHICAL CONCERNS: Identify any ethical risks (data privacy, consent, bias, plagiarism potential, harm to subjects). Flag concerns and provide recommendations.

3. OBJECTIVES CLARITY: Rate how clearly the research objectives are stated (score 1-10), provide feedback, and suggest improved objective statements if needed.

4. OVERALL FEEDBACK: Provide a 2-3 sentence summary of your assessment.

5. RECOMMENDED ACTION: Based on your analysis, recommend "approve" (research is ready to proceed), "revision" (needs improvements but has potential), or "needs_attention" (significant issues must be addressed).

You MUST respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "methodology_assessment": {
    "score": 7,
    "strengths": ["Clear experimental design", "Appropriate sample size"],
    "weaknesses": ["Limited control variables"],
    "suggestions": ["Consider adding a pilot study"]
  },
  "ethical_concerns": {
    "risk_level": "low",
    "flags": [],
    "recommendations": ["Ensure informed consent is documented"]
  },
  "objectives_clarity": {
    "score": 8,
    "feedback": "Objectives are generally clear but could be more specific.",
    "improved_objectives": ["To determine the effect of X on Y in population Z"]
  },
  "overall_feedback": "This research shows promise with a solid foundation. Minor revisions to methodology would strengthen the study.",
  "recommended_action": "revision"
}`;
        break;

      case "version_comparison":
        systemPrompt = `You are an expert research document comparison analyst. Compare the student's original submission with the supervisor's annotated version based on the context provided.

Analyze and identify:
1. KEY CHANGES: What are the main differences between the versions? Focus on structural, content, and quality changes.
2. CONTENT ADDITIONS: What new content or sections appear in the supervisor's annotations?
3. CONTENT REMOVALS: What content from the original was marked for removal or revision?
4. QUALITY IMPROVEMENTS: What improvements in methodology, clarity, or academic rigor are suggested?
5. AREAS NEEDING ATTENTION: What aspects still need work based on the supervisor's feedback?
6. SUPERVISOR FOCUS AREAS: What main areas did the supervisor focus their annotations on?
7. OVERALL ASSESSMENT: Provide a 2-3 sentence summary of the comparison.
8. ALIGNMENT SCORE: Rate how well the student's work aligns with academic standards (0-100).

You MUST respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "key_changes": ["Change 1", "Change 2"],
  "content_additions": ["Addition 1", "Addition 2"],
  "content_removals": ["Removal 1", "Removal 2"],
  "quality_improvements": ["Improvement 1", "Improvement 2"],
  "areas_needing_attention": ["Area 1", "Area 2"],
  "supervisor_focus_areas": ["Focus 1", "Focus 2"],
  "overall_assessment": "Summary of the comparison...",
  "alignment_score": 75
}`;
        break;

      default:
        systemPrompt = "You are a helpful research assistant.";
    }

    console.log(`Processing ${type} request for user ${userId}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt + nigeriaContext },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service requires payment. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // Deduct credits based on whether using supervisor or regular credits
    let newCreditsRemaining: number;
    
    if (usingSupervisorCredits && supervisorCreditsRecord) {
      // Deduct from supervisor credits
      newCreditsRemaining = supervisorCreditsRecord.credits_remaining - 1;
      await supabase
        .from("supervisor_ai_credits")
        .update({ credits_remaining: newCreditsRemaining })
        .eq("id", supervisorCreditsRecord.id);
      
      console.log(`Supervisor ${userId} used credit, remaining: ${newCreditsRemaining}`);
      
      return new Response(
        JSON.stringify({
          result,
          credits_remaining: newCreditsRemaining,
          is_supervisor: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (subscription) {
      // Deduct from regular subscription
      newCreditsRemaining = subscription.ai_credits_remaining - 1;
      await supabase
        .from("subscriptions")
        .update({ ai_credits_remaining: newCreditsRemaining })
        .eq("id", subscription.id);

      console.log(`Successfully processed ${type} request, credits remaining: ${newCreditsRemaining}`);

      return new Response(
        JSON.stringify({
          result,
          credits_remaining: newCreditsRemaining,
          period_end: subscription.current_period_end,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      throw new Error("No credit source available");
    }
  } catch (error: unknown) {
    console.error("Error in ai-research function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
