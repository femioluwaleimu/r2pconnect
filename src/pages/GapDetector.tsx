import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Target, Sparkles, TrendingUp, Loader2, Copy, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAICredits } from "@/hooks/useAICredits";
import SavedAIResponses from "@/components/ai/SavedAIResponses";

export default function GapDetector() {
  const [field, setField] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { creditsRemaining, refresh: refreshCredits } = useAICredits();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.result) {
      setResult(location.state.result);
      setField(location.state.query || "");
    }
  }, [location.state]);

  const handleDetectGaps = async () => {
    if (!field.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { type: 'gap_analysis', content: field }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return;
      }

      setResult(data.result);
      refreshCredits();
      toast({ title: "Analysis Complete", description: `${data.credits_remaining} credits remaining` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gap-analysis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded successfully" });
  };

  const formatResultAsHTML = (text: string) => {
    if (!text) return "";
    
    // Convert markdown-style formatting to HTML
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-foreground mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-foreground mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-foreground mt-4 mb-2">$1</h1>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-muted-foreground">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-muted-foreground list-decimal">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-3">')
      .replace(/\n/g, '<br />');
    
    return `<div class="prose prose-sm dark:prose-invert max-w-none"><p class="text-muted-foreground mb-3">${html}</p></div>`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gap Detector</h1>
          <p className="text-muted-foreground">Identify research gaps in your field of study</p>
        </div>

        {/* Side by Side Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            {/* Info Card */}
            <Card className="border-none shadow-tick bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Finding Research Gaps</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Specify your research field or area of interest</li>
                      <li>• AI analyzes recent publications and trends</li>
                      <li>• Identifies underexplored areas and opportunities</li>
                      <li>• Suggests potential research directions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Input Card */}
            <Card className="shadow-tick rounded-2xl border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-2xl">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Target className="w-5 h-5 text-primary" />
                  Enter Your Research Field
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="Describe your research field or specific area. For example: 'Machine learning in healthcare diagnostics' or 'Climate change adaptation in coastal communities'"
                  className="rounded-xl min-h-[200px] border-2 focus:border-primary"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Uses 1 AI credit • <span className="font-semibold text-primary">{creditsRemaining} credits remaining</span>
                  </p>
                  <Button 
                    className="rounded-xl gradient-hero shadow-lg font-bold" 
                    disabled={!field.trim() || loading}
                    onClick={handleDetectGaps}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Analyzing...' : 'Detect Gaps'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <Card className="shadow-tick rounded-2xl border-2 border-accent/20">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-2xl flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="w-5 h-5 text-primary" />
                Identified Gaps
              </CardTitle>
              {result && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="rounded-lg"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 min-h-[400px]">
              {result ? (
                <div 
                  className="result-content"
                  dangerouslySetInnerHTML={{ __html: formatResultAsHTML(result) }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center mb-4 shadow-lg">
                    <Target className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">No gaps detected yet</p>
                  <p className="text-sm text-muted-foreground">
                    Enter your research field to discover opportunities
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <SavedAIResponses
          toolType="gap_detector"
          toolLabel="Gap Detector"
          currentTitle={field.trim() ? `Gap analysis: ${field.trim().slice(0, 80)}` : "Gap analysis"}
          currentPrompt={field}
          currentResponse={result}
          currentMetadata={{ source: "dashboard/gap-detector" }}
          onRestore={(item) => {
            setField(item.prompt || "");
            setResult(item.response);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
