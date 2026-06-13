import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_5000_WORDS = 1;

// Simple PDF text extraction using basic parsing
async function extractTextFromPDF(pdfUrl: string, supabase: any): Promise<string> {
  try {
    console.log("Attempting to download PDF from:", pdfUrl);
    
    // Get signed URL for the file
    const urlParts = pdfUrl.split('/');
    const bucketIndex = urlParts.findIndex(p => p === 'research-papers');
    if (bucketIndex === -1) {
      console.log("Not a storage URL, skipping PDF extraction");
      return "";
    }
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    console.log("File path:", filePath);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('research-papers')
      .createSignedUrl(filePath, 300);
    
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error getting signed URL:", signedUrlError);
      return "";
    }
    
    // Download the PDF
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      console.error("Failed to download PDF:", response.status);
      return "";
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Basic text extraction from PDF
    // This extracts readable text strings from the PDF binary
    let text = "";
    let currentString = "";
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Check for printable ASCII characters
      if (byte >= 32 && byte <= 126) {
        currentString += String.fromCharCode(byte);
      } else if (currentString.length > 3) {
        // Only keep strings longer than 3 chars to filter noise
        text += currentString + " ";
        currentString = "";
      } else {
        currentString = "";
      }
    }
    
    // Add any remaining string
    if (currentString.length > 3) {
      text += currentString;
    }
    
    // Clean up the extracted text
    text = text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\s]/g, '')
      .trim();
    
    // Limit text length for API
    const maxLength = 15000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength);
    }
    
    console.log(`Extracted ${text.length} characters from PDF`);
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "";
  }
}

