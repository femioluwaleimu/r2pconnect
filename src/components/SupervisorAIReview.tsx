import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Sparkles, Loader2, AlertTriangle, CheckCircle, Lightbulb, Target, FileText, Brain, Copy, Send, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AI_CREDIT_EXHAUSTED_MESSAGE, friendlyErrorMessage } from "@/lib/errorMessage";

interface AIReviewResult {
  methodology_assessment: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  ethical_concerns: {
    risk_level: "low" | "medium" | "high";
    flags: string[];
    recommendations: string[];
  };
  objectives_clarity: {
    score: number;
    feedback: string;
    improved_objectives: string[];
  };
  overall_feedback: string;
  recommended_action: "approve" | "revision" | "needs_attention";
}

interface SupervisorAIReviewProps {
  researchId: string;
  title: string;
  abstract: string;
  problemStatement?: string | null;
  solutionApproach?: string | null;
  researchField?: string | null;
  onReviewComplete?: (result: AIReviewResult) => void;
}

export default function SupervisorAIReview({
  researchId,
  title,
  abstract,
  problemStatement,
  solutionApproach,
  researchField,
  onReviewComplete,
}: SupervisorAIReviewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIReviewResult | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [editableHtml, setEditableHtml] = useState("");
  const { toast } = useToast();

  const generateHtmlReport = (data: AIReviewResult): string => {
    return `
<h2>AI Review Summary</h2>
<p><strong>Recommendation:</strong> ${data.recommended_action.replace("_", " ").toUpperCase()}</p>
<p>${data.overall_feedback}</p>

<h2>Methodology Assessment (${data.methodology_assessment.score}/10)</h2>

<h3>Strengths:</h3>
<ol>
${data.methodology_assessment.strengths.map(s => `<li>${s}</li>`).join("\n")}
</ol>

<h3>Weaknesses:</h3>
<ol>
${data.methodology_assessment.weaknesses.map(w => `<li>${w}</li>`).join("\n")}
</ol>

<h3>Suggestions:</h3>
<ol>
${data.methodology_assessment.suggestions.map(s => `<li>${s}</li>`).join("\n")}
</ol>

<h2>Ethical Assessment (${data.ethical_concerns.risk_level.toUpperCase()} Risk)</h2>
${data.ethical_concerns.flags.length > 0 ? `
<h3>Flagged Concerns:</h3>
<ul>
${data.ethical_concerns.flags.map(f => `<li>${f}</li>`).join("\n")}
</ul>
` : "<p>No significant ethical concerns detected.</p>"}
${data.ethical_concerns.recommendations.length > 0 ? `
<h3>Recommendations:</h3>
<ul>
${data.ethical_concerns.recommendations.map(r => `<li>${r}</li>`).join("\n")}
</ul>
` : ""}

<h2>Objectives Clarity (${data.objectives_clarity.score}/10)</h2>
<p>${data.objectives_clarity.feedback}</p>
${data.objectives_clarity.improved_objectives.length > 0 ? `
<h3>Suggested Improved Objectives:</h3>
<ol>
${data.objectives_clarity.improved_objectives.map(o => `<li>${o}</li>`).join("\n")}
</ol>
` : ""}
    `.trim();
  };


  const handleCopyText = () => {
    if (!result) return;
    const text = `
AI Review Summary
=================
Recommendation: ${result.recommended_action.replace("_", " ").toUpperCase()}

${result.overall_feedback}

Methodology Assessment (${result.methodology_assessment.score}/10)
-----------------------------------------------------------------
Strengths:
${result.methodology_assessment.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Weaknesses:
${result.methodology_assessment.weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")}

Suggestions:
${result.methodology_assessment.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Ethical Assessment (${result.ethical_concerns.risk_level.toUpperCase()} Risk)
------------------------------------------------------------------------------
${result.ethical_concerns.flags.length > 0 
  ? `Flagged Concerns:\n${result.ethical_concerns.flags.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
  : "No significant ethical concerns detected."}
${result.ethical_concerns.recommendations.length > 0 
  ? `\nRecommendations:\n${result.ethical_concerns.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
  : ""}

Objectives Clarity (${result.objectives_clarity.score}/10)
----------------------------------------------------------
${result.objectives_clarity.feedback}
${result.objectives_clarity.improved_objectives.length > 0 
  ? `\nSuggested Improved Objectives:\n${result.objectives_clarity.improved_objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`
  : ""}
    `.trim();
    navigator.clipboard.writeText(text);
    toast({ title: "Text copied to clipboard" });
  };

  const openSendDialog = () => {
    if (result) {
      setEditableHtml(generateHtmlReport(result));
      setSendDialogOpen(true);
    }
  };

  const handleSendToStudent = () => {
    // Strip HTML tags and copy plain text only
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = editableHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    navigator.clipboard.writeText(plainText.trim());
    toast({ 
      title: "Feedback copied", 
      description: "Paste this in the comments field to send to the student" 
    });
    setSendDialogOpen(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const content = `
Title: ${title}

Research Field: ${researchField || "Not specified"}

Abstract: ${abstract}

${problemStatement ? `Problem Statement: ${problemStatement}` : ""}

${solutionApproach ? `Solution Approach: ${solutionApproach}` : ""}
      `.trim();

      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: { type: "supervisor_review", content },
      });

      if (error) {
        console.error("AI function error:", error);
        toast({ 
          title: "AI Service Error", 
          description: error.message || "Failed to connect to AI service. Please try again.", 
          variant: "destructive" 
        });
        return;
      }

      if (data?.error) {
        // Handle specific error types
        if (data.error === "AI_CREDITS_EXHAUSTED") {
          toast({ 
            title: "No AI Credits", 
            description: AI_CREDIT_EXHAUSTED_MESSAGE, 
            variant: "destructive" 
          });
        } else if (data.error === "SUBSCRIPTION_EXPIRED") {
          toast({ 
            title: "Subscription Expired", 
            description: data.message || "Please renew your subscription to continue using AI features.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "AI Error", 
            description: friendlyErrorMessage(data.message || data.error), 
            variant: "destructive" 
          });
        }
        return;
      }

      if (!data?.result) {
        toast({ 
          title: "Invalid Response", 
          description: "AI returned an empty response. Please try again.", 
          variant: "destructive" 
        });
        return;
      }

      try {
        // Clean the result - remove markdown code blocks if present
        let cleanResult = data.result;
        // More robust cleaning of markdown code blocks
        cleanResult = cleanResult.trim();
        if (cleanResult.startsWith("```json")) {
          cleanResult = cleanResult.slice(7);
        } else if (cleanResult.startsWith("```")) {
          cleanResult = cleanResult.slice(3);
        }
        if (cleanResult.endsWith("```")) {
          cleanResult = cleanResult.slice(0, -3);
        }
        cleanResult = cleanResult.trim();
        
        const parsed = JSON.parse(cleanResult);
        
        // Validate the structure
        if (!parsed.methodology_assessment || !parsed.ethical_concerns || !parsed.objectives_clarity) {
          throw new Error("Invalid response structure");
        }
        
        setResult(parsed);
        onReviewComplete?.(parsed);
        toast({ 
          title: "AI Review Complete", 
          description: `Credits remaining: ${data.credits_remaining}` 
        });
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError, "Raw result:", data.result);
        toast({ 
          title: "Parse Error", 
          description: "Could not parse AI response. Please try again.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error("AI review error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-500/10 text-red-600 border-red-200";
      case "medium": return "bg-orange-500/10 text-orange-600 border-orange-200";
      default: return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 6) return "text-amber-600";
    return "text-red-600";
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "approve": return "bg-emerald-500";
      case "revision": return "bg-amber-500";
      default: return "bg-red-500";
    }
  };

  return (
    <div className="space-y-4">
      {!result && (
        <Card className="rounded-2xl border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI-Powered Review Assistant</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Get AI-powered insights on methodology, objectives clarity, and ethical considerations to inform your review decision.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="rounded-xl bg-gradient-to-r from-primary to-accent"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Research...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Recommended Action */}
          <Card className="rounded-2xl border-none shadow-lg overflow-hidden">
            <div className={`px-6 py-4 ${getActionColor(result.recommended_action)}`}>
              <div className="flex items-center gap-3 text-white">
                {result.recommended_action === "approve" ? (
                  <CheckCircle className="w-6 h-6" />
                ) : result.recommended_action === "revision" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide opacity-90">AI Recommendation</p>
                  <p className="text-xl font-bold capitalize">{result.recommended_action.replace("_", " ")}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground">{result.overall_feedback}</p>
            </CardContent>
          </Card>

          {/* Methodology Assessment */}
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                Methodology Assessment
                <span className={`ml-auto text-2xl font-bold ${getScoreColor(result.methodology_assessment.score)}`}>
                  {result.methodology_assessment.score}/10
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.methodology_assessment.strengths.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {result.methodology_assessment.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.methodology_assessment.weaknesses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">Weaknesses</p>
                  <ul className="space-y-1">
                    {result.methodology_assessment.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.methodology_assessment.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-2">Suggestions</p>
                  <ul className="space-y-1">
                    {result.methodology_assessment.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ethical Concerns */}
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Ethical Risk Assessment
                <Badge className={`ml-auto ${getRiskColor(result.ethical_concerns.risk_level)}`}>
                  {result.ethical_concerns.risk_level.toUpperCase()} RISK
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.ethical_concerns.flags.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-2">Flagged Concerns</p>
                  <ul className="space-y-1">
                    {result.ethical_concerns.flags.map((f, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-emerald-600">No significant ethical concerns detected.</p>
              )}
              {result.ethical_concerns.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {result.ethical_concerns.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Objectives Clarity */}
          <Card className="rounded-2xl border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-500" />
                Objectives Clarity
                <span className={`ml-auto text-2xl font-bold ${getScoreColor(result.objectives_clarity.score)}`}>
                  {result.objectives_clarity.score}/10
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{result.objectives_clarity.feedback}</p>
              {result.objectives_clarity.improved_objectives.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-primary mb-2">Suggested Improved Objectives</p>
                  <ul className="space-y-1">
                    {result.objectives_clarity.improved_objectives.map((o, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleCopyText}
              variant="outline"
              className="rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </Button>
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openSendDialog}
                  variant="outline"
                  className="rounded-xl text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit & Send
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    Edit AI Review Before Sending
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Customize the AI review feedback before sending it to the student. 
                    Use the formatting toolbar to adjust the content.
                  </p>
                  <RichTextEditor
                    value={editableHtml}
                    onChange={setEditableHtml}
                    minHeight="300px"
                    placeholder="AI review content..."
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendToStudent} className="bg-primary">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="outline"
              className="rounded-xl"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
