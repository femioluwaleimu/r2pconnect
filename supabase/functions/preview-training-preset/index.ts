// Preview how a training preset will shape AI review feedback
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_EXCERPT = `This study explores the role of renewable energy in rural Nigeria.
Many sources are taken from blogs and Wikipedia. The methodology is described
in one paragraph and there are no clear research questions. Results are
presented without statistical analysis, and the conclusion repeats the
introduction.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const preset = body?.preset || {};
    const excerpt = (body?.excerpt && String(body.excerpt).slice(0, 4000)) || SAMPLE_EXCERPT;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = [
      `Tone: ${preset.tone || "supportive"}.`,
      `Strictness: ${preset.strictness || "balanced"}.`,
      `Citation style: ${preset.citation_style || "apa"}.`,
      preset.research_field ? `Field: ${preset.research_field}.` : "",
      preset.preferred_methodology ? `Preferred methodology: ${preset.preferred_methodology}.` : "",
      preset.focus_areas?.length ? `Focus: ${preset.focus_areas.join("; ")}.` : "",
      preset.do_rules?.length ? `DO: ${preset.do_rules.join("; ")}.` : "",
      preset.dont_rules?.length ? `DON'T: ${preset.dont_rules.join("; ")}.` : "",
      preset.custom_guidance ? `Guidance: ${preset.custom_guidance}` : "",
      preset.example_feedback ? `Mirror the voice of this example feedback: ${preset.example_feedback}` : "",
    ].filter(Boolean);

    const system = `You are an AI research supervisor giving feedback to a student.
Respond AS IF YOU WERE THE HUMAN SUPERVISOR with this profile:
- ${lines.join("\n- ")}

Return a SHORT preview (max 180 words) showing how you would review the excerpt.
Use 2-4 short bullet points. Do not greet, no preamble.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Excerpt to review:\n\n${excerpt}` },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: txt }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const preview = data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ preview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
