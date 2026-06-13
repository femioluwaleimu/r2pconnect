import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challengeId } = await req.json();
    
    if (!challengeId) {
      return new Response(
        JSON.stringify({ error: "Challenge ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client to verify ownership
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for privileged operations
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the challenge and verify ownership
    const { data: challenge, error: challengeError } = await serviceClient
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("industry_id", user.id)
      .single();

    if (challengeError || !challenge) {
      console.error("Challenge fetch error:", challengeError);
      return new Response(
        JSON.stringify({ error: "Challenge not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription limits and expiration
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("tier, ai_matches_per_challenge, ai_matchers_remaining, current_period_end")
      .eq("user_id", user.id)
      .single();

    // Check if subscription has expired (for paid tiers)
    if (subscription && subscription.tier !== 'free') {
      const periodEnd = new Date(subscription.current_period_end);
      const now = new Date();
      if (periodEnd < now) {
        return new Response(
          JSON.stringify({ 
            error: "SUBSCRIPTION_EXPIRED",
            message: "Your subscription has expired. Please renew your subscription to continue using AI matching." 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if AI matchers remaining
    if (subscription && subscription.ai_matchers_remaining !== null && subscription.ai_matchers_remaining <= 0) {
      return new Response(
        JSON.stringify({ 
          error: "AI_MATCHERS_EXHAUSTED",
          message: "You have used all your AI matchers for this period. Upgrade your subscription for more." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchLimit = subscription?.ai_matches_per_challenge || 3;

    // Check existing matches count
    const { count: existingMatches } = await serviceClient
      .from("challenge_matches")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId);

    if ((existingMatches || 0) >= matchLimit) {
      return new Response(
        JSON.stringify({ 
          error: "Match limit reached for this challenge", 
          limit: matchLimit,
          current: existingMatches 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch published research papers with author info
    const { data: papers, error: papersError } = await serviceClient
      .from("research_papers")
      .select("id, title, abstract, keywords, industry_tags, author_id")
      .eq("status", "published")
      .limit(50);

    if (papersError) {
      console.error("Papers fetch error:", papersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch research papers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!papers || papers.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No published research papers available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for AI matching
    const challengeContext = `
Challenge Title: ${challenge.title}
Challenge Description: ${challenge.description}
Reward: ${challenge.reward_amount} ${challenge.reward_currency}
Deadline: ${challenge.deadline || "No deadline"}
    `.trim();

    const papersContext = papers.map((p, i) => `
Paper ${i + 1}:
- ID: ${p.id}
- Title: ${p.title}
- Abstract: ${p.abstract || "No abstract"}
- Keywords: ${(p.keywords || []).join(", ") || "None"}
- Industry Tags: ${(p.industry_tags || []).join(", ") || "None"}
    `.trim()).join("\n\n");

    const systemPrompt = `You are an AI research matcher. Given an industry challenge and a list of research papers, identify the most relevant papers that could help solve the challenge.

For each match, provide:
1. paper_id: The exact ID of the paper
2. relevance_score: A score from 0-100 indicating how relevant the paper is
3. match_reason: A brief explanation (1-2 sentences) of why this paper is relevant

Return a JSON array of matches, sorted by relevance_score descending. Only include papers with relevance_score >= 50.
Maximum ${matchLimit - (existingMatches || 0)} matches.

Response format:
[
  {"paper_id": "uuid", "relevance_score": 85, "match_reason": "This paper directly addresses..."},
  ...
]

Only return the JSON array, no other text.`;

    const userPrompt = `Find relevant research papers for this challenge:

${challengeContext}

Available Research Papers:
${papersContext}`;

    console.log("Calling Lovable AI for matching...");

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please upgrade your plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI matching service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response content:", aiContent);

    // Parse AI response
    let matches = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      matches = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI matching results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(matches)) {
      matches = [];
    }

    // Filter and validate matches
    const validPaperIds = new Set(papers.map(p => p.id));
    const paperAuthorMap = new Map(papers.map(p => [p.id, p.author_id]));
    
    const validMatches = matches.filter(m => 
      m.paper_id && 
      validPaperIds.has(m.paper_id) && 
      typeof m.relevance_score === "number" &&
      m.relevance_score >= 50
    );

    // Insert matches into database
    const matchInserts = validMatches.map(m => ({
      challenge_id: challengeId,
      paper_id: m.paper_id,
      researcher_id: paperAuthorMap.get(m.paper_id),
      relevance_score: Math.min(100, Math.max(0, Math.round(m.relevance_score))),
      match_reason: m.match_reason || "AI-matched based on research relevance",
    }));

    if (matchInserts.length > 0) {
      const { error: insertError } = await serviceClient
        .from("challenge_matches")
        .upsert(matchInserts, { onConflict: "challenge_id,paper_id" });

      if (insertError) {
        console.error("Match insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save matches" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch the saved matches with paper and researcher details
    const { data: savedMatches, error: fetchError } = await serviceClient
      .from("challenge_matches")
      .select(`
        id,
        relevance_score,
        match_reason,
        is_contacted,
        created_at,
        paper_id,
        researcher_id
      `)
      .eq("challenge_id", challengeId)
      .order("relevance_score", { ascending: false });

    if (fetchError) {
      console.error("Fetch saved matches error:", fetchError);
    }

    // Get paper and profile details separately
    const paperIds = savedMatches?.map(m => m.paper_id) || [];
    const researcherIds = savedMatches?.map(m => m.researcher_id) || [];

    const { data: paperDetails } = await serviceClient
      .from("research_papers")
      .select("id, title, abstract")
      .in("id", paperIds);

    const { data: profileDetails } = await serviceClient
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", researcherIds);

    // Combine the data
    const enrichedMatches = savedMatches?.map(match => {
      const paper = paperDetails?.find(p => p.id === match.paper_id);
      const profile = profileDetails?.find(p => p.user_id === match.researcher_id);
      return {
        ...match,
        paper: paper || null,
        researcher: profile || null,
      };
    }) || [];

    console.log(`Successfully matched ${enrichedMatches.length} researchers for challenge ${challengeId}`);

    return new Response(
      JSON.stringify({ 
        matches: enrichedMatches,
        new_matches: matchInserts.length,
        total_matches: enrichedMatches.length,
        limit: matchLimit
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Match error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
