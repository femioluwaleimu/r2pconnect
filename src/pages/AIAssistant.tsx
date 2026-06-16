import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { AI_CREDIT_EXHAUSTED_MESSAGE, friendlyErrorMessage } from "@/lib/errorMessage";
import CreditTopupDialog from "@/components/CreditTopupDialog";
import SavedAIResponses from "@/components/ai/SavedAIResponses";
import {
  Sparkles,
  FileText,
  Lightbulb,
  TrendingUp,
  Target,
  Search,
  DollarSign,
  Loader2,
  Zap,
  Brain,
  Copy,
  Download,
  Check,
} from "lucide-react";

const aiTools = [
  {
    id: "abstract",
    title: "Generate Abstract",
    description: "Create a compelling research abstract from your draft",
    icon: FileText,
    color: "bg-primary",
    borderColor: "border-l-primary",
  },
  {
    id: "gap_analysis",
    title: "Identify Research Gaps",
    description: "Discover unexplored areas in your field",
    icon: Lightbulb,
    color: "bg-amber-500",
    borderColor: "border-l-amber-500",
  },
  {
    id: "applications",
    title: "Industrial Applications",
    description: "Find practical applications for your research",
    icon: TrendingUp,
    color: "bg-orange-500",
    borderColor: "border-l-orange-500",
  },
  {
    id: "keywords",
    title: "Extract Keywords",
    description: "Get relevant keywords for your research",
    icon: Target,
    color: "bg-teal-500",
    borderColor: "border-l-teal-500",
  },
  {
    id: "literature",
    title: "Literature Review Help",
    description: "Get suggestions for related literature",
    icon: Search,
    color: "bg-pink-500",
    borderColor: "border-l-pink-500",
  },
  {
    id: "funding",
    title: "Funding Pitch",
    description: "Create a compelling funding proposal",
    icon: DollarSign,
    color: "bg-violet-500",
    borderColor: "border-l-violet-500",
  },
];

