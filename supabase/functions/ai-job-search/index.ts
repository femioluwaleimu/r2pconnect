import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobSummary {
  id: string;
  title: string;
  description: string;
  job_type: string;
  department: string | null;
  required_level: string[] | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, jobs } = await req.json() as { query: string; jobs: JobSummary[] };

    if (!query || !jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ matchedJobIds: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const jobsList = jobs.map(j => 
      `ID: ${j.id}\nTitle: ${j.title}\nType: ${j.job_type}\nDepartment: ${j.department || 'Any'}\nLevels: ${j.required_level?.join(', ') || 'Any'}\nDescription: ${j.description.substring(0, 200)}...`
    ).join('\n\n---\n\n');

    const prompt = `You are a job matching AI. A student is searching for jobs with this query:
"${query}"

Here are the available job postings:

${jobsList}

Based on the student's search query, identify which jobs are the best matches. Consider:
- Job type (internship, SIWES, part-time, industrial training)
- Department/field relevance
- Student level requirements mentioned in the query
- Skills and interests implied in the query

Return ONLY a JSON array of matching job IDs, ordered by relevance (best match first).
Example response: ["uuid1", "uuid2", "uuid3"]

If no jobs match, return an empty array: []`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a job matching AI that helps students find relevant opportunities. Only respond with valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', matchedJobIds: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.', matchedJobIds: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse the response - extract JSON array
    let matchedJobIds: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matchedJobIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Validate that returned IDs exist in our jobs list
    const validJobIds = jobs.map(j => j.id);
    matchedJobIds = matchedJobIds.filter(id => validJobIds.includes(id));

    console.log(`AI job search: query="${query}", matched=${matchedJobIds.length} jobs`);

    return new Response(
      JSON.stringify({ matchedJobIds }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI job search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, matchedJobIds: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
