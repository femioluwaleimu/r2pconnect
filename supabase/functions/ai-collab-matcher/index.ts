import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearcherMatch {
  userId: string;
  name: string;
  avatar: string | null;
  institution: string | null;
  researchField: string | null;
  matchScore: number;
  matchReason: string;
  overlappingTopics: string[];
  paperTitles: string[];
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

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's research papers for context
    const { data: userPapers } = await supabase
      .from("research_papers")
      .select("title, abstract, keywords, research_field, industry_tags")
      .eq("author_id", user.id);

    if (!userPapers || userPapers.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          message: "Upload research papers to get AI-powered researcher matching recommendations.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get other researchers' papers (excluding current user)
    const { data: otherPapers } = await supabase
      .from("research_papers")
      .select(`
        author_id,
        title,
        abstract,
        keywords,
        research_field
      `)
      .neq("author_id", user.id)
      .eq("status", "approved")
      .limit(100);

    if (!otherPapers || otherPapers.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          message: "No other researchers with published papers found yet.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group papers by author
    const authorPapers: Record<string, typeof otherPapers> = {};
    for (const paper of otherPapers) {
      if (!authorPapers[paper.author_id]) {
        authorPapers[paper.author_id] = [];
      }
      authorPapers[paper.author_id].push(paper);
    }

    // Get profiles for these authors
    const authorIds = Object.keys(authorPapers);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, institution_id")
      .in("user_id", authorIds);

    // Get institution names
    const institutionIds = profiles?.filter(p => p.institution_id).map(p => p.institution_id) || [];
    const { data: institutions } = await supabase
      .from("institutions")
      .select("id, name")
      .in("id", institutionIds);

    const institutionMap = new Map(institutions?.map(i => [i.id, i.name]) || []);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Build user research profile summary
    const userResearchProfile = userPapers.map((p) => ({
      title: p.title,
      field: p.research_field,
      keywords: p.keywords?.join(", ") || "",
      abstract: p.abstract?.substring(0, 200) || "",
    }));

    // Build other researchers summary
    const otherResearchers = authorIds.map(authorId => {
      const papers = authorPapers[authorId];
      const profile = profileMap.get(authorId);
      return {
        authorId,
        name: profile?.full_name || "Unknown Researcher",
        papers: papers.map(p => ({
          title: p.title,
          field: p.research_field,
          keywords: p.keywords?.join(", ") || "",
        })),
      };
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `You are an AI that helps researchers find potential collaborators with similar research interests.

Based on the user's research profile and the list of other researchers below, identify the top 5 researchers who would be the best match for collaboration.

User's Research Papers:
${JSON.stringify(userResearchProfile, null, 2)}

Other Researchers and Their Work:
${JSON.stringify(otherResearchers, null, 2)}

Return a JSON array of exactly 5 researcher matches with this structure:
[
  {
    "authorId": "uuid-of-author",
    "matchScore": 95,
    "matchReason": "Brief explanation of why this researcher is a good match for collaboration",
    "overlappingTopics": ["Topic 1", "Topic 2", "Topic 3"]
  }
]

Focus on:
1. Similar research fields and methodologies
2. Complementary expertise that could enhance collaboration
3. Overlapping keywords and research interests
4. Potential for joint publications or projects

Order by relevance score (highest first).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert at matching researchers for collaboration. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI_CREDITS_EXHAUSTED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI_CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let aiMatches: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiMatches = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Error parsing AI response:", content);
    }

    // Enrich matches with profile data
    const enrichedMatches: ResearcherMatch[] = aiMatches
      .filter(m => profileMap.has(m.authorId))
      .map(m => {
        const profile = profileMap.get(m.authorId)!;
        const papers = authorPapers[m.authorId] || [];
        return {
          userId: m.authorId,
          name: profile.full_name || "Unknown Researcher",
          avatar: profile.avatar_url,
          institution: profile.institution_id ? institutionMap.get(profile.institution_id) || null : null,
          researchField: papers[0]?.research_field || null,
          matchScore: m.matchScore,
          matchReason: m.matchReason,
          overlappingTopics: m.overlappingTopics || [],
          paperTitles: papers.slice(0, 3).map(p => p.title),
        };
      });

    console.log(`AI collab matcher found ${enrichedMatches.length} researcher matches for user ${user.id}`);

    return new Response(
      JSON.stringify({ matches: enrichedMatches }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-collab-matcher:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