async function analyzeWithDeepSeek(
  title: string,
  abstract: string,
  documentContent: string
): Promise<{
  plagiarism_score: number;
  plagiarism_status: string;
  plagiarism_indicators: string[];
  ai_content_risk: string;
  ai_indicators: string[];
  originality_signals: string[];
  advisory_notes: string;
  document_analyzed: boolean;
}> {
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const hasDocumentContent = Boolean(documentContent && documentContent.length > 100);
  
  const contentToAnalyze = hasDocumentContent 
    ? `Title: ${title || 'Untitled'}

Abstract: ${abstract || 'No abstract provided'}

Document Content (extracted from uploaded file):
${documentContent}`
    : `Title: ${title || 'Untitled'}

Abstract: ${abstract || 'No abstract provided'}

Note: No document content was available for analysis. This assessment is based on title and abstract only.`;

  const systemPrompt = `You are an academic integrity analysis expert specializing in plagiarism detection and AI content identification. Analyze the following research content for potential integrity concerns.

${hasDocumentContent ? 'You have access to the FULL DOCUMENT CONTENT extracted from the uploaded research paper.' : 'You only have access to the title and abstract - the full document was not available.'}

Evaluate thoroughly:

1. PLAGIARISM INDICATORS (0-100 score):
   - Look for signs of copied content: generic/templated phrasing, inconsistent writing style
   - Check for overly polished language that doesn't match student level
   - Identify common phrases from well-known papers or textbooks
   - Look for citation issues: missing citations, suspicious citation patterns
   - Check for patchwriting (slightly modified copied content)
   - Score: low (0-30), medium (31-60), high (61-100)

2. AI CONTENT RISK (low/medium/high):
   - Overly structured/formulaic responses
   - Generic transitions and conclusions
   - Lack of specific examples or personal insights
   - Repetitive sentence structures with perfect grammar
   - Absence of natural writing imperfections
   - Unnatural consistency in tone and style

3. ORIGINALITY SIGNALS:
   - Unique perspectives or novel approaches
   - Personal voice and authentic writing style
   - Specific examples from research/fieldwork
   - Natural flow with appropriate imperfections

CRITICAL: This is an ADVISORY assessment only. Provide specific, actionable insights.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "plagiarism_score": 25,
  "plagiarism_status": "low",
  "plagiarism_indicators": ["specific indicator 1", "specific indicator 2"],
  "ai_content_risk": "low",
  "ai_indicators": ["specific indicator 1", "specific indicator 2"],
  "originality_signals": ["positive signal 1", "positive signal 2"],
  "advisory_notes": "Brief overall assessment with specific recommendations"
}`;

  console.log("Calling DeepSeek API for analysis...");
  console.log(`Content length: ${contentToAnalyze.length} chars, Document analyzed: ${hasDocumentContent}`);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentToAnalyze },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DeepSeek API error:", response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  let result = data.choices[0].message.content;

  // Parse JSON response
  try {
    // Clean markdown if present
    result = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = jsonMatch[0];
    }
    const parsed = JSON.parse(result);
    return {
      ...parsed,
      document_analyzed: hasDocumentContent
    };
  } catch (parseError) {
    console.error("Parse error:", parseError, "Raw result:", result);
    return {
      plagiarism_score: 0,
      plagiarism_status: "low",
      plagiarism_indicators: [],
      ai_content_risk: "low",
      ai_indicators: [],
      originality_signals: [],
      advisory_notes: "Analysis could not be completed - parsing error",
      document_analyzed: hasDocumentContent
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { research_id, abstract, title } = await req.json();

    if (!research_id || !abstract) {
      return new Response(JSON.stringify({ error: "research_id and abstract are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for database operations
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the research paper
    const { data: paper, error: paperError } = await supabase
      .from("research_papers")
      .select("id, research_type, author_id, supervisor_id, file_url")
      .eq("id", research_id)
      .maybeSingle();

    if (paperError || !paper) {
      return new Response(JSON.stringify({ error: "Research not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only supervisors can run integrity checks
    if (paper.supervisor_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the assigned supervisor can run integrity checks" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only run checks for student research
    if (paper.research_type !== "student") {
      return new Response(
        JSON.stringify({ 
          message: "Integrity checks only apply to student research",
          skipped: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Running enhanced integrity check for research ${research_id} by supervisor ${user.id}`);

    // Extract text from uploaded document if available
    let documentContent = "";
    if (paper.file_url) {
      console.log("Extracting text from uploaded document...");
      documentContent = await extractTextFromPDF(paper.file_url, supabase);
    }

    // Calculate word count for credit usage
    const abstractWords = abstract ? abstract.split(/\s+/).length : 0;
    const documentWords = documentContent ? documentContent.split(/\s+/).length : 0;
    const totalWords = abstractWords + documentWords;
    const creditsRequired = Math.max(1, Math.ceil(totalWords / 5000));

    console.log(`Total words: ${totalWords}, Credits required: ${creditsRequired}`);

    // Check and deduct supervisor AI credits
    const { data: creditsData, error: creditsError } = await supabase
      .from("supervisor_ai_credits")
      .select("id, credits_remaining")
      .eq("supervisor_id", user.id)
      .maybeSingle();

    if (creditsError) {
      console.error("Error fetching credits:", creditsError);
      return new Response(JSON.stringify({ error: "Failed to check credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentCredits = creditsData?.credits_remaining || 0;

    if (currentCredits < creditsRequired) {
      return new Response(JSON.stringify({ 
        error: `Insufficient AI credits. Required: ${creditsRequired}, Available: ${currentCredits}` 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    if (creditsData) {
      const { error: deductError } = await supabase
        .from("supervisor_ai_credits")
        .update({ 
          credits_remaining: currentCredits - creditsRequired,
          updated_at: new Date().toISOString()
        })
        .eq("id", creditsData.id);

      if (deductError) {
        console.error("Error deducting credits:", deductError);
        return new Response(JSON.stringify({ error: "Failed to deduct credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Deducted ${creditsRequired} credits from supervisor ${user.id}`);

    // Analyze with DeepSeek
    const analysisResult = await analyzeWithDeepSeek(
      title,
      abstract,
      documentContent
    );

    // Update research paper with integrity check results
    const { error: updateError } = await supabase
      .from("research_papers")
      .update({
        plagiarism_score: analysisResult.plagiarism_score || 0,
        plagiarism_status: analysisResult.plagiarism_status || "low",
        plagiarism_checked_at: new Date().toISOString(),
        ai_content_risk: analysisResult.ai_content_risk || "low",
      })
      .eq("id", research_id);

    if (updateError) {
      console.error("Error updating research:", updateError);
      throw new Error("Failed to save integrity check results");
    }

    console.log(`Enhanced integrity check complete for research ${research_id}`);
    console.log(`Document analyzed: ${analysisResult.document_analyzed}`);

    return new Response(
      JSON.stringify({
        success: true,
        plagiarism_score: analysisResult.plagiarism_score,
        plagiarism_status: analysisResult.plagiarism_status,
        plagiarism_indicators: analysisResult.plagiarism_indicators,
        ai_content_risk: analysisResult.ai_content_risk,
        ai_indicators: analysisResult.ai_indicators,
        originality_signals: analysisResult.originality_signals,
        advisory_notes: analysisResult.advisory_notes,
        document_analyzed: analysisResult.document_analyzed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in research-integrity-check:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
