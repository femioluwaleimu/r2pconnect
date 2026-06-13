import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReviewRequest {
  research_id: string;
  chapter_name: string;
  chapter_number?: number;
  chapter_content: string;
  review_mode?: "quick" | "learning" | "advanced";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { research_id, chapter_name, chapter_number, chapter_content, review_mode = "quick" }: ReviewRequest = await req.json();

    if (!research_id || !chapter_name || !chapter_content) {
      return new Response(JSON.stringify({ error: "Missing required fields: research_id, chapter_name, chapter_content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: research, error: researchError } = await supabase
      .from("research_papers")
      .select("id, title, status, author_id, research_type, supervision_type, ai_style_source, research_level, research_purpose")
      .eq("id", research_id)
      .single();

    if (researchError || !research) {
      return new Response(JSON.stringify({ error: "Research not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (research.author_id !== user.id) {
      return new Response(JSON.stringify({ error: "You can only scan chapters of your own research" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedStatuses = ["draft", "ongoing", "revision_requested", "under_review"];
    if (!allowedStatuses.includes(research.status)) {
      return new Response(JSON.stringify({ error: "Chapter scanning is only available during active research phases" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditCost = review_mode === "advanced" ? 3 : review_mode === "learning" ? 2 : 1;

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subscription.tier !== "free" && subscription.current_period_end) {
      const endDate = new Date(subscription.current_period_end);
      if (endDate < new Date()) {
        return new Response(JSON.stringify({ error: "AI_CREDITS_EXHAUSTED", message: "Your subscription has expired." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if ((subscription.ai_credits_remaining || 0) < creditCost) {
      return new Response(JSON.stringify({
        error: "AI_CREDITS_EXHAUSTED",
        message: `Not enough credits. ${review_mode === "advanced" ? "Advanced mode requires 3 credits." : review_mode === "learning" ? "Learning mode requires 2 credits." : ""}`
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LEVEL_GUIDANCE: Record<string, string> = {
      nd_hnd: "Audience: ND/HND polytechnic student. Use simple, clear explanations. Focus on structure, clarity, and basic methodology. Avoid heavy academic complexity. Be encouraging.",
      undergraduate: "Audience: Undergraduate university student. Apply moderate academic standards. Focus on proper formatting, referencing (APA/Harvard), clarity, and logical flow.",
      pgd: "Audience: PGD student. Expectation slightly higher than undergraduate. Push for improved depth, structured argument, and stronger analytical reasoning.",
      msc: "Audience: MSc / M.Tech student. Apply strong academic rigor. Focus on methodology robustness, literature depth, critical analysis, and proper theoretical framing.",
      phd: "Audience: PhD candidate. Apply VERY strict academic standards. Demand critical analysis, originality, and clear contribution to knowledge. Flag weak arguments, lack of novelty, or insufficient theoretical grounding.",
      lecturer: "Audience: Lecturer / academic researcher. Use a high-level academic tone. Provide publication-ready, journal-style corrections and suggestions.",
      industry: "Audience: Industry / applied researcher. Focus on real-world applicability, implementation feasibility, and measurable outcomes. Reduce excessive theoretical discussion.",
      independent: "Audience: Independent researcher. Provide balanced, flexible guidance. Keep tone professional but adaptable.",
    };

    const PURPOSE_GUIDANCE: Record<string, string> = {
      academic_submission: "Purpose: Academic Submission. Emphasize meeting passing requirements, structure, formatting, and chapter completeness.",
      publication: "Purpose: Publication. Improve academic tone, suggest journal-quality standards, strengthen citations and referencing, and recommend a target journal style.",
      commercialisation: "Purpose: Commercialisation. Focus on practical use, market value, scalability, and business/implementation pathways.",
      grant_application: "Purpose: Grant Application. Emphasize problem-statement clarity, innovation, impact, feasibility, and measurable outcomes.",
      personal_development: "Purpose: Personal Development. Keep feedback simple, supportive, and encouraging while still constructive.",
    };

    const levelGuidance = research.research_level ? (LEVEL_GUIDANCE[research.research_level] || "") : "";
    const purposeGuidance = research.research_purpose ? (PURPOSE_GUIDANCE[research.research_purpose] || "") : "";

    // --- Supervisor AI training: when this research has a human supervisor with an active training profile,
    // mirror their style so the AI mentors the student the way the supervisor would.
    let supervisorBlock = "";
    try {
      const { data: paperWithSup } = await supabase
        .from("research_papers")
        .select("supervisor_id, author_id")
        .eq("id", research_id)
        .maybeSingle();
      const supId = paperWithSup?.supervisor_id;
      const studentId = paperWithSup?.author_id;
      if (supId) {
        // Resolution priority: per-research preset > per-student preset >
        // supervisor default preset > legacy supervisor_ai_training
        let training: any = null;

        const { data: researchAssign } = await supabase
          .from("supervisor_training_assignments")
          .select("preset:supervisor_ai_training_presets(*)")
          .eq("supervisor_id", supId)
          .eq("research_id", research_id)
          .maybeSingle();
        if (researchAssign?.preset && (researchAssign.preset as any).is_active) {
          training = researchAssign.preset;
        }

        if (!training && studentId) {
          const { data: studentAssign } = await supabase
            .from("supervisor_training_assignments")
            .select("preset:supervisor_ai_training_presets(*)")
            .eq("supervisor_id", supId)
            .eq("student_id", studentId)
            .maybeSingle();
          if (studentAssign?.preset && (studentAssign.preset as any).is_active) {
            training = studentAssign.preset;
          }
        }

        if (!training) {
          const { data: defaultPreset } = await supabase
            .from("supervisor_ai_training_presets")
            .select("*")
            .eq("supervisor_id", supId)
            .eq("is_default", true)
            .eq("is_active", true)
            .maybeSingle();
          if (defaultPreset) training = defaultPreset;
        }

        if (!training) {
          const { data: legacy } = await supabase
            .from("supervisor_ai_training")
            .select("*")
            .eq("supervisor_id", supId)
            .eq("is_active", true)
            .maybeSingle();
          if (legacy) training = legacy;
        }
        if (training) {
          const lines: string[] = [];
          lines.push(`Tone: ${training.tone}. Strictness: ${training.strictness}. Citation style: ${training.citation_style || "apa"}.`);
          if (training.research_field) lines.push(`Supervisor's field: ${training.research_field}.`);
          if (training.preferred_methodology) lines.push(`Preferred methodology: ${training.preferred_methodology}.`);
          if (Array.isArray(training.focus_areas) && training.focus_areas.length)
            lines.push(`Always emphasise: ${training.focus_areas.join("; ")}.`);
          if (Array.isArray(training.do_rules) && training.do_rules.length)
            lines.push(`DO: ${training.do_rules.join("; ")}.`);
          if (Array.isArray(training.dont_rules) && training.dont_rules.length)
            lines.push(`DO NOT: ${training.dont_rules.join("; ")}.`);
          if (training.custom_guidance) lines.push(`Custom guidance: ${training.custom_guidance}`);
          if (training.example_feedback) lines.push(`Example of supervisor's feedback voice (mirror the style, do NOT quote): ${training.example_feedback}`);
          supervisorBlock = `\n\nHUMAN SUPERVISOR TRAINING — RESPOND AS IF YOU WERE THIS SUPERVISOR:\n- ${lines.join("\n- ")}\n`;
        }
      }
    } catch (e) {
      console.warn("supervisor training lookup failed:", e);
    }

    const adaptiveBlock = (levelGuidance || purposeGuidance || supervisorBlock)
      ? `\n\nADAPTIVE CONTEXT — TAILOR YOUR FEEDBACK ACCORDINGLY:\n${levelGuidance ? "- " + levelGuidance : ""}\n${purposeGuidance ? "- " + purposeGuidance : ""}${supervisorBlock}`
      : "";

    const isLearningMode = review_mode === "learning";
    const isAdvancedMode = review_mode === "advanced";

    const advancedSystemPrompt = `You are an elite academic research mentor performing the most COMPREHENSIVE 19-section deep review of a research chapter.

CRITICAL RULES:
- DO NOT rewrite or quote the student's text
- ONLY provide analysis, evaluation, and actionable guidance
- Tailor tone and strictness to the student's academic level and purpose
- "required_fixes" and "priority_fix_list" MUST contain MORE THAN THREE items (minimum 4)
- Be honest, structured, and motivating

Return a JSON object with EXACTLY this structure:
{
  "rating": <number 1-5>,
  "academic_clarity_score": <number 1-5>,
  "methodology_alignment": <number 1-5 or null>,
  "style_match_score": <number 0-100>,
  "examiner_readiness": <"not_ready" | "needs_revision" | "supervisor_ready">,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": [<3-6 things done well: clarity, structure, originality, relevance>],
  "weak_areas": [<3-6 gaps, inconsistencies, missing elements>],
  "suggested_improvements": [<4-7 specific, actionable corrections, rewrites and additions>],
  "academic_level_feedback": [<3-5 items tailored to the student's research level>],
  "purpose_based_recommendations": [<3-5 items aligned with the research purpose>],
  "structure_review": "<paragraph evaluating logical flow and chapter arrangement, with structuring suggestions>",
  "methodology_assessment": "<paragraph evaluating research design, approach and validity, with improvement suggestions>",
  "literature_review_quality": "<paragraph on depth/relevance of sources, outdated/weak references, areas needing more scholarly backing>",
  "clarity_readability": "<paragraph on sentence clarity and coherence, ambiguity, and simplification suggestions>",
  "academic_language_tone": "<paragraph ensuring formal academic style, flagging informal expressions, suggesting vocabulary improvements>",
  "referencing_check": "<paragraph identifying missing citations, citation style guidance (APA/MLA/etc), and plagiarism risk flags>",
  "originality_critical_thinking": "<paragraph evaluating independent thinking and originality, with ways to deepen analysis>",
  "practical_relevance": "<paragraph evaluating real-world applicability and industry use cases, or 'Not applicable' if not relevant>",
  "risk_gap_identification": [<3-6 weak arguments, unsupported claims, missing data or assumptions>],
  "ai_confidence_score": <integer 0-100>,
  "ai_confidence_explanation": "<1-2 sentences explaining the confidence score>",
  "priority_fix_list": [<top 3-5 most important corrections, ordered by impact, MINIMUM 4>],
  "next_action_steps": [<4-6 clear step-by-step actions the student should do next>],
  "supervisor_insight": "<short summary for the supervisor, highlighting key concerns and readiness level>",
  "encouragement_note": "<warm, motivating closing note encouraging improvement>",
  "required_fixes": [<MINIMUM 4 must-fix items, mirroring priority_fix_list>],
  "optional_improvements": [<2-5 nice-to-have improvements>],
  "recommendations": [<5-8 actionable recommendations summarising the deep review>]
}

EXAMINER READINESS CRITERIA:
- "supervisor_ready": Rating ≥4, no critical issues
- "needs_revision": Rating 3, minor issues
- "not_ready": Rating <3, significant work required

Return ONLY valid JSON. No markdown. No commentary.`;

    const learningSystemPrompt = `You are an expert academic research mentor providing DETAILED educational feedback. Your role is to help students LEARN and IMPROVE.

CRITICAL REQUIREMENTS FOR EACH RECOMMENDATION:
1. What to change - Specific actionable changes needed
2. Why it matters academically - Educational explanation of importance
3. What examiners expect - Examiner perspective and standards
4. Generic example - Illustrative example (NOT copied from the student's text)

IMPORTANT RULES:
- DO NOT rewrite or provide alternative content from the chapter
- ONLY provide analysis and recommendations  
- Be encouraging but honest - like a supportive mentor
- Use pattern references only: "Approved projects typically include..."
- NEVER quote or show real text from reference documents
- "required_fixes" MUST contain MORE THAN THREE items (minimum 4).

For the chapter provided, return a JSON object with EXACTLY this structure:
{
  "rating": <number 1-5>,
  "academic_clarity_score": <number 1-5>,
  "methodology_alignment": <number 1-5 or null if not applicable>,
  "style_match_score": <number 0-100, how well it matches academic style>,
  "examiner_readiness": <"not_ready" | "needs_revision" | "supervisor_ready">,
  "summary": "<2-3 sentence assessment>",
  "strengths": [<array of 3-5 strengths>],
  "weak_areas": [<array of 3-5 areas needing work>],
  "what_to_change": [<array of specific changes needed>],
  "why_it_matters": [<array explaining academic importance of each change>],
  "examiner_expectations": [<array of what examiners look for>],
  "generic_examples": [<array of generic illustrative examples>],
  "required_fixes": [<array of AT LEAST 4 must-fix items>],
  "optional_improvements": [<array of nice-to-have improvements>],
  "recommendations": [<array of 5-7 detailed actionable recommendations>],
  "academic_level_feedback": [<array of 2-4 feedback items tailored to the student's academic level>],
  "purpose_based_recommendations": [<array of 2-4 recommendations tailored to the research purpose>]
}

EXAMINER READINESS CRITERIA:
- "supervisor_ready": Rating ≥4, no critical issues, structure is sound
- "needs_revision": Rating 3, minor issues that need attention
- "not_ready": Rating <3, significant issues requiring work

Return ONLY valid JSON, no markdown or explanations.`;

    const quickSystemPrompt = `You are an expert academic research reviewer providing CONCISE, actionable feedback.

IMPORTANT RULES:
- DO NOT rewrite or provide alternative content
- ONLY provide analysis and key recommendations
- Focus on the most important issues
- Be direct and efficient
- "required_fixes" MUST contain MORE THAN THREE items (minimum 4).

For the chapter provided, return a JSON object with EXACTLY this structure:
{
  "rating": <number 1-5>,
  "academic_clarity_score": <number 1-5>,
  "methodology_alignment": <number 1-5 or null>,
  "style_match_score": <number 0-100>,
  "examiner_readiness": <"not_ready" | "needs_revision" | "supervisor_ready">,
  "summary": "<1-2 sentence assessment>",
  "strengths": [<array of 2-3 key strengths>],
  "weak_areas": [<array of 2-3 main areas needing work>],
  "required_fixes": [<array of AT LEAST 4 must-fix items>],
  "optional_improvements": [<array of nice-to-have items>],
  "recommendations": [<array of 3-5 actionable recommendations>],
  "academic_level_feedback": [<array of 2-3 feedback items tailored to the student's academic level>],
  "purpose_based_recommendations": [<array of 2-3 recommendations tailored to the research purpose>]
}

Rating Guide:
5 = Excellent - Publication ready
4 = Good - Minor improvements needed  
3 = Satisfactory - Moderate revisions needed
2 = Needs Work - Significant improvements required
1 = Poor - Major restructuring needed

Return ONLY valid JSON, no markdown.`;

    const systemPromptBase = isAdvancedMode ? advancedSystemPrompt : isLearningMode ? learningSystemPrompt : quickSystemPrompt;
    const systemPrompt = systemPromptBase + adaptiveBlock;

    const contentLimit = isAdvancedMode ? 25000 : isLearningMode ? 20000 : 15000;
    const userPrompt = `Analyze this "${chapter_name}" from an academic research paper:

---
${chapter_content.substring(0, contentLimit)}
---

Provide your ${isAdvancedMode ? "comprehensive 19-section deep" : isLearningMode ? "detailed educational" : "concise"} analysis as JSON.`;

    console.log(`Analyzing chapter "${chapter_name}" in ${review_mode} mode for research ${research_id}`);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isAdvancedMode ? "gpt-4o-mini" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service requires payment. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let analysis: any;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis");
    }

    await supabase
      .from("subscriptions")
      .update({ ai_credits_remaining: (subscription.ai_credits_remaining || creditCost) - creditCost })
      .eq("user_id", user.id);

    const { data: review, error: insertError } = await supabase
      .from("research_chapter_reviews")
      .upsert({
        research_id,
        user_id: user.id,
        chapter_name,
        chapter_number: chapter_number || null,
        review_mode,
        rating: analysis.rating,
        academic_clarity_score: analysis.academic_clarity_score,
        methodology_alignment: analysis.methodology_alignment,
        style_match_score: analysis.style_match_score,
        examiner_readiness: analysis.examiner_readiness || "not_ready",
        strengths: analysis.strengths || [],
        weak_areas: analysis.weak_areas || [],
        recommendations: analysis.recommendations || [],
        required_fixes: analysis.required_fixes || [],
        optional_improvements: analysis.optional_improvements || [],
        what_to_change: analysis.what_to_change || [],
        why_it_matters: analysis.why_it_matters || [],
        examiner_expectations: analysis.examiner_expectations || [],
        generic_examples: analysis.generic_examples || [],
        academic_level_feedback: analysis.academic_level_feedback || [],
        purpose_based_recommendations: analysis.purpose_based_recommendations || [],
        suggested_improvements: analysis.suggested_improvements || [],
        structure_review: analysis.structure_review || null,
        methodology_assessment: analysis.methodology_assessment || null,
        literature_review_quality: analysis.literature_review_quality || null,
        clarity_readability: analysis.clarity_readability || null,
        academic_language_tone: analysis.academic_language_tone || null,
        referencing_check: analysis.referencing_check || null,
        originality_critical_thinking: analysis.originality_critical_thinking || null,
        practical_relevance: analysis.practical_relevance || null,
        risk_gap_identification: analysis.risk_gap_identification || [],
        ai_confidence_score: typeof analysis.ai_confidence_score === "number" ? analysis.ai_confidence_score : null,
        ai_confidence_explanation: analysis.ai_confidence_explanation || null,
        priority_fix_list: analysis.priority_fix_list || [],
        next_action_steps: analysis.next_action_steps || [],
        supervisor_insight: analysis.supervisor_insight || null,
        encouragement_note: analysis.encouragement_note || null,
        summary: analysis.summary,
        updated_at: new Date().toISOString(),
      }, { onConflict: "research_id,chapter_name" })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store review:", insertError);
    }

    console.log(`Chapter review completed for "${chapter_name}", rating: ${analysis.rating}, readiness: ${analysis.examiner_readiness}`);

    return new Response(JSON.stringify({
      success: true,
      review: review || {
        chapter_name,
        chapter_number,
        review_mode,
        ...analysis,
      },
      credits_remaining: (subscription.ai_credits_remaining || creditCost) - creditCost,
      credits_used: creditCost,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ai-chapter-review error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