export default function AIAssistant() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiCredits, setAiCredits] = useState({ used: 0, limit: 3 });
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputCardRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchAiCredits(user.id);
    });
  }, [navigate]);

  const fetchAiCredits = async (userId: string) => {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("ai_credits_remaining, current_period_end, current_period_start, tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscription) {
      let creditsRemaining = subscription.ai_credits_remaining || 0;
      if (subscription.tier === 'free' && creditsRemaining < 3) {
        const { data: repaired } = await supabase.functions.invoke("ensure-free-ai-credits", {
          body: { userId },
        });
        creditsRemaining = repaired?.credits_remaining ?? creditsRemaining;
      }

      const tierToPlanId = subscription.tier === 'free' ? 'researcher_free' : `researcher_${subscription.tier}`;
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("ai_credits_per_day")
        .eq("plan_id", tierToPlanId)
        .eq("is_active", true)
        .maybeSingle();
      
      // Fetch topup credits purchased during current period
      const startAt = subscription.current_period_start ? new Date(subscription.current_period_start).toISOString() : null;
      const endAt = subscription.current_period_end ? new Date(subscription.current_period_end).toISOString() : null;

      let topupQuery = supabase
        .from('credit_topup_purchases')
        .select('credits')
        .eq('user_id', userId)
        .in('status', ['completed', 'success']);

      if (startAt) topupQuery = topupQuery.gte('created_at', startAt);
      if (endAt) topupQuery = topupQuery.lte('created_at', endAt);

      const { data: topups } = await topupQuery;
      const topupCredits = (topups || []).reduce((sum, t) => sum + Number(t.credits || 0), 0);

      const creditLimit = Number(planData?.ai_credits_per_day || 2) + topupCredits;
      const creditsUsed = creditLimit - creditsRemaining;
      
      setAiCredits({ used: Math.max(0, creditsUsed), limit: creditLimit });
    }
  };

  const handleSelectTool = (toolId: string) => {
    setSelectedTool(toolId);

    window.setTimeout(() => {
      inputCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      textAreaRef.current?.focus({ preventScroll: true });
    }, 80);
  };

  const handleAnalyze = async () => {
    if (!selectedTool || !input.trim()) {
      toast({ title: "Please select a tool and enter content", variant: "destructive" });
      return;
    }

    if (aiCredits.used >= aiCredits.limit) {
      toast({
        title: "No AI Credits",
        description: AI_CREDIT_EXHAUSTED_MESSAGE,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: { type: selectedTool, content: input },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) {
        toast({ title: "AI Error", description: errorMsg, variant: "destructive" });
        return;
      }

      if (result?.error) {
        toast({ title: "AI Error", description: friendlyErrorMessage(result.error), variant: "destructive" });
        return;
      }

      setResult(result.result);
      // Update credits display based on new remaining value
      const creditsUsed = aiCredits.limit - result.credits_remaining;
      setAiCredits({ used: Math.max(0, creditsUsed), limit: aiCredits.limit });
      toast({
        title: "Analysis complete!",
        description: `Credits remaining: ${result.credits_remaining}`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: friendlyErrorMessage(error.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const selectedToolData = aiTools.find((t) => t.id === selectedTool);
    const filename = `ai-result-${selectedToolData?.title.toLowerCase().replace(/\s+/g, "-") || "analysis"}.txt`;
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded successfully!" });
  };

  const selectedToolData = aiTools.find((t) => t.id === selectedTool);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-white" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Research Assistant</h1>
          </div>
          <p className="text-white/80">Powerful AI tools to enhance your research writing and analysis</p>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">
                AI Credits: {aiCredits.used}/{aiCredits.limit} used this month
              </span>
            </div>
            {aiCredits.used >= aiCredits.limit && (
              <CreditTopupDialog
                onSuccess={() => user && fetchAiCredits(user.id)}
                trigger={
                  <Button size="sm" variant="secondary" className="rounded-xl text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Top Up Credits
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-tick bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">AI Assistant Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Select a tool that matches your current research needs</li>
                  <li>• Provide detailed input for better AI-generated results</li>
                  <li>• Credits reset monthly - upgrade for more access</li>
                  <li>• Copy results and refine them for your final paper</li>
                  <li>• Use multiple tools together for comprehensive analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Tools Grid - Bold Cards with Single Selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiTools.map((tool) => {
            const isSelected = selectedTool === tool.id;
            return (
              <Card
                key={tool.id}
                className={`cursor-pointer transition-all duration-300 border-l-4 ${tool.borderColor} rounded-xl ${
                  isSelected ? "ring-2 ring-primary shadow-tick bg-primary/5" : "hover:shadow-tick-hover shadow-soft"
                }`}
                onClick={() => handleSelectTool(tool.id)}
              >
                <CardHeader className="pb-2">
                  <div className={`w-14 h-14 rounded-xl ${tool.color} flex items-center justify-center mb-3 shadow-lg`}>
                    <tool.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-lg font-bold">{tool.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">{tool.description}</CardDescription>
                </CardHeader>
                {isSelected && (
                  <CardContent className="pt-0">
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Input Area */}
        {selectedTool && (
          <Card ref={inputCardRef} className="border-0 shadow-tick animate-fade-in rounded-xl scroll-mt-24">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-3">
                {selectedToolData && (
                  <div
                    className={`w-10 h-10 rounded-lg ${selectedToolData.color} flex items-center justify-center shadow-md`}
                  >
                    <selectedToolData.icon className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <CardTitle className="font-bold">{selectedToolData?.title}</CardTitle>
                  <CardDescription>{selectedToolData?.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                ref={textAreaRef}
                placeholder="Paste your research content, draft, or topic here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
                className="resize-none rounded-xl border-2 focus:border-primary"
              />
              <Button
                onClick={handleAnalyze}
                disabled={loading || !input.trim() || aiCredits.used >= aiCredits.limit}
                className="w-full sm:w-auto rounded-xl gradient-hero text-white font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results - Styled HTML with Copy/Download */}
        {result && (
          <Card className="border-0 shadow-tick animate-fade-in rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <CardTitle className="text-white font-bold">AI Generated Result</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-white hover:bg-white/20 rounded-lg"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: result
                    .replace(/\n\n/g, '</p><p class="mb-3">')
                    .replace(/\n/g, "<br/>")
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(/^- (.*)/gm, '<li class="ml-4">$1</li>')
                    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$2</li>'),
                }}
              />
            </CardContent>
          </Card>
        )}

        <SavedAIResponses
          toolType="ai_assistant"
          toolLabel="AI Research Assistant"
          currentTitle={selectedToolData?.title || "AI Assistant response"}
          currentPrompt={input}
          currentResponse={result}
          currentMetadata={{ source: "dashboard/ai-assistant", selectedTool }}
          onRestore={(item) => {
            const restoredTool = typeof item.metadata?.selectedTool === "string" ? item.metadata.selectedTool : null;
            if (restoredTool) {
              setSelectedTool(restoredTool);
            }
            setInput(item.prompt || "");
            setResult(item.response);
          }}
        />

        {/* Empty State when no result */}
        {selectedTool && !result && !loading && (
          <Card className="border-0 shadow-soft rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">Ready to Generate</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Enter your research content on the left and click "Generate with AI" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
